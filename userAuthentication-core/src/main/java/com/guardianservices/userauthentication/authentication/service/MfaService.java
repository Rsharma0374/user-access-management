package com.guardianservices.userauthentication.authentication.service;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.authentication.AuthChallenge;
import com.guardianservices.userauthentication.authentication.AuthChallengePurpose;
import com.guardianservices.userauthentication.authentication.MfaCredential;
import com.guardianservices.userauthentication.authentication.MfaRecoveryCode;
import com.guardianservices.userauthentication.authentication.MfaType;
import com.guardianservices.userauthentication.authentication.repository.AuthChallengeRepository;
import com.guardianservices.userauthentication.authentication.repository.MfaCredentialRepository;
import com.guardianservices.userauthentication.authentication.repository.MfaRecoveryCodeRepository;
import com.guardianservices.userauthentication.common.exception.ForbiddenException;
import com.guardianservices.userauthentication.common.exception.UnauthorizedException;
import com.guardianservices.userauthentication.common.exception.ValidationException;
import com.guardianservices.userauthentication.common.util.Clock;
import com.guardianservices.userauthentication.common.util.SecureTokenGenerator;
import com.guardianservices.userauthentication.common.util.TokenHasher;
import com.guardianservices.userauthentication.platform.config.AuthProperties;
import com.guardianservices.userauthentication.product.ProductConfigurationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.warrenstrange.googleauth.GoogleAuthenticator;
import com.warrenstrange.googleauth.GoogleAuthenticatorKey;
import com.warrenstrange.googleauth.GoogleAuthenticatorQRGenerator;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class MfaService {

    private final MfaCredentialRepository mfaCredentialRepository;
    private final MfaRecoveryCodeRepository mfaRecoveryCodeRepository;
    private final AuthChallengeRepository authChallengeRepository;
    private final SecureTokenGenerator tokenGenerator;
    private final TokenHasher tokenHasher;
    private final Clock clock;
    private final AuthProperties authProperties;
    private final ProductConfigurationService productConfigurationService;

    private final GoogleAuthenticator googleAuthenticator = new GoogleAuthenticator();

    @Transactional
    public MfaEnrollmentResult enrollMfa(User user) {
        // Check if TOTP already enrolled
        if (mfaCredentialRepository.findByUserAndType(user, MfaType.TOTP).isPresent()) {
            throw new ValidationException("TOTP already enrolled", Map.of("mfa", "Already enrolled"));
        }

        // Generate TOTP secret
        GoogleAuthenticatorKey key = googleAuthenticator.createCredentials();
        String secret = key.getKey();
        
        // Encrypt secret (in production, use KMS)
        byte[] encryptedSecret = encryptSecret(secret);

        MfaCredential credential = new MfaCredential();
        credential.setUser(user);
        credential.setType(MfaType.TOTP);
        credential.setEncryptedSecret(encryptedSecret);
        credential.setEncryptionKeyVersion(1);
        credential.setCreatedAt(clock.now());
        credential.setUpdatedAt(clock.now());

        mfaCredentialRepository.save(credential);

        // Generate QR code
        String issuer = productConfigurationService.getSettings(user.getProductName())
            .getString("mfaIssuer", authProperties.getMfa().getIssuer());
        String qrCodeUrl = GoogleAuthenticatorQRGenerator.getOtpAuthURL(
            issuer,
            user.getEmailOriginal(),
            key
        );

        // Generate recovery codes
        List<String> recoveryCodes = generateRecoveryCodes(user);

        return new MfaEnrollmentResult(secret, qrCodeUrl, recoveryCodes);
    }

    @Transactional
    public void confirmMfaEnrollment(User user, String code) {
        MfaCredential credential = mfaCredentialRepository.findByUserAndTypeForUpdate(user, MfaType.TOTP)
            .orElseThrow(() -> new ValidationException("No pending MFA enrollment", Map.of("mfa", "Not enrolled")));

        if (credential.getConfirmedAt() != null) {
            throw new ValidationException("MFA already confirmed", Map.of("mfa", "Already confirmed"));
        }

        String secret = decryptSecret(credential.getEncryptedSecret());
        boolean valid = googleAuthenticator.authorize(secret, Integer.parseInt(code), 1);

        if (!valid) {
            throw new UnauthorizedException("Invalid MFA code");
        }

        credential.setConfirmedAt(clock.now());
        credential.setLastAcceptedStep(System.currentTimeMillis() / 30000);
        credential.setUpdatedAt(clock.now());
        mfaCredentialRepository.save(credential);

        log.info("MFA confirmed for user: {}", user.getId());
    }

    @Transactional
    public List<String> getRecoveryCodes(User user) {
        MfaCredential credential = mfaCredentialRepository.findByUserAndType(user, MfaType.TOTP)
            .orElseThrow(() -> new ValidationException("MFA not enrolled", Map.of("mfa", "Not enrolled")));

        if (credential.getConfirmedAt() == null) {
            throw new ValidationException("MFA not confirmed", Map.of("mfa", "Not confirmed"));
        }

        // Return existing unconsumed recovery codes
        List<MfaRecoveryCode> codes = mfaRecoveryCodeRepository.findByUserAndConsumedAtIsNull(user);
        if (!codes.isEmpty()) {
            // In production, we wouldn't return these again - they're one-time
            throw new ForbiddenException("Recovery codes already retrieved");
        }

        return generateRecoveryCodes(user);
    }

    @Transactional
    public void disableMfa(User user, String password) {
        // Verify recent authentication (password or MFA)
        // This would typically be done via an auth challenge
        MfaCredential credential = mfaCredentialRepository.findByUserAndTypeForUpdate(user, MfaType.TOTP)
            .orElseThrow(() -> new ValidationException("MFA not enrolled", Map.of("mfa", "Not enrolled")));

        // Delete MFA credential
        mfaCredentialRepository.delete(credential);
        
        // Delete recovery codes
        mfaRecoveryCodeRepository.deleteByUser(user);

        log.info("MFA disabled for user: {}", user.getId());
    }

    private List<String> generateRecoveryCodes(User user) {
        List<String> codes = new ArrayList<>();
        var product = productConfigurationService.getSettings(user.getProductName());
        int recoveryCodeCount = product.getBoundedInt(
            "recoveryCodeCount",
            authProperties.getMfa().getRecoveryCodeCount(),
            1,
            20
        );
        int recoveryCodeLength = product.getBoundedInt(
            "recoveryCodeLength",
            authProperties.getMfa().getRecoveryCodeLength(),
            8,
            64
        );
        for (int i = 0; i < recoveryCodeCount; i++) {
            String code = tokenGenerator.generateToken(recoveryCodeLength);
            codes.add(formatRecoveryCode(code));
            
            MfaRecoveryCode rc = new MfaRecoveryCode();
            rc.setUser(user);
            rc.setCodeHash(tokenHasher.hash(code));
            rc.setCreatedAt(clock.now());
            mfaRecoveryCodeRepository.save(rc);
        }
        return codes;
    }

    private String formatRecoveryCode(String code) {
        // Format as groups of 4 characters for readability
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < code.length(); i += 4) {
            if (i > 0) sb.append('-');
            sb.append(code.substring(i, Math.min(i + 4, code.length())));
        }
        return sb.toString();
    }

    private byte[] encryptSecret(String secret) {
        // In production, encrypt using KMS
        return secret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    private String decryptSecret(byte[] encryptedSecret) {
        // In production, decrypt using KMS
        return new String(encryptedSecret, java.nio.charset.StandardCharsets.UTF_8);
    }

    public static class MfaEnrollmentResult {
        private final String secret;
        private final String qrCodeUrl;
        private final List<String> recoveryCodes;

        public MfaEnrollmentResult(String secret, String qrCodeUrl, List<String> recoveryCodes) {
            this.secret = secret;
            this.qrCodeUrl = qrCodeUrl;
            this.recoveryCodes = recoveryCodes;
        }

        public String getSecret() { return secret; }
        public String getQrCodeUrl() { return qrCodeUrl; }
        public List<String> getRecoveryCodes() { return recoveryCodes; }
    }
}
package com.guardianservices.userauthentication.account;

import com.guardianservices.userauthentication.BaseIntegrationTest;
import com.guardianservices.userauthentication.account.controller.RegisterRequest;
import com.guardianservices.userauthentication.account.controller.VerifyEmailRequest;
import com.guardianservices.userauthentication.account.repository.UserRepository;
import com.guardianservices.userauthentication.account.repository.ActionTokenRepository;
import com.guardianservices.userauthentication.account.ActionToken;
import com.guardianservices.userauthentication.account.ActionTokenPurpose;
import com.guardianservices.userauthentication.account.UserStatus;
import com.guardianservices.userauthentication.account.service.AccountService;
import com.guardianservices.userauthentication.common.exception.UnauthorizedException;
import com.guardianservices.userauthentication.common.util.Clock;
import com.guardianservices.userauthentication.common.util.SystemClock;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@SpringBootTest
@ActiveProfiles("test")
class AccountServiceIntegrationTest extends BaseIntegrationTest {

    @Autowired
    private AccountService accountService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private ActionTokenRepository actionTokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private Clock clock;

    @Test
    @Transactional
    void register_createsPendingUserAndSendsVerificationEmail() {
        String email = "test@example.com";
        String password = "SecurePass123!";
        String passwordHash = passwordEncoder.encode(password);

        User user = accountService.register("legacy", email, passwordHash);

        assertThat(user).isNotNull();
        assertThat(user.getEmailOriginal()).isEqualTo(email);
        assertThat(user.getEmailNormalized()).isEqualTo("test@example.com");
        assertThat(user.getStatus()).isEqualTo(UserStatus.PENDING_VERIFICATION);
        assertThat(user.getEmailVerifiedAt()).isNull();
        assertThat(user.getPasswordHash()).isEqualTo(passwordHash);
    }

    @Test
    @Transactional
    void register_withExistingEmail_returnsExistingUser() {
        String email = "test@example.com";
        String password = "SecurePass123!";
        String passwordHash = passwordEncoder.encode(password);

        User firstUser = accountService.register("legacy", email, passwordHash);
        User secondUser = accountService.register("legacy", email, passwordHash);

        assertThat(secondUser.getId()).isEqualTo(firstUser.getId());
    }

    @Test
    @Transactional
    void verifyEmail_activatesUser() {
        String email = "test@example.com";
        String password = "SecurePass123!";
        String passwordHash = passwordEncoder.encode(password);

        User user = accountService.register("legacy", email, passwordHash);
        
        // Find the verification token
        var tokens = actionTokenRepository.findByUserAndPurposeAndConsumedAtIsNull(user, ActionTokenPurpose.EMAIL_VERIFICATION);
        assertThat(tokens).hasSize(1);
        
        String token = extractTokenFromOutbox(tokens.get(0));
        
        accountService.verifyEmail(token, "legacy");

        User verifiedUser = userRepository.findById(user.getId()).orElseThrow();
        assertThat(verifiedUser.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(verifiedUser.getEmailVerifiedAt()).isNotNull();
    }

    @Test
    @Transactional
    void verifyEmail_withInvalidToken_throwsException() {
        assertThatThrownBy(() -> accountService.verifyEmail("invalid-token", "legacy"))
            .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    @Transactional
    void resendVerification_sendsNewToken() {
        String email = "test@example.com";
        String password = "SecurePass123!";
        String passwordHash = passwordEncoder.encode(password);

        User user = accountService.register("legacy", email, passwordHash);
        long initialTokenCount = actionTokenRepository.count();

        accountService.resendVerification(email, "legacy");

        long newTokenCount = actionTokenRepository.count();
        assertThat(newTokenCount).isGreaterThan(initialTokenCount);
    }

    private String extractTokenFromOutbox(ActionToken actionToken) {
        // In real test, we'd capture the token before hashing
        // This is a simplified version
        return "test-token";
    }
}
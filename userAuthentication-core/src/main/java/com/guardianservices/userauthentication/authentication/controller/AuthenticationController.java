package com.guardianservices.userauthentication.authentication.controller;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.account.repository.UserRepository;
import com.guardianservices.userauthentication.authentication.service.AuthenticationService;
import com.guardianservices.userauthentication.authentication.service.MfaService;
import com.guardianservices.userauthentication.common.exception.ForbiddenException;
import com.guardianservices.userauthentication.common.exception.NotFoundException;
import com.guardianservices.userauthentication.common.exception.UnauthorizedException;
import com.guardianservices.userauthentication.common.exception.ValidationException;
import com.guardianservices.userauthentication.product.ProductScopeValidator;
import com.guardianservices.userauthentication.product.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private static final String SUPER_ADMIN_PRODUCT = "super-admin";

    private final AuthenticationService authenticationService;
    private final MfaService mfaService;
    private final ProductScopeValidator productScopeValidator;
    private final CurrentUserService currentUserService;
    private final UserRepository userRepository;

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                    HttpServletRequest httpRequest,
                                    HttpServletResponse httpResponse) {
        AuthenticationService.AuthenticationResult result = authenticationService.authenticate(
            request.getProductName(),
            request.getEmail(),
            request.getPassword(),
            request.getDeviceId(),
            request.getDeviceName(),
            getClientIp(httpRequest),
            httpRequest.getHeader("User-Agent")
        );

        if (result.getType() == AuthenticationService.AuthenticationResult.Type.MFA_REQUIRED) {
            log.info("Login requires MFA verification");
            return ResponseEntity.ok(Map.of(
                "type", "MFA_REQUIRED",
                "message", "Additional verification is required to complete login.",
                "challengeId", result.getChallengeId()
            ));
        }

        // Set refresh token in cookie
        setRefreshTokenCookie(httpResponse, result.getRefreshToken());
        log.info("Login completed for session {}", result.getSession().getId());

        return ResponseEntity.ok(Map.of(
            "type", "SUCCESS",
            "message", "Login successful.",
            "accessToken", result.getAccessToken(),
            "sessionId", result.getSession().getId()
        ));
    }

    @PostMapping("/mfa/verify")
    public ResponseEntity<?> verifyMfa(@Valid @RequestBody MfaVerifyRequest request,
                                        HttpServletRequest httpRequest,
                                        HttpServletResponse httpResponse) {
        AuthenticationService.AuthenticationResult result = authenticationService.verifyMfa(
            request.getProductName(),
            request.getChallengeId(),
            request.getCode(),
            request.getDeviceId(),
            request.getDeviceName(),
            getClientIp(httpRequest),
            httpRequest.getHeader("User-Agent")
        );

        setRefreshTokenCookie(httpResponse, result.getRefreshToken());
        log.info("MFA verification completed for session {}", result.getSession().getId());

        return ResponseEntity.ok(Map.of(
            "message", "MFA verification successful. Login complete.",
            "accessToken", result.getAccessToken(),
            "sessionId", result.getSession().getId()
        ));
    }

    @ExceptionHandler(UnauthorizedException.class)
    public ResponseEntity<Map<String, String>> handleUnauthorized(UnauthorizedException exception) {
        log.warn("Authentication request rejected: {}", exception.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
            .body(Map.of("errorMessage", UnauthorizedException.ERROR_MESSAGE));
    }

    @ExceptionHandler(ValidationException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(ValidationException exception) {
        // Surface the specific reason (e.g. an invalid/expired MFA code) rather
        // than masking it behind the generic unauthorized message.
        log.warn("Authentication request failed validation: {}", exception.getMessage());
        Map<String, Object> body = new java.util.LinkedHashMap<>();
        body.put("message", exception.getMessage());
        if (exception.getFieldErrors() != null) {
            body.put("errors", exception.getFieldErrors());
        }
        return ResponseEntity.badRequest().body(body);
    }

    @PostMapping("/mfa/enroll")
    public ResponseEntity<?> enrollMfa(@RequestBody(required = false) MfaEnrollRequest request,
                                        HttpServletRequest httpRequest) {
        // Self-enrollment when no userId is supplied; a super-admin may enroll
        // another user by passing that user's id.
        User target = resolveMfaTarget(request == null ? null : request.getUserId());
        MfaService.MfaEnrollmentResult result = mfaService.enrollMfa(target);
        log.info("MFA enrollment initiated for user {}", target.getId());
        return ResponseEntity.ok(Map.of(
            "message", "MFA enrollment initiated",
            "secret", result.getSecret(),
            "qrCodeUrl", result.getQrCodeUrl(),
            "recoveryCodes", result.getRecoveryCodes()
        ));
    }

    /**
     * Resolve whose MFA is being enrolled/confirmed. Returns the authenticated
     * user when no (or a self-referencing) userId is supplied; when a different
     * userId is requested, requires super-admin and loads that user.
     */
    private User resolveMfaTarget(UUID targetUserId) {
        User currentUser = getCurrentUser();
        if (targetUserId == null || targetUserId.equals(currentUser.getId())) {
            return currentUser;
        }
        if (!SUPER_ADMIN_PRODUCT.equals(currentUser.getProductName())) {
            throw new ForbiddenException("Super administrator access is required to manage MFA for another user");
        }
        return userRepository.findById(targetUserId)
            .orElseThrow(() -> new NotFoundException("User not found: " + targetUserId));
    }

    @PostMapping("/mfa/confirm")
    public ResponseEntity<?> confirmMfaEnrollment(@Valid @RequestBody MfaConfirmRequest request,
                                                   HttpServletRequest httpRequest) {
        productScopeValidator.assertMatchesAuthenticatedProduct(request.getProductName());
        // Confirm the pending enrollment, activating MFA so subsequent logins
        // require verification. Self by default; a super-admin may target a user.
        User target = resolveMfaTarget(request.getUserId());
        mfaService.confirmMfaEnrollment(target, request.getCode());
        log.info("MFA enrollment confirmed for user {}", target.getId());
        return ResponseEntity.ok(Map.of("message", "MFA enrolled successfully"));
    }

    @PostMapping("/mfa/recovery-codes")
    public ResponseEntity<?> getRecoveryCodes(HttpServletRequest httpRequest) {
        List<String> codes = mfaService.getRecoveryCodes(getCurrentUser());
        log.info("MFA recovery codes retrieved");
        return ResponseEntity.ok(Map.of("recoveryCodes", codes));
    }

    @DeleteMapping("/mfa")
    public ResponseEntity<?> disableMfa(HttpServletRequest httpRequest) {
        mfaService.disableMfa(getCurrentUser(), null); // Would need password verification
        log.info("MFA disable request completed");
        return ResponseEntity.ok(Map.of("message", "MFA disabled"));
    }

    private java.net.InetAddress getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            try {
                return java.net.InetAddress.getByName(xForwardedFor.split(",")[0].trim());
            } catch (Exception e) {
                // Fall through
            }
        }
        try {
            return java.net.InetAddress.getByName(request.getRemoteAddr());
        } catch (Exception e) {
            return null;
        }
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        // In production, use proper cookie settings from config
        response.addHeader("Set-Cookie", 
            "__Host-refresh=" + refreshToken + 
            "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000");
    }

    private com.guardianservices.userauthentication.account.User getCurrentUser() {
        return currentUserService.getCurrentUser();
    }
}
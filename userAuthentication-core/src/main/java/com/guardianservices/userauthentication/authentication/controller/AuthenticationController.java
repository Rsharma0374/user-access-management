package com.guardianservices.userauthentication.authentication.controller;

import com.guardianservices.userauthentication.authentication.service.AuthenticationService;
import com.guardianservices.userauthentication.authentication.service.MfaService;
import com.guardianservices.userauthentication.common.exception.UnauthorizedException;
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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthenticationController {

    private final AuthenticationService authenticationService;
    private final MfaService mfaService;
    private final ProductScopeValidator productScopeValidator;
    private final CurrentUserService currentUserService;

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

    @PostMapping("/mfa/enroll")
    public ResponseEntity<?> enrollMfa(HttpServletRequest httpRequest) {
        // Get user from security context
        MfaService.MfaEnrollmentResult result = mfaService.enrollMfa(getCurrentUser());
        log.info("MFA enrollment initiated");
        return ResponseEntity.ok(Map.of(
            "secret", result.getSecret(),
            "qrCodeUrl", result.getQrCodeUrl(),
            "recoveryCodes", result.getRecoveryCodes()
        ));
    }

    @PostMapping("/mfa/confirm")
    public ResponseEntity<?> confirmMfaEnrollment(@Valid @RequestBody MfaConfirmRequest request,
                                                   HttpServletRequest httpRequest) {
        productScopeValidator.assertMatchesAuthenticatedProduct(request.getProductName());
        mfaService.confirmMfaEnrollment(getCurrentUser(), request.getCode());
        log.info("MFA enrollment confirmation completed");
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
package com.guardianservices.userauthentication.session.controller;

import com.guardianservices.userauthentication.session.Session;
import com.guardianservices.userauthentication.session.SessionRevocationReason;
import com.guardianservices.userauthentication.session.service.SessionService;
import com.guardianservices.userauthentication.authentication.service.JwtService;
import com.guardianservices.userauthentication.common.exception.UnauthorizedException;
import com.guardianservices.userauthentication.product.ProductScopeValidator;
import com.guardianservices.userauthentication.product.CurrentUserService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class SessionController {

    private final SessionService sessionService;
    private final JwtService jwtService;
    private final ProductScopeValidator productScopeValidator;
    private final CurrentUserService currentUserService;

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@Valid @RequestBody RefreshRequest request,
                                      HttpServletRequest httpRequest,
                                      HttpServletResponse httpResponse) {
        // In practice, get refresh token from cookie
        String refreshToken = getRefreshTokenFromCookie(httpRequest);
        if (refreshToken == null && request.getRefreshToken() != null) {
            refreshToken = request.getRefreshToken();
        }

        if (refreshToken == null) {
            log.warn("Session refresh request rejected because no refresh token was provided");
            return ResponseEntity.status(401).body(Map.of(
                "errorMessage", UnauthorizedException.ERROR_MESSAGE
            ));
        }

        SessionService.RefreshTokenResult result = sessionService.rotateRefreshToken(
            request.getProductName(),
            refreshToken,
            request.getDeviceId(),
            getClientIp(httpRequest),
            httpRequest.getHeader("User-Agent")
        );

        setRefreshTokenCookie(httpResponse, result.getRefreshToken());
        log.info("Session refresh completed for session {}", result.getSession().getId());

        return ResponseEntity.ok(Map.of(
            "accessToken", jwtService.createAccessToken(
                result.getSession().getUser(),
                result.getSession().getId().toString(),
                List.of("profile", "objects")
            ),
            "sessionId", result.getSession().getId()
        ));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest httpRequest,
                                     HttpServletResponse httpResponse) {
        String refreshToken = getRefreshTokenFromCookie(httpRequest);
        if (refreshToken != null) {
            // Find session by refresh token and revoke
            // This would need a method in SessionService
        }
        
        clearRefreshTokenCookie(httpResponse);
        log.info("Logout request completed");
        return ResponseEntity.ok(Map.of("message", "Logged out"));
    }

    @GetMapping("/sessions")
    public ResponseEntity<?> getSessions(HttpServletRequest httpRequest) {
        // Get user from security context
        List<Session> sessions = sessionService.getUserSessions(getCurrentUser());
        return ResponseEntity.ok(sessions.stream().map(s -> Map.of(
            "id", s.getId(),
            "deviceId", s.getDeviceId(),
            "deviceName", s.getDeviceName(),
            "ipAddress", s.getIpAddress() != null ? s.getIpAddress().toString() : null,
            "userAgent", s.getUserAgent(),
            "createdAt", s.getCreatedAt(),
            "lastUsedAt", s.getLastUsedAt(),
            "idleExpiresAt", s.getIdleExpiresAt(),
            "absoluteExpiresAt", s.getAbsoluteExpiresAt()
        )).toList());
    }

    @DeleteMapping("/sessions/{id}")
    public ResponseEntity<?> revokeSession(@PathVariable UUID id,
                                            HttpServletRequest httpRequest) {
        sessionService.revokeSession(
            productScopeValidator.getAuthenticatedProductName(),
            id,
            SessionRevocationReason.USER_LOGOUT
        );
        log.info("Session revocation request completed for session {}", id);
        return ResponseEntity.ok(Map.of("message", "Session revoked"));
    }

    @PostMapping("/logout-all")
    public ResponseEntity<?> logoutAll(HttpServletRequest httpRequest) {
        sessionService.revokeAllUserSessions(getCurrentUser(), SessionRevocationReason.USER_LOGOUT_ALL);
        log.info("Logout-all request completed");
        return ResponseEntity.ok(Map.of("message", "All sessions revoked"));
    }

    private java.net.InetAddress getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            try {
                return java.net.InetAddress.getByName(xForwardedFor.split(",")[0].trim());
            } catch (Exception e) {
            }
        }
        try {
            return java.net.InetAddress.getByName(request.getRemoteAddr());
        } catch (Exception e) {
            return null;
        }
    }

    private String getRefreshTokenFromCookie(HttpServletRequest request) {
        if (request.getCookies() != null) {
            for (jakarta.servlet.http.Cookie cookie : request.getCookies()) {
                if ("__Host-refresh".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }

    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        response.addHeader("Set-Cookie", 
            "__Host-refresh=" + refreshToken + 
            "; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000");
    }

    private void clearRefreshTokenCookie(HttpServletResponse response) {
        response.addHeader("Set-Cookie", 
            "__Host-refresh=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
    }

    private com.guardianservices.userauthentication.account.User getCurrentUser() {
        return currentUserService.getCurrentUser();
    }
}
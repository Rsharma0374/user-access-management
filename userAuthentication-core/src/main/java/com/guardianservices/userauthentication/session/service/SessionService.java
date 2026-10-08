package com.guardianservices.userauthentication.session.service;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.account.UserStatus;
import com.guardianservices.userauthentication.common.exception.ForbiddenException;
import com.guardianservices.userauthentication.common.exception.NotFoundException;
import com.guardianservices.userauthentication.common.exception.UnauthorizedException;
import com.guardianservices.userauthentication.common.util.Clock;
import com.guardianservices.userauthentication.common.util.SecureTokenGenerator;
import com.guardianservices.userauthentication.common.util.TokenHasher;
import com.guardianservices.userauthentication.session.RefreshToken;
import com.guardianservices.userauthentication.session.Session;
import com.guardianservices.userauthentication.session.SessionRevocationReason;
import com.guardianservices.userauthentication.session.repository.RefreshTokenRepository;
import com.guardianservices.userauthentication.session.repository.SessionRepository;
import com.guardianservices.userauthentication.product.ProductConfigurationService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class SessionService {

    private final SessionRepository sessionRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final SecureTokenGenerator tokenGenerator;
    private final TokenHasher tokenHasher;
    private final Clock clock;
    private final com.guardianservices.userauthentication.platform.config.AuthProperties authProperties;
    private final ProductConfigurationService productConfigurationService;

    @Transactional
    public SessionCreationResult createSession(User user, String deviceId, String deviceName,
                                               java.net.InetAddress ipAddress, String userAgent) {
        var product = productConfigurationService.getSettings(user.getProductName());
        OffsetDateTime now = clock.now();
        OffsetDateTime idleExpiresAt = now.plus(product.getDuration(
            "refreshIdleTtl",
            authProperties.getRefresh().getIdleTtl()
        ));
        OffsetDateTime absoluteExpiresAt = now.plus(product.getDuration(
            "refreshAbsoluteTtl",
            authProperties.getRefresh().getAbsoluteTtl()
        ));

        Session session = new Session();
        session.setUser(user);
        session.setCreatedAt(now);
        session.setLastUsedAt(now);
        session.setIdleExpiresAt(idleExpiresAt);
        session.setAbsoluteExpiresAt(absoluteExpiresAt);
        session.setDeviceId(deviceId);
        session.setDeviceName(deviceName);
        session.setIpAddress(ipAddress);
        session.setUserAgent(userAgent);

        session = sessionRepository.save(session);

        // Create initial refresh token
        String refreshToken = tokenGenerator.generateToken();
        byte[] tokenHash = tokenHasher.hash(refreshToken);

        RefreshToken rt = new RefreshToken();
        rt.setSession(session);
        rt.setTokenHash(tokenHash);
        rt.setExpiresAt(absoluteExpiresAt);
        rt.setCreatedAt(now);

        refreshTokenRepository.save(rt);

        log.info("Created session {} for user {}", session.getId(), user.getId());
        return new SessionCreationResult(session, refreshToken);
    }

    @Transactional
    public RefreshTokenResult rotateRefreshToken(String productName, String presentedToken, String deviceId,
                                                  java.net.InetAddress ipAddress, String userAgent) {
        var product = productConfigurationService.getSettings(productName);
        byte[] tokenHash = tokenHasher.hash(presentedToken);
        OffsetDateTime now = clock.now();

        // Find and lock the refresh token
        RefreshToken refreshToken = refreshTokenRepository.findActiveByTokenHashWithActiveSessionForUpdate(
            tokenHash,
            product.productName()
        )
            .orElseThrow(() -> new UnauthorizedException("Invalid refresh token"));

        Session session = refreshToken.getSession();

        // Validate session
        validateSession(session, now);

        // Check for replay - token already consumed
        if (refreshToken.getConsumedAt() != null) {
            // REPLAY DETECTED - revoke entire session family
            revokeSessionFamily(session, SessionRevocationReason.TOKEN_REPLAY_DETECTED);
            throw new UnauthorizedException("Token replay detected");
        }

        // Check if parent token exists and is consumed (should not happen in normal flow)
        if (refreshToken.getParentTokenId() != null) {
            RefreshToken parentToken = refreshTokenRepository.findById(refreshToken.getParentTokenId()).orElse(null);
            if (parentToken != null && parentToken.getConsumedAt() != null) {
                // Parent was already consumed - this is a replay
                revokeSessionFamily(session, SessionRevocationReason.TOKEN_REPLAY_DETECTED);
                throw new UnauthorizedException("Token replay detected");
            }
        }

        // Mark current token as consumed
        refreshToken.setConsumedAt(now);
        refreshTokenRepository.save(refreshToken);

        // Create new refresh token
        String newRefreshToken = tokenGenerator.generateToken();
        byte[] newTokenHash = tokenHasher.hash(newRefreshToken);

        RefreshToken newRt = new RefreshToken();
        newRt.setSession(session);
        newRt.setTokenHash(newTokenHash);
        newRt.setParentTokenId(refreshToken.getId());
        newRt.setExpiresAt(session.getAbsoluteExpiresAt());
        newRt.setCreatedAt(now);

        refreshTokenRepository.save(newRt);

        // Update session last used time
        session.setLastUsedAt(now);
        session.setIdleExpiresAt(now.plus(product.getDuration(
            "refreshIdleTtl",
            authProperties.getRefresh().getIdleTtl()
        )));
        sessionRepository.save(session);

        log.info("Rotated refresh token for session {}", session.getId());
        return new RefreshTokenResult(newRefreshToken, session);
    }

    private void validateSession(Session session, OffsetDateTime now) {
        if (session.getRevokedAt() != null) {
            throw new UnauthorizedException("Session revoked");
        }

        if (session.getUser().getStatus() != UserStatus.ACTIVE) {
            throw new UnauthorizedException("Account not active");
        }

        if (now.isAfter(session.getIdleExpiresAt())) {
            throw new UnauthorizedException("Session idle timeout");
        }

        if (now.isAfter(session.getAbsoluteExpiresAt())) {
            throw new UnauthorizedException("Session expired");
        }
    }

    @Transactional
    public void revokeSession(String productName, UUID sessionId, SessionRevocationReason reason) {
        var product = productConfigurationService.getSettings(productName);
        OffsetDateTime now = clock.now();
        int updated = sessionRepository.revokeSession(sessionId, product.productName(), now, reason);
        if (updated == 0) {
            throw new NotFoundException("Session not found or already revoked");
        }
        log.info("Revoked session {}: {}", sessionId, reason);
    }

    @Transactional
    public void revokeAllUserSessions(User user, SessionRevocationReason reason) {
        OffsetDateTime now = clock.now();
        int count = sessionRepository.revokeAllUserSessions(user, now, reason);
        log.info("Revoked {} sessions for user {}: {}", count, user.getId(), reason);
    }

    @Transactional
    public void revokeSessionFamily(Session session, SessionRevocationReason reason) {
        OffsetDateTime now = clock.now();
        
        // Revoke the session
        session.setRevokedAt(now);
        session.setReason(reason);
        sessionRepository.save(session);

        // Mark all unconsumed refresh tokens in this session as consumed
        List<RefreshToken> activeTokens = refreshTokenRepository.findBySessionAndConsumedAtIsNull(session);
        for (RefreshToken rt : activeTokens) {
            rt.setConsumedAt(now);
            refreshTokenRepository.save(rt);
        }

        log.warn("Revoked session family {} for reason: {}", session.getId(), reason);
    }

    public List<Session> getUserSessions(User user) {
        return sessionRepository.findByUserAndRevokedAtIsNull(user);
    }

    public Optional<Session> getSession(User user, UUID sessionId) {
        return sessionRepository.findActiveByUserAndId(user, sessionId);
    }

    @Transactional
    public void updateSessionActivity(String productName, UUID sessionId) {
        var product = productConfigurationService.getSettings(productName);
        Session session = sessionRepository.findByIdAndUserProductName(sessionId, product.productName())
            .orElse(null);
        if (session != null && session.getRevokedAt() == null) {
            session.setLastUsedAt(clock.now());
            session.setIdleExpiresAt(clock.now().plus(product.getDuration(
                "refreshIdleTtl",
                authProperties.getRefresh().getIdleTtl()
            )));
            sessionRepository.save(session);
        }
    }

    public static class RefreshTokenResult {
        private final String refreshToken;
        private final Session session;

        public RefreshTokenResult(String refreshToken, Session session) {
            this.refreshToken = refreshToken;
            this.session = session;
        }

        public String getRefreshToken() {
            return refreshToken;
        }

        public Session getSession() {
            return session;
        }
    }

    public record SessionCreationResult(Session session, String refreshToken) {}
}
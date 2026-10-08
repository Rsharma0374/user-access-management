package com.guardianservices.userauthentication.session.repository;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.session.Session;
import com.guardianservices.userauthentication.session.SessionRevocationReason;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SessionRepository extends JpaRepository<Session, UUID> {

    List<Session> findByUser(User user);

    List<Session> findByUserAndRevokedAtIsNull(User user);

    @Query("SELECT s FROM Session s WHERE s.user = :user AND s.id = :sessionId AND s.revokedAt IS NULL")
    Optional<Session> findActiveByUserAndId(@Param("user") User user, @Param("sessionId") UUID sessionId);

    Optional<Session> findByIdAndUserProductName(UUID id, String productName);

    @Query("UPDATE Session s SET s.revokedAt = :revokedAt, s.reason = :reason, s.version = s.version + 1 WHERE s.user = :user AND s.revokedAt IS NULL")
    int revokeAllUserSessions(@Param("user") User user, @Param("revokedAt") OffsetDateTime revokedAt, @Param("reason") SessionRevocationReason reason);

    @Query("UPDATE Session s SET s.revokedAt = :revokedAt, s.reason = :reason, s.version = s.version + 1 WHERE s.id = :sessionId AND s.user.productName = :productName AND s.revokedAt IS NULL")
    int revokeSession(
        @Param("sessionId") UUID sessionId,
        @Param("productName") String productName,
        @Param("revokedAt") OffsetDateTime revokedAt,
        @Param("reason") SessionRevocationReason reason
    );

    @Query("SELECT s FROM Session s WHERE s.idleExpiresAt < :now AND s.revokedAt IS NULL")
    List<Session> findExpiredIdleSessions(@Param("now") OffsetDateTime now);
}
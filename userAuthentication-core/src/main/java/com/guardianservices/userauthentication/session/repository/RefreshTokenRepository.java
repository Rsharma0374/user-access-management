package com.guardianservices.userauthentication.session.repository;

import com.guardianservices.userauthentication.session.RefreshToken;
import com.guardianservices.userauthentication.session.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT rt FROM RefreshToken rt JOIN rt.session s WHERE rt.tokenHash = :tokenHash AND rt.consumedAt IS NULL AND s.revokedAt IS NULL AND s.user.productName = :productName")
    Optional<RefreshToken> findActiveByTokenHashWithActiveSessionForUpdate(
        @Param("tokenHash") byte[] tokenHash,
        @Param("productName") String productName
    );

    @Query("SELECT rt FROM RefreshToken rt WHERE rt.parentToken.id = :parentTokenId")
    Optional<RefreshToken> findByParentTokenId(@Param("parentTokenId") UUID parentTokenId);

    @Query("SELECT rt FROM RefreshToken rt WHERE rt.session = :session AND rt.consumedAt IS NULL ORDER BY rt.createdAt DESC")
    Optional<RefreshToken> findLatestActiveBySession(@Param("session") Session session);

    @Query("SELECT rt FROM RefreshToken rt WHERE rt.session = :session AND rt.consumedAt IS NULL")
    List<RefreshToken> findBySessionAndConsumedAtIsNull(@Param("session") Session session);

    @Query("UPDATE RefreshToken rt SET rt.consumedAt = :consumedAt WHERE rt.id = :id AND rt.consumedAt IS NULL")
    int markConsumed(@Param("id") UUID id, @Param("consumedAt") OffsetDateTime consumedAt);
}
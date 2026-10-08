package com.guardianservices.userauthentication.account.repository;

import com.guardianservices.userauthentication.account.ActionToken;
import com.guardianservices.userauthentication.account.ActionTokenPurpose;
import com.guardianservices.userauthentication.account.User;
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
public interface ActionTokenRepository extends JpaRepository<ActionToken, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT at FROM ActionToken at WHERE at.tokenHash = :tokenHash AND at.consumedAt IS NULL AND at.user.productName = :productName")
    Optional<ActionToken> findActiveByTokenHashForUpdate(
        @Param("tokenHash") byte[] tokenHash,
        @Param("productName") String productName
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT at FROM ActionToken at WHERE at.user = :user AND at.purpose = :purpose AND at.consumedAt IS NULL ORDER BY at.createdAt DESC")
    Optional<ActionToken> findLatestActiveByUserAndPurposeForUpdate(@Param("user") User user, @Param("purpose") ActionTokenPurpose purpose);

    List<ActionToken> findByUserAndPurposeAndConsumedAtIsNull(User user, ActionTokenPurpose purpose);

    @Query("DELETE FROM ActionToken at WHERE at.expiresAt < :now AND at.consumedAt IS NULL")
    int deleteExpired(@Param("now") OffsetDateTime now);
}
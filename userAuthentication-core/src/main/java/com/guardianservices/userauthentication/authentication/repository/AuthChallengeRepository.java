package com.guardianservices.userauthentication.authentication.repository;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.authentication.AuthChallenge;
import com.guardianservices.userauthentication.authentication.AuthChallengePurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface AuthChallengeRepository extends JpaRepository<AuthChallenge, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ac FROM AuthChallenge ac WHERE ac.challengeHash = :challengeHash AND ac.completedAt IS NULL AND ac.user.productName = :productName")
    Optional<AuthChallenge> findActiveByChallengeHashForUpdate(
        @Param("challengeHash") byte[] challengeHash,
        @Param("productName") String productName
    );

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ac FROM AuthChallenge ac WHERE ac.user = :user AND ac.purpose = :purpose AND ac.completedAt IS NULL ORDER BY ac.createdAt DESC")
    Optional<AuthChallenge> findLatestActiveByUserAndPurposeForUpdate(@Param("user") User user, @Param("purpose") AuthChallengePurpose purpose);

    @Query("DELETE FROM AuthChallenge ac WHERE ac.expiresAt < :now AND ac.completedAt IS NULL")
    int deleteExpired(@Param("now") OffsetDateTime now);
}
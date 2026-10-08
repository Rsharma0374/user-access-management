package com.guardianservices.userauthentication.authentication.repository;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.authentication.MfaCredential;
import com.guardianservices.userauthentication.authentication.MfaType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface MfaCredentialRepository extends JpaRepository<MfaCredential, UUID> {

    List<MfaCredential> findByUser(User user);

    Optional<MfaCredential> findByUserAndType(User user, MfaType type);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT mc FROM MfaCredential mc WHERE mc.user = :user AND mc.type = :type")
    Optional<MfaCredential> findByUserAndTypeForUpdate(@Param("user") User user, @Param("type") MfaType type);

    void deleteByUser(User user);

    /**
     * Return the ids of users (within the given set) that have a confirmed —
     * i.e. active — MFA credential. Used to flag MFA status on the admin list
     * without an N+1 query per user.
     */
    @Query("""
        SELECT DISTINCT mc.user.id FROM MfaCredential mc
        WHERE mc.confirmedAt IS NOT NULL AND mc.user.id IN :userIds
        """)
    List<UUID> findUserIdsWithConfirmedMfa(@Param("userIds") Collection<UUID> userIds);
}
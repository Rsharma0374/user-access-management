package com.guardianservices.userauthentication.authentication.repository;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.authentication.MfaRecoveryCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import jakarta.persistence.LockModeType;

@Repository
public interface MfaRecoveryCodeRepository extends JpaRepository<MfaRecoveryCode, UUID> {

    List<MfaRecoveryCode> findByUser(User user);

    List<MfaRecoveryCode> findByUserAndConsumedAtIsNull(User user);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT rc FROM MfaRecoveryCode rc WHERE rc.user = :user AND rc.consumedAt IS NULL")
    List<MfaRecoveryCode> findActiveByUserForUpdate(@Param("user") User user);

    @Query("SELECT rc FROM MfaRecoveryCode rc WHERE rc.codeHash = :codeHash AND rc.consumedAt IS NULL")
    Optional<MfaRecoveryCode> findActiveByCodeHash(@Param("codeHash") byte[] codeHash);

    void deleteByUser(User user);
}
package com.guardianservices.userauthentication.account.repository;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.account.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {

    List<User> findAllByProductNameOrderByCreatedAtDesc(String productName);

    @Query("""
        SELECT u FROM User u
        WHERE (:productName IS NULL OR u.productName = :productName)
          AND (
              :mfaEnabled IS NULL
              OR (:mfaEnabled = TRUE AND EXISTS (
                      SELECT 1 FROM MfaCredential mc
                      WHERE mc.user = u AND mc.confirmedAt IS NOT NULL))
              OR (:mfaEnabled = FALSE AND NOT EXISTS (
                      SELECT 1 FROM MfaCredential mc
                      WHERE mc.user = u AND mc.confirmedAt IS NOT NULL))
          )
        ORDER BY u.createdAt DESC
        """)
    List<User> findForAdmin(
        @Param("productName") String productName,
        @Param("mfaEnabled") Boolean mfaEnabled
    );

    Optional<User> findByProductNameAndEmailNormalized(String productName, String emailNormalized);

    Optional<User> findByProductNameAndEmailNormalizedAndStatus(
        String productName,
        String emailNormalized,
        UserStatus status
    );

    boolean existsByProductNameAndEmailNormalized(String productName, String emailNormalized);

    @Query("SELECT u FROM User u WHERE u.id = :id AND u.productName = :productName AND u.status = :status")
    Optional<User> findActiveById(
        @Param("id") UUID id,
        @Param("productName") String productName,
        @Param("status") UserStatus status
    );
}
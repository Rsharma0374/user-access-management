package com.guardianservices.userauthentication.common.repository;

import com.guardianservices.userauthentication.common.IdempotencyRequest;
import com.guardianservices.userauthentication.common.IdempotencyRequestId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.Optional;

@Repository
public interface IdempotencyRequestRepository extends JpaRepository<IdempotencyRequest, IdempotencyRequestId> {

    Optional<IdempotencyRequest> findByPrincipalKeyAndEndpointAndKey(String principalKey, String endpoint, String key);

    @Query("DELETE FROM IdempotencyRequest ir WHERE ir.expiresAt < :now")
    int deleteExpired(@Param("now") OffsetDateTime now);
}
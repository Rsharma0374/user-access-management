package com.guardianservices.userauthentication.notification.repository;

import com.guardianservices.userauthentication.notification.OutboxEvent;
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
public interface OutboxEventRepository extends JpaRepository<OutboxEvent, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT oe FROM OutboxEvent oe WHERE oe.deliveredAt IS NULL AND (oe.leaseUntil IS NULL OR oe.leaseUntil < :now) ORDER BY oe.availableAt ASC")
    List<OutboxEvent> findPendingForDelivery(@Param("now") OffsetDateTime now, @Param("batchSize") int batchSize);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT oe FROM OutboxEvent oe WHERE oe.id = :id AND oe.deliveredAt IS NULL")
    Optional<OutboxEvent> findPendingByIdForUpdate(@Param("id") UUID id);

    @Query("SELECT oe FROM OutboxEvent oe WHERE oe.aggregateId = :aggregateId ORDER BY oe.createdAt ASC")
    List<OutboxEvent> findByAggregateId(@Param("aggregateId") UUID aggregateId);

    @Query("UPDATE OutboxEvent oe SET oe.deliveredAt = :deliveredAt, oe.attemptCount = oe.attemptCount + 1 WHERE oe.id = :id")
    int markDelivered(@Param("id") UUID id, @Param("deliveredAt") OffsetDateTime deliveredAt);

    @Query("UPDATE OutboxEvent oe SET oe.leaseUntil = :leaseUntil, oe.attemptCount = oe.attemptCount + 1, oe.consumerName = :consumerName WHERE oe.id = :id")
    int claimLease(@Param("id") UUID id, @Param("leaseUntil") OffsetDateTime leaseUntil, @Param("consumerName") String consumerName);

    @Query("UPDATE OutboxEvent oe SET oe.leaseUntil = NULL WHERE oe.leaseUntil < :now AND oe.deliveredAt IS NULL")
    int releaseExpiredLeases(@Param("now") OffsetDateTime now);
}
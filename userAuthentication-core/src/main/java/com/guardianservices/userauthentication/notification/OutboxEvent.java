package com.guardianservices.userauthentication.notification;

import com.guardianservices.userauthentication.common.AbstractEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(
    name = "outbox_events",
    indexes = {
        @Index(name = "idx_outbox_events_delivery", columnList = "available_at, delivered_at, lease_until"),
        @Index(name = "idx_outbox_events_aggregate", columnList = "aggregate_id")
    }
)
public class OutboxEvent extends AbstractEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID id;

    @Column(name = "aggregate_id", nullable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID aggregateId;

    @Column(name = "type", nullable = false, length = 100)
    private String type;

    @Column(name = "schema_version", nullable = false)
    private Integer schemaVersion = 1;

    @Column(name = "protected_payload", columnDefinition = "BYTEA")
    private byte[] protectedPayload;

    @Column(name = "payload", columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private String payload;

    @Column(name = "available_at", nullable = false)
    private OffsetDateTime availableAt;

    @Column(name = "attempt_count", nullable = false)
    private Integer attemptCount = 0;

    @Column(name = "delivered_at")
    private OffsetDateTime deliveredAt;

    @Column(name = "lease_until")
    private OffsetDateTime leaseUntil;

    @Column(name = "consumer_name", length = 100)
    private String consumerName;
}
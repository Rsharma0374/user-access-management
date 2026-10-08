package com.guardianservices.userauthentication.common;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import java.time.OffsetDateTime;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(
    name = "idempotency_requests",
    indexes = {
        @Index(name = "idx_idempotency_expires", columnList = "expires_at")
    }
)
@IdClass(IdempotencyRequestId.class)
public class IdempotencyRequest {

    @Id
    @Column(name = "principal_key", nullable = false, length = 255)
    private String principalKey;

    @Id
    @Column(name = "endpoint", nullable = false, length = 255)
    private String endpoint;

    @Id
    @Column(name = "key", nullable = false, length = 255)
    private String key;

    @Column(name = "request_hash", nullable = false, length = 64)
    private String requestHash;

    @Column(name = "response_status")
    private Integer responseStatus;

    @Column(name = "response_body", columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private String responseBody;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;
}
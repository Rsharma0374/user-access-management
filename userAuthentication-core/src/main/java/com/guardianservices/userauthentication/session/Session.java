package com.guardianservices.userauthentication.session;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.common.AbstractEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
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
    name = "sessions",
    indexes = {
        @Index(name = "idx_sessions_user_id", columnList = "user_id"),
        @Index(name = "idx_sessions_revoked_at", columnList = "revoked_at"),
        @Index(name = "idx_sessions_expires", columnList = "idle_expires_at, absolute_expires_at")
    }
)
public class Session extends AbstractEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "last_used_at", nullable = false)
    private OffsetDateTime lastUsedAt;

    @Column(name = "idle_expires_at", nullable = false)
    private OffsetDateTime idleExpiresAt;

    @Column(name = "absolute_expires_at", nullable = false)
    private OffsetDateTime absoluteExpiresAt;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "reason")
    private SessionRevocationReason reason;

    @Column(name = "device_id", length = 255)
    private String deviceId;

    @Column(name = "device_name", length = 255)
    private String deviceName;

    @Column(name = "ip_address")
    @JdbcTypeCode(SqlTypes.INET)
    private java.net.InetAddress ipAddress;

    @Column(name = "user_agent", columnDefinition = "TEXT")
    private String userAgent;

    @Column(name = "version", nullable = false)
    private Long version = 0L;
}
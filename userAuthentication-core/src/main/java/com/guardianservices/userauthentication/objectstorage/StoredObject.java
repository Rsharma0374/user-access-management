package com.guardianservices.userauthentication.objectstorage;

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
    name = "objects",
    indexes = {
        @Index(name = "idx_objects_owner", columnList = "owner_user_id"),
        @Index(name = "idx_objects_status", columnList = "status"),
        @Index(name = "idx_objects_quarantine_key", columnList = "quarantine_key"),
        @Index(name = "idx_objects_clean_key", columnList = "clean_key"),
        @Index(name = "idx_objects_expires_at", columnList = "expires_at")
    }
)
public class StoredObject extends AbstractEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "owner_user_id", nullable = false)
    private User ownerUser;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "purpose", nullable = false)
    private ObjectPurpose purpose;

    @Column(name = "quarantine_key", nullable = false, unique = true, length = 1024)
    private String quarantineKey;

    @Column(name = "quarantine_version_id", length = 255)
    private String quarantineVersionId;

    @Column(name = "clean_key", unique = true, length = 1024)
    private String cleanKey;

    @Column(name = "clean_version_id", length = 255)
    private String cleanVersionId;

    @Column(name = "declared_type", nullable = false, length = 100)
    private String declaredType;

    @Column(name = "detected_type", length = 100)
    private String detectedType;

    @Column(name = "expected_size", nullable = false)
    private Long expectedSize;

    @Column(name = "actual_size")
    private Long actualSize;

    @Column(name = "checksum", length = 128)
    private String checksum;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "status", nullable = false)
    private ObjectStatus status = ObjectStatus.INITIATED;

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "version", nullable = false)
    private Long version = 0L;
}
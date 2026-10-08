package com.guardianservices.userauthentication.authentication;

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
    name = "mfa_credentials",
    indexes = {
        @Index(name = "idx_mfa_credentials_user_id", columnList = "user_id")
    }
)
public class MfaCredential extends AbstractEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.NAMED_ENUM)
    @Column(name = "type", nullable = false)
    private MfaType type;

    @Column(name = "encrypted_secret", nullable = false, columnDefinition = "BYTEA")
    private byte[] encryptedSecret;

    @Column(name = "encryption_key_version", nullable = false)
    private Integer encryptionKeyVersion = 1;

    @Column(name = "confirmed_at")
    private OffsetDateTime confirmedAt;

    @Column(name = "last_accepted_step")
    private Long lastAcceptedStep;

    @Column(name = "version", nullable = false)
    private Long version = 0L;
}
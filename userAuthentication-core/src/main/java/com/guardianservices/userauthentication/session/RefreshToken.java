package com.guardianservices.userauthentication.session;

import com.guardianservices.userauthentication.common.AbstractEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
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
    name = "refresh_tokens",
    indexes = {
        @Index(name = "idx_refresh_tokens_session_id", columnList = "session_id"),
        @Index(name = "idx_refresh_tokens_token_hash", columnList = "token_hash"),
        @Index(name = "idx_refresh_tokens_expires_at", columnList = "expires_at")
    }
)
public class RefreshToken extends AbstractEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", nullable = false, updatable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID id;

    @ManyToOne
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(name = "token_hash", nullable = false, unique = true, columnDefinition = "BYTEA")
    private byte[] tokenHash;

    @OneToOne
    @JoinColumn(name = "parent_token_id", unique = true)
    private RefreshToken parentToken;

    public UUID getParentTokenId() {
        return parentToken != null ? parentToken.getId() : null;
    }

    public void setParentTokenId(UUID parentTokenId) {
        if (parentTokenId != null) {
            RefreshToken parent = new RefreshToken();
            parent.setId(parentTokenId);
            this.parentToken = parent;
        } else {
            this.parentToken = null;
        }
    }

    @Column(name = "expires_at", nullable = false)
    private OffsetDateTime expiresAt;

    @Column(name = "consumed_at")
    private OffsetDateTime consumedAt;
}
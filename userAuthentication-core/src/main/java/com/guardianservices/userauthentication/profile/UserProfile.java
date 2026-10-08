package com.guardianservices.userauthentication.profile;

import com.guardianservices.userauthentication.common.AbstractEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.MapsId;
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
@Table(name = "user_profiles")
public class UserProfile extends AbstractEntity {

    @Id
    @Column(name = "user_id", nullable = false, updatable = false)
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID userId;

    @MapsId
    @OneToOne
    @JoinColumn(name = "user_id", nullable = false)
    private com.guardianservices.userauthentication.account.User user;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Column(name = "avatar_object_id")
    @JdbcTypeCode(SqlTypes.UUID)
    private UUID avatarObjectId;

    @Column(name = "locale", length = 10)
    private String locale = "en";

    @Column(name = "timezone", length = 50)
    private String timezone = "UTC";

    @Column(name = "version", nullable = false)
    private Long version = 0L;
}
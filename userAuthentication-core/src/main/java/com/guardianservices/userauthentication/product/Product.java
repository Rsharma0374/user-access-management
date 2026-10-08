package com.guardianservices.userauthentication.product;

import com.guardianservices.userauthentication.common.AbstractEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "products")
public class Product extends AbstractEntity {

    @Id
    @Column(name = "product_name", nullable = false, length = 100)
    private String productName;

    @Column(name = "display_name", nullable = false, length = 150)
    private String displayName;

    @Column(name = "settings", nullable = false, columnDefinition = "JSONB")
    @JdbcTypeCode(SqlTypes.JSON)
    private String settings;

    @Column(name = "active", nullable = false)
    private boolean active = true;
}

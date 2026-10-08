package com.guardianservices.userauthentication.product.repository;

import com.guardianservices.userauthentication.product.Product;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProductRepository extends JpaRepository<Product, String> {

    Optional<Product> findByProductNameAndActiveTrue(String productName);

    List<Product> findByActiveTrue(Sort sort);
}

package com.guardianservices.userauthentication.admin.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.account.UserStatus;
import com.guardianservices.userauthentication.account.repository.UserRepository;
import com.guardianservices.userauthentication.product.CurrentUserService;
import com.guardianservices.userauthentication.product.Product;
import com.guardianservices.userauthentication.product.ProductConfigurationService;
import com.guardianservices.userauthentication.product.repository.ProductRepository;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/v1/admin")
@RequiredArgsConstructor
public class AdminController {

    private static final String SUPER_ADMIN_PRODUCT = "super-admin";

    private final UserRepository userRepository;
    private final ProductRepository productRepository;
    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    @GetMapping("/users")
//    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserSummary>> getUsers(@RequestParam(required = false) String productName) {
//        assertSuperAdmin();
        List<User> matchingUsers = productName == null
            ? userRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
            : userRepository.findAllByProductNameOrderByCreatedAtDesc(
                ProductConfigurationService.normalizeName(productName)
            );
        List<UserSummary> users = matchingUsers
            .stream()
            .map(AdminController::toUserSummary)
            .toList();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/products")
//    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProductSummary>> getProducts() {
//        assertSuperAdmin();
        List<ProductSummary> products = productRepository.findAll(Sort.by(Sort.Direction.ASC, "productName"))
            .stream()
            .map(this::toProductSummary)
            .toList();
        return ResponseEntity.ok(products);
    }

    private void assertSuperAdmin() {
        User currentUser = currentUserService.getCurrentUser();
        if (!SUPER_ADMIN_PRODUCT.equals(currentUser.getProductName())) {
            throw new AccessDeniedException("Super administrator access is required");
        }
    }

    private static UserSummary toUserSummary(User user) {
        return new UserSummary(
            user.getId(),
            user.getProductName(),
            user.getEmailOriginal(),
            user.getStatus(),
            user.getEmailVerifiedAt(),
            user.getCreatedAt(),
            user.getUpdatedAt()
        );
    }

    private ProductSummary toProductSummary(Product product) {
        try {
            return new ProductSummary(
                product.getProductName(),
                product.getDisplayName(),
                product.isActive(),
                objectMapper.readTree(product.getSettings()),
                product.getCreatedAt(),
                product.getUpdatedAt()
            );
        } catch (IOException exception) {
            throw new IllegalStateException(
                "Invalid configuration for product " + product.getProductName(),
                exception
            );
        }
    }

    public record UserSummary(
        UUID id,
        String productName,
        String email,
        UserStatus status,
        OffsetDateTime emailVerifiedAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}

    public record ProductSummary(
        String productName,
        String displayName,
        boolean active,
        JsonNode settings,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
    ) {}
}

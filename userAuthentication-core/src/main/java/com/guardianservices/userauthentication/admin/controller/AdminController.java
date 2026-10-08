package com.guardianservices.userauthentication.admin.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.account.UserStatus;
import com.guardianservices.userauthentication.account.repository.UserRepository;
import com.guardianservices.userauthentication.authentication.repository.MfaCredentialRepository;
import com.guardianservices.userauthentication.authentication.service.MfaService;
import com.guardianservices.userauthentication.common.exception.NotFoundException;
import com.guardianservices.userauthentication.product.CurrentUserService;
import com.guardianservices.userauthentication.product.Product;
import com.guardianservices.userauthentication.product.ProductConfigurationService;
import com.guardianservices.userauthentication.product.repository.ProductRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.io.IOException;
import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.StringUtils;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
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
    private final MfaCredentialRepository mfaCredentialRepository;
    private final MfaService mfaService;
    private final CurrentUserService currentUserService;
    private final ObjectMapper objectMapper;

    @GetMapping("/users")
//    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserSummary>> getUsers(
        @RequestParam(required = false) String productName,
        @RequestParam(required = false) String mfaFilter
    ) {
        Boolean mfaEnabled = StringUtils.isNotEmpty(mfaFilter)
            ? "enabled".equalsIgnoreCase(mfaFilter.trim())
            : null;
        String normalizedProductName = productName == null
            ? null
            : ProductConfigurationService.normalizeName(productName);
        List<User> matched = userRepository.findForAdmin(normalizedProductName, mfaEnabled);
        Set<UUID> mfaEnabledUserIds = matched.isEmpty()
            ? Set.of()
            : new HashSet<>(mfaCredentialRepository.findUserIdsWithConfirmedMfa(
                matched.stream().map(User::getId).toList()));
        List<UserSummary> users = matched.stream()
            .map(user -> toUserSummary(user, mfaEnabledUserIds.contains(user.getId())))
            .toList();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/products")
//    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<ProductSummary>> getProducts() {
//        assertSuperAdmin();
        List<ProductSummary> products = productRepository.findByActiveTrue(Sort.by(Sort.Direction.ASC, "productName"))
            .stream()
            .map(this::toProductSummary)
            .toList();
        return ResponseEntity.ok(products);
    }

    @PatchMapping("/users/{userId}/mfa")
//    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUserMfa(
        @PathVariable UUID userId,
        @Valid @RequestBody MfaUpdateRequest request
    ) {
//        assertSuperAdmin();
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new NotFoundException("User not found: " + userId));

        if (request.mfaEnabled()) {
            // Enroll the user into Google Authenticator (TOTP). The returned secret /
            // QR code / recovery codes are handed to the user to add to their app; the
            // enrollment is confirmed once the user verifies a code from their app.
            MfaService.MfaEnrollmentResult result = mfaService.enrollMfa(user);
            return ResponseEntity.ok(Map.of(
                "message", "MFA enrollment initiated",
                "secret", result.getSecret(),
                "qrCodeUrl", result.getQrCodeUrl(),
                "recoveryCodes", result.getRecoveryCodes()
            ));
        }

        mfaService.disableMfa(user, null);
        return ResponseEntity.ok(Map.of("message", "MFA disabled"));
    }

    private void assertSuperAdmin() {
        User currentUser = currentUserService.getCurrentUser();
        if (!SUPER_ADMIN_PRODUCT.equals(currentUser.getProductName())) {
            throw new AccessDeniedException("Super administrator access is required");
        }
    }

    private static UserSummary toUserSummary(User user, boolean mfaEnabled) {
        return new UserSummary(
            user.getId(),
            user.getProductName(),
            user.getEmailOriginal(),
            user.getStatus(),
            mfaEnabled,
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

    public record MfaUpdateRequest(
        @NotNull Boolean mfaEnabled
    ) {}

    public record UserSummary(
        UUID id,
        String productName,
        String email,
        UserStatus status,
        boolean mfaEnabled,
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

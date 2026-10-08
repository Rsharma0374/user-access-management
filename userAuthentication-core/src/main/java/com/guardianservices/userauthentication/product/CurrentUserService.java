package com.guardianservices.userauthentication.product;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.account.UserStatus;
import com.guardianservices.userauthentication.account.repository.UserRepository;
import com.guardianservices.userauthentication.common.exception.UnauthorizedException;
import com.guardianservices.userauthentication.common.exception.ValidationException;
import com.guardianservices.userauthentication.platform.config.JwtAuthenticationToken;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class CurrentUserService {

    private final UserRepository userRepository;
    private final ProductConfigurationService productConfigurationService;

    public User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String subject = null;
        String productName = null;
        if (authentication instanceof JwtAuthenticationToken jwtAuthentication) {
            subject = jwtAuthentication.getSubject();
            productName = jwtAuthentication.getProductName();
        } else if (authentication instanceof
            org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken jwtAuthentication) {
            subject = jwtAuthentication.getToken().getSubject();
            productName = jwtAuthentication.getToken().getClaimAsString("productName");
        }

        if (subject == null || productName == null) {
            throw new UnauthorizedException("Authenticated product account is required");
        }

        ProductConfigurationService.ProductSettings product;
        try {
            product = productConfigurationService.getSettings(productName);
        } catch (ValidationException exception) {
            throw new UnauthorizedException("Authenticated product is inactive", exception);
        }
        try {
            UUID userId = UUID.fromString(subject);
            return userRepository.findActiveById(userId, product.productName(), UserStatus.ACTIVE)
                .orElseThrow(() -> new UnauthorizedException("Authenticated user not found"));
        } catch (IllegalArgumentException exception) {
            throw new UnauthorizedException("Invalid authenticated user", exception);
        }
    }
}

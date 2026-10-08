package com.guardianservices.userauthentication.product;

import com.guardianservices.userauthentication.common.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class ProductScopeValidator {

    private final ProductConfigurationService productConfigurationService;
    private final CurrentUserService currentUserService;

    public void assertMatchesAuthenticatedProduct(String requestedProductName) {
        String requestProduct = ProductConfigurationService.normalizeName(requestedProductName);
        String tokenProduct = getAuthenticatedProductName();
        if (!requestProduct.equals(tokenProduct)) {
            throw new UnauthorizedException("Product does not match the authenticated account");
        }
    }

    public String getAuthenticatedProductName() {
        String productName = currentUserService.getCurrentUser().getProductName();
        return productConfigurationService.getSettings(productName).productName();
    }
}

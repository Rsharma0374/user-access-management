package com.guardianservices.userauthentication.product;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.guardianservices.userauthentication.common.exception.ValidationException;
import com.guardianservices.userauthentication.product.repository.ProductRepository;
import java.time.Duration;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ProductConfigurationServiceTest {

    @Mock
    private ProductRepository productRepository;

    private ProductConfigurationService configurationService;

    @BeforeEach
    void setUp() {
        configurationService = new ProductConfigurationService(productRepository, new ObjectMapper());
    }

    @Test
    void getSettings_normalizesNameAndLoadsProductOverrides() {
        Product product = new Product();
        product.setProductName("password-manager");
        product.setSettings("""
            {"accessTokenTtl":"PT5M","mfaIssuer":"Password Manager"}
            """);
        when(productRepository.findByProductNameAndActiveTrue("password-manager"))
            .thenReturn(Optional.of(product));

        ProductConfigurationService.ProductSettings settings =
            configurationService.getSettings(" Password-Manager ");

        assertThat(settings.productName()).isEqualTo("password-manager");
        assertThat(settings.getDuration("accessTokenTtl", Duration.ofMinutes(10)))
            .isEqualTo(Duration.ofMinutes(5));
        assertThat(settings.getString("mfaIssuer", "Identity Service"))
            .isEqualTo("Password Manager");
        assertThat(settings.getDuration("refreshIdleTtl", Duration.ofDays(7)))
            .isEqualTo(Duration.ofDays(7));
    }

    @Test
    void getSettings_rejectsUnknownProduct() {
        when(productRepository.findByProductNameAndActiveTrue("unknown"))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> configurationService.getSettings("unknown"))
            .isInstanceOf(ValidationException.class)
            .hasMessage("Unknown or inactive product");
    }

    @Test
    void getDuration_rejectsNonPositiveProductOverrides() {
        ProductConfigurationService.ProductSettings settings =
            new ProductConfigurationService.ProductSettings(
                "password-manager",
                new ObjectMapper().valueToTree(java.util.Map.of("accessTokenTtl", "PT0S"))
            );

        assertThatThrownBy(() -> settings.getDuration("accessTokenTtl", Duration.ofMinutes(10)))
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("accessTokenTtl");
    }
}

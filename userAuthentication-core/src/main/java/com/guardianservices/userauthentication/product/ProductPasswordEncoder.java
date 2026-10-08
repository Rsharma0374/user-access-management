package com.guardianservices.userauthentication.product;

import com.guardianservices.userauthentication.common.exception.ValidationException;
import com.guardianservices.userauthentication.common.util.Argon2PasswordEncoder;
import com.guardianservices.userauthentication.platform.config.AuthProperties;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProductPasswordEncoder {

    private final ProductConfigurationService productConfigurationService;
    private final AuthProperties authProperties;

    public String encode(String productName, String rawPassword) {
        var product = productConfigurationService.getSettings(productName);
        int maxLength = product.getBoundedInt(
            "passwordMaxLength",
            authProperties.getPassword().getMaxLength(),
            8,
            256
        );
        if (rawPassword.length() > maxLength) {
            throw new ValidationException(
                "Password exceeds the limit for this product",
                Map.of("password", "Maximum length is " + maxLength)
            );
        }

        var passwordProperties = authProperties.getPassword();
        Argon2PasswordEncoder encoder = new Argon2PasswordEncoder(
            product.getBoundedInt(
                "argon2MemoryKib",
                passwordProperties.getArgon2MemoryKib(),
                8_192,
                262_144
            ),
            product.getBoundedInt(
                "argon2Iterations",
                passwordProperties.getArgon2Iterations(),
                1,
                10
            ),
            product.getBoundedInt(
                "argon2Parallelism",
                passwordProperties.getArgon2Parallelism(),
                1,
                8
            )
        );
        return encoder.encode(rawPassword);
    }
}

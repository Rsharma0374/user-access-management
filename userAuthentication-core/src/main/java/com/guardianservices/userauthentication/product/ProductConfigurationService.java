package com.guardianservices.userauthentication.product;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.guardianservices.userauthentication.common.exception.ValidationException;
import com.guardianservices.userauthentication.product.repository.ProductRepository;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class ProductConfigurationService {

    private final ProductRepository productRepository;
    private final ObjectMapper objectMapper;

    public ProductSettings getSettings(String productName) {
        String normalizedName = normalizeName(productName);
        Product product = productRepository.findByProductNameAndActiveTrue(normalizedName)
            .orElseThrow(() -> new ValidationException(
                "Unknown or inactive product",
                Map.of("productName", "Select a configured product")
            ));

        try {
            JsonNode settings = objectMapper.readTree(product.getSettings());
            return new ProductSettings(product.getProductName(), settings);
        } catch (java.io.IOException exception) {
            throw new IllegalStateException(
                "Invalid configuration for product " + product.getProductName(),
                exception
            );
        }
    }

    public static String normalizeName(String productName) {
        if (productName == null || productName.isBlank()) {
            throw new ValidationException(
                "Product name is required",
                Map.of("productName", "Must not be blank")
            );
        }
        String normalizedName = productName.trim().toLowerCase(Locale.ROOT);
        if (!normalizedName.matches("[a-z0-9][a-z0-9-]{0,99}")) {
            throw new ValidationException(
                "Invalid product name",
                Map.of("productName", "Use lowercase letters, numbers, and hyphens")
            );
        }
        return normalizedName;
    }

    public record ProductSettings(String productName, JsonNode values) {

        public String getString(String key, String defaultValue) {
            JsonNode value = values.get(key);
            if (value == null || value.isNull()) {
                return defaultValue;
            }
            if (!value.isTextual() || value.asText().isBlank()) {
                throw invalidValue(key);
            }
            return value.asText();
        }

        public Duration getDuration(String key, Duration defaultValue) {
            String value = getString(key, null);
            if (value == null) {
                return defaultValue;
            }
            try {
                Duration duration = Duration.parse(value);
                if (duration.isNegative() || duration.isZero()) {
                    throw invalidValue(key);
                }
                return duration;
            } catch (java.time.format.DateTimeParseException exception) {
                throw invalidValue(key);
            }
        }

        public int getBoundedInt(String key, int defaultValue, int minimum, int maximum) {
            JsonNode configuredValue = values.get(key);
            if (configuredValue == null || configuredValue.isNull()) {
                return defaultValue;
            }
            if (!configuredValue.canConvertToInt()) {
                throw invalidValue(key);
            }
            int value = configuredValue.asInt();
            if (value < minimum || value > maximum) {
                throw invalidValue(key);
            }
            return value;
        }

        public long getBoundedLong(String key, long defaultValue, long minimum, long maximum) {
            JsonNode value = values.get(key);
            if (value == null || value.isNull()) {
                return defaultValue;
            }
            if (!value.canConvertToLong()) {
                throw invalidValue(key);
            }
            long number = value.asLong();
            if (number < minimum || number > maximum) {
                throw invalidValue(key);
            }
            return number;
        }

        public String[] getStringArray(String key, String[] defaultValue) {
            JsonNode value = values.get(key);
            if (value == null || value.isNull()) {
                return defaultValue;
            }
            if (!value.isArray()) {
                throw invalidValue(key);
            }
            List<String> entries = new ArrayList<>();
            for (JsonNode entry : value) {
                if (!entry.isTextual() || entry.asText().isBlank()) {
                    throw invalidValue(key);
                }
                entries.add(entry.asText());
            }
            return entries.toArray(String[]::new);
        }

        private IllegalStateException invalidValue(String key) {
            return new IllegalStateException(
                "Invalid setting '" + key + "' for product " + productName
            );
        }
    }
}

package com.guardianservices.userauthentication.common.config;

import com.guardianservices.userauthentication.common.util.Argon2PasswordEncoder;
import com.guardianservices.userauthentication.common.util.Clock;
import com.guardianservices.userauthentication.common.util.EmailNormalizer;
import com.guardianservices.userauthentication.common.util.SecureTokenGenerator;
import com.guardianservices.userauthentication.common.util.SecureTokenGeneratorImpl;
import com.guardianservices.userauthentication.common.util.SystemClock;
import com.guardianservices.userauthentication.common.util.TokenHasher;
import com.guardianservices.userauthentication.common.util.TokenHasherImpl;
import com.guardianservices.userauthentication.platform.config.AuthProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.databind.json.JsonMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class CommonConfig {

    /**
     * Jackson 2 (com.fasterxml) ObjectMapper bean.
     *
     * <p>Spring Boot 4 defaults its HTTP message conversion to Jackson 3
     * ({@code tools.jackson}) and no longer auto-configures a
     * {@code com.fasterxml.jackson.databind.ObjectMapper} bean. Several
     * components in this service inject that type for internal JSON handling
     * (e.g. {@code readTree}), so we provide one explicitly with the same
     * sensible defaults Spring Boot historically applied (JSR-310 support and
     * ISO-8601 dates rather than numeric timestamps).
     */
    @Bean
    public ObjectMapper objectMapper() {
        return JsonMapper.builder()
            .addModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            .build();
    }

    @Bean
    public Clock clock() {
        return new SystemClock();
    }

    @Bean
    public SecureTokenGenerator secureTokenGenerator() {
        return new SecureTokenGeneratorImpl();
    }

    @Bean
    public TokenHasher tokenHasher() {
        return new TokenHasherImpl();
    }

    @Bean
    public EmailNormalizer emailNormalizer() {
        return new EmailNormalizer();
    }

    @Bean
    public PasswordEncoder passwordEncoder(AuthProperties authProperties) {
        AuthProperties.Password passwordProps = authProperties.getPassword();
        return new Argon2PasswordEncoder(
            passwordProps.getArgon2MemoryKib(),
            passwordProps.getArgon2Iterations(),
            passwordProps.getArgon2Parallelism()
        );
    }
}
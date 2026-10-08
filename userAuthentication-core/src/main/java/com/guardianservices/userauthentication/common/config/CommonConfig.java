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
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class CommonConfig {

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
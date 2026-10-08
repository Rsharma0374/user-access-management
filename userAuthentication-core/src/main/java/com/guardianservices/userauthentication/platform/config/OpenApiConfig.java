package com.guardianservices.userauthentication.platform.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.info.License;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.List;

@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("Identity Service API")
                .version("1.0.0")
                .description("Identity and User Service for account registration, authentication, session management, user profiles, and private object uploads")
                .license(new License().name("Proprietary"))
            )
            .servers(List.of(
                new Server().url("https://kong.guardianservices.in/auth-service").description("Production"),
                new Server().url("http://localhost:10009/auth-service").description("Development")
            ))
            .addSecurityItem(new SecurityRequirement().addList("bearerAuth"))
            .addSecurityItem(new SecurityRequirement().addList("cookieAuth"))
            .components(new Components()
                .addSecuritySchemes("bearerAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.HTTP)
                    .scheme("bearer")
                    .bearerFormat("JWT")
                    .description("JWT access token for API authentication")
                )
                .addSecuritySchemes("cookieAuth", new SecurityScheme()
                    .type(SecurityScheme.Type.APIKEY)
                    .in(SecurityScheme.In.COOKIE)
                    .name("__Host-refresh")
                    .description("Refresh token cookie for session management")
                )
                .addSecuritySchemes("csrfToken", new SecurityScheme()
                    .type(SecurityScheme.Type.APIKEY)
                    .in(SecurityScheme.In.HEADER)
                    .name("X-CSRF-Token")
                    .description("CSRF token for state-changing cookie-authenticated requests")
                )
            );
    }
}
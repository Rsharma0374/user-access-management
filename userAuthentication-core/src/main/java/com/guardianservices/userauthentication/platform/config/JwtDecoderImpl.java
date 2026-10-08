package com.guardianservices.userauthentication.platform.config;

import com.guardianservices.userauthentication.authentication.service.JwtService;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.stereotype.Component;
import java.time.Instant;

@Component
public class JwtDecoderImpl implements JwtDecoder {

    private final JwtService jwtService;

    public JwtDecoderImpl(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public Jwt decode(String token) throws JwtException {
        JwtService.JwtValidationResult result = jwtService.validateAccessToken(token);
        if (!result.isValid()) {
            throw new JwtException(result.getError());
        }

        return Jwt.withTokenValue(token)
            .header("alg", "RS256")
            .header("typ", "JWT")
            .claim("sub", result.getSubject())
            .claim("jti", result.getJti())
            .claim("sid", result.getSessionId())
            .claim("productName", result.getProductName())
            .claim("scopes", result.getScopes())
            .claim("roles", result.getRoles())
            .issuedAt(result.getExpiry().minusSeconds(600))
            .expiresAt(result.getExpiry())
            .build();
    }
}
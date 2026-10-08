package com.guardianservices.userauthentication.platform.config;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

public class JwtAuthenticationToken implements Authentication {

    private final String subject;
    private final String sessionId;
    private final String productName;
    private final List<String> scopes;
    private final List<String> roles;
    private boolean authenticated = true;

    public JwtAuthenticationToken(
        String subject,
        String sessionId,
        String productName,
        List<String> scopes,
        List<String> roles
    ) {
        this.subject = subject;
        this.sessionId = sessionId;
        this.productName = productName;
        this.scopes = scopes;
        this.roles = roles;
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return roles.stream()
            .map(role -> new SimpleGrantedAuthority("ROLE_" + role))
            .collect(Collectors.toList());
    }

    @Override
    public Object getCredentials() {
        return null;
    }

    @Override
    public Object getDetails() {
        return null;
    }

    @Override
    public Object getPrincipal() {
        return subject;
    }

    @Override
    public boolean isAuthenticated() {
        return authenticated;
    }

    @Override
    public void setAuthenticated(boolean authenticated) {
        this.authenticated = authenticated;
    }

    @Override
    public String getName() {
        return subject;
    }

    public String getSubject() {
        return subject;
    }

    public String getSessionId() {
        return sessionId;
    }

    public String getProductName() {
        return productName;
    }

    public List<String> getScopes() {
        return scopes;
    }

    public List<String> getRoles() {
        return roles;
    }
}
package com.guardianservices.userauthentication.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "app.auth")
public class AuthProperties {

    private Jwt jwt = new Jwt();
    private Refresh refresh = new Refresh();
    private Password password = new Password();
    private RateLimit rateLimit = new RateLimit();
    private Mfa mfa = new Mfa();
    private ActionToken actionToken = new ActionToken();
    private Session session = new Session();

    public Jwt getJwt() {
        return jwt;
    }

    public void setJwt(Jwt jwt) {
        this.jwt = jwt;
    }

    public Refresh getRefresh() {
        return refresh;
    }

    public void setRefresh(Refresh refresh) {
        this.refresh = refresh;
    }

    public Password getPassword() {
        return password;
    }

    public void setPassword(Password password) {
        this.password = password;
    }

    public RateLimit getRateLimit() {
        return rateLimit;
    }

    public void setRateLimit(RateLimit rateLimit) {
        this.rateLimit = rateLimit;
    }

    public Mfa getMfa() {
        return mfa;
    }

    public void setMfa(Mfa mfa) {
        this.mfa = mfa;
    }

    public ActionToken getActionToken() {
        return actionToken;
    }

    public void setActionToken(ActionToken actionToken) {
        this.actionToken = actionToken;
    }

    public Session getSession() {
        return session;
    }

    public void setSession(Session session) {
        this.session = session;
    }

    @Validated
    public static class Jwt {
        @NotBlank
        private String issuer;

        @NotBlank
        private String audience;

        @NotNull
        @Positive
        private Duration accessTokenTtl = Duration.ofMinutes(10);

        @NotBlank
        private String signingKeyAlias;

        private String jwksEndpointPath = "/.well-known/jwks.json";

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }

        public String getAudience() {
            return audience;
        }

        public void setAudience(String audience) {
            this.audience = audience;
        }

        public Duration getAccessTokenTtl() {
            return accessTokenTtl;
        }

        public void setAccessTokenTtl(Duration accessTokenTtl) {
            this.accessTokenTtl = accessTokenTtl;
        }

        public String getSigningKeyAlias() {
            return signingKeyAlias;
        }

        public void setSigningKeyAlias(String signingKeyAlias) {
            this.signingKeyAlias = signingKeyAlias;
        }

        public String getJwksEndpointPath() {
            return jwksEndpointPath;
        }

        public void setJwksEndpointPath(String jwksEndpointPath) {
            this.jwksEndpointPath = jwksEndpointPath;
        }
    }

    @Validated
    public static class Refresh {
        @NotNull
        @Positive
        private Duration absoluteTtl = Duration.ofDays(30);

        @NotNull
        @Positive
        private Duration idleTtl = Duration.ofDays(7);

        private int rotationGraceWindowSeconds = 0;

        public Duration getAbsoluteTtl() {
            return absoluteTtl;
        }

        public void setAbsoluteTtl(Duration absoluteTtl) {
            this.absoluteTtl = absoluteTtl;
        }

        public Duration getIdleTtl() {
            return idleTtl;
        }

        public void setIdleTtl(Duration idleTtl) {
            this.idleTtl = idleTtl;
        }

        public int getRotationGraceWindowSeconds() {
            return rotationGraceWindowSeconds;
        }

        public void setRotationGraceWindowSeconds(int rotationGraceWindowSeconds) {
            this.rotationGraceWindowSeconds = rotationGraceWindowSeconds;
        }
    }

    @Validated
    public static class Password {
        private int argon2MemoryKib = 65536;
        private int argon2Iterations = 3;
        private int argon2Parallelism = 4;
        private int maxLength = 128;
        private String breachedPasswordApiUrl;

        public int getArgon2MemoryKib() {
            return argon2MemoryKib;
        }

        public void setArgon2MemoryKib(int argon2MemoryKib) {
            this.argon2MemoryKib = argon2MemoryKib;
        }

        public int getArgon2Iterations() {
            return argon2Iterations;
        }

        public void setArgon2Iterations(int argon2Iterations) {
            this.argon2Iterations = argon2Iterations;
        }

        public int getArgon2Parallelism() {
            return argon2Parallelism;
        }

        public void setArgon2Parallelism(int argon2Parallelism) {
            this.argon2Parallelism = argon2Parallelism;
        }

        public int getMaxLength() {
            return maxLength;
        }

        public void setMaxLength(int maxLength) {
            this.maxLength = maxLength;
        }

        public String getBreachedPasswordApiUrl() {
            return breachedPasswordApiUrl;
        }

        public void setBreachedPasswordApiUrl(String breachedPasswordApiUrl) {
            this.breachedPasswordApiUrl = breachedPasswordApiUrl;
        }
    }

    @Validated
    public static class RateLimit {
        private int loginAttemptsPerMinute = 10;
        private int registerAttemptsPerHour = 5;
        private int refreshAttemptsPerMinute = 20;
        private int verificationResendAttemptsPerHour = 3;

        public int getLoginAttemptsPerMinute() {
            return loginAttemptsPerMinute;
        }

        public void setLoginAttemptsPerMinute(int loginAttemptsPerMinute) {
            this.loginAttemptsPerMinute = loginAttemptsPerMinute;
        }

        public int getRegisterAttemptsPerHour() {
            return registerAttemptsPerHour;
        }

        public void setRegisterAttemptsPerHour(int registerAttemptsPerHour) {
            this.registerAttemptsPerHour = registerAttemptsPerHour;
        }

        public int getRefreshAttemptsPerMinute() {
            return refreshAttemptsPerMinute;
        }

        public void setRefreshAttemptsPerMinute(int refreshAttemptsPerMinute) {
            this.refreshAttemptsPerMinute = refreshAttemptsPerMinute;
        }

        public int getVerificationResendAttemptsPerHour() {
            return verificationResendAttemptsPerHour;
        }

        public void setVerificationResendAttemptsPerHour(int verificationResendAttemptsPerHour) {
            this.verificationResendAttemptsPerHour = verificationResendAttemptsPerHour;
        }
    }

    @Validated
    public static class Mfa {
        private int maxTotpAttempts = 5;
        private int maxRecoveryCodeAttempts = 10;
        private int recoveryCodeCount = 10;
        private int recoveryCodeLength = 16;
        private String issuer = "IdentityService";

        public int getMaxTotpAttempts() {
            return maxTotpAttempts;
        }

        public void setMaxTotpAttempts(int maxTotpAttempts) {
            this.maxTotpAttempts = maxTotpAttempts;
        }

        public int getMaxRecoveryCodeAttempts() {
            return maxRecoveryCodeAttempts;
        }

        public void setMaxRecoveryCodeAttempts(int maxRecoveryCodeAttempts) {
            this.maxRecoveryCodeAttempts = maxRecoveryCodeAttempts;
        }

        public int getRecoveryCodeCount() {
            return recoveryCodeCount;
        }

        public void setRecoveryCodeCount(int recoveryCodeCount) {
            this.recoveryCodeCount = recoveryCodeCount;
        }

        public int getRecoveryCodeLength() {
            return recoveryCodeLength;
        }

        public void setRecoveryCodeLength(int recoveryCodeLength) {
            this.recoveryCodeLength = recoveryCodeLength;
        }

        public String getIssuer() {
            return issuer;
        }

        public void setIssuer(String issuer) {
            this.issuer = issuer;
        }
    }

    @Validated
    public static class ActionToken {
        @NotNull
        @Positive
        private Duration verificationTtl = Duration.ofHours(24);

        @NotNull
        @Positive
        private Duration passwordResetTtl = Duration.ofMinutes(15);

        @NotNull
        @Positive
        private Duration emailChangeTtl = Duration.ofHours(24);

        public Duration getVerificationTtl() {
            return verificationTtl;
        }

        public void setVerificationTtl(Duration verificationTtl) {
            this.verificationTtl = verificationTtl;
        }

        public Duration getPasswordResetTtl() {
            return passwordResetTtl;
        }

        public void setPasswordResetTtl(Duration passwordResetTtl) {
            this.passwordResetTtl = passwordResetTtl;
        }

        public Duration getEmailChangeTtl() {
            return emailChangeTtl;
        }

        public void setEmailChangeTtl(Duration emailChangeTtl) {
            this.emailChangeTtl = emailChangeTtl;
        }
    }

    @Validated
    public static class Session {
        private boolean csrfEnabled = true;
        private String cookieName = "__Host-refresh";
        private String cookiePath = "/";
        private boolean cookieSecure = true;
        private String cookieSameSite = "Lax";

        public boolean isCsrfEnabled() {
            return csrfEnabled;
        }

        public void setCsrfEnabled(boolean csrfEnabled) {
            this.csrfEnabled = csrfEnabled;
        }

        public String getCookieName() {
            return cookieName;
        }

        public void setCookieName(String cookieName) {
            this.cookieName = cookieName;
        }

        public String getCookiePath() {
            return cookiePath;
        }

        public void setCookiePath(String cookiePath) {
            this.cookiePath = cookiePath;
        }

        public boolean isCookieSecure() {
            return cookieSecure;
        }

        public void setCookieSecure(boolean cookieSecure) {
            this.cookieSecure = cookieSecure;
        }

        public String getCookieSameSite() {
            return cookieSameSite;
        }

        public void setCookieSameSite(String cookieSameSite) {
            this.cookieSameSite = cookieSameSite;
        }
    }
}
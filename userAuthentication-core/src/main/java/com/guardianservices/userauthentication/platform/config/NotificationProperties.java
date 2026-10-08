package com.guardianservices.userauthentication.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "app.notification")
public class NotificationProperties {

    private Email email = new Email();
    private Outbox outbox = new Outbox();
    private Encryption encryption = new Encryption();

    public Email getEmail() {
        return email;
    }

    public void setEmail(Email email) {
        this.email = email;
    }

    public Outbox getOutbox() {
        return outbox;
    }

    public void setOutbox(Outbox outbox) {
        this.outbox = outbox;
    }

    public Encryption getEncryption() {
        return encryption;
    }

    public void setEncryption(Encryption encryption) {
        this.encryption = encryption;
    }

    @Validated
    public static class Email {
        @NotBlank
        private String fromAddress;

        @NotBlank
        private String fromName;

        private String baseUrl;

        private String verificationPath = "/verify-email";

        private String passwordResetPath = "/reset-password";

        private String emailChangePath = "/confirm-email-change";

        public String getFromAddress() {
            return fromAddress;
        }

        public void setFromAddress(String fromAddress) {
            this.fromAddress = fromAddress;
        }

        public String getFromName() {
            return fromName;
        }

        public void setFromName(String fromName) {
            this.fromName = fromName;
        }

        public String getBaseUrl() {
            return baseUrl;
        }

        public void setBaseUrl(String baseUrl) {
            this.baseUrl = baseUrl;
        }

        public String getVerificationPath() {
            return verificationPath;
        }

        public void setVerificationPath(String verificationPath) {
            this.verificationPath = verificationPath;
        }

        public String getPasswordResetPath() {
            return passwordResetPath;
        }

        public void setPasswordResetPath(String passwordResetPath) {
            this.passwordResetPath = passwordResetPath;
        }

        public String getEmailChangePath() {
            return emailChangePath;
        }

        public void setEmailChangePath(String emailChangePath) {
            this.emailChangePath = emailChangePath;
        }
    }

    @Validated
    public static class Outbox {
        @NotNull
        @Positive
        private int batchSize = 100;

        @NotNull
        @Positive
        private Duration leaseDuration = Duration.ofMinutes(5);

        @NotNull
        @Positive
        private Duration pollInterval = Duration.ofSeconds(10);

        @NotNull
        @Positive
        private int maxAttempts = 5;

        @NotNull
        @Positive
        private Duration retryBackoff = Duration.ofMinutes(1);

        public int getBatchSize() {
            return batchSize;
        }

        public void setBatchSize(int batchSize) {
            this.batchSize = batchSize;
        }

        public Duration getLeaseDuration() {
            return leaseDuration;
        }

        public void setLeaseDuration(Duration leaseDuration) {
            this.leaseDuration = leaseDuration;
        }

        public Duration getPollInterval() {
            return pollInterval;
        }

        public void setPollInterval(Duration pollInterval) {
            this.pollInterval = pollInterval;
        }

        public int getMaxAttempts() {
            return maxAttempts;
        }

        public void setMaxAttempts(int maxAttempts) {
            this.maxAttempts = maxAttempts;
        }

        public Duration getRetryBackoff() {
            return retryBackoff;
        }

        public void setRetryBackoff(Duration retryBackoff) {
            this.retryBackoff = retryBackoff;
        }
    }

    @Validated
    public static class Encryption {
        @NotBlank
        private String keyAlias;

        public String getKeyAlias() {
            return keyAlias;
        }

        public void setKeyAlias(String keyAlias) {
            this.keyAlias = keyAlias;
        }
    }
}
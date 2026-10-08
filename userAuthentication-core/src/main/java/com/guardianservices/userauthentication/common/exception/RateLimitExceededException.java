package com.guardianservices.userauthentication.common.exception;

public class RateLimitExceededException extends RuntimeException {

    private final String retryAfter;

    public RateLimitExceededException(String message, String retryAfter) {
        super(message);
        this.retryAfter = retryAfter;
    }

    public String getRetryAfter() {
        return retryAfter;
    }
}
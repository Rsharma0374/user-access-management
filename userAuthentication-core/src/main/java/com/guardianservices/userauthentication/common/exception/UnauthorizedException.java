package com.guardianservices.userauthentication.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class UnauthorizedException extends RuntimeException {

    public static final String ERROR_MESSAGE = "Not authorized to access this service.";

    /** Default code for failures that must stay opaque to the caller. */
    public static final String DEFAULT_CODE = "UNAUTHORIZED";

    /**
     * Machine-readable reason. Only codes an exception handler explicitly
     * allow-lists are echoed to the client; everything else is reported as
     * {@link #DEFAULT_CODE} with the generic {@link #ERROR_MESSAGE}, so adding
     * a code here never widens disclosure on its own.
     */
    private final String code;

    public UnauthorizedException(String message) {
        this(DEFAULT_CODE, message, null);
    }

    public UnauthorizedException(String message, Throwable cause) {
        this(DEFAULT_CODE, message, cause);
    }

    private UnauthorizedException(String code, String message, Throwable cause) {
        super(message, cause);
        this.code = code;
    }

    /**
     * Build an exception carrying a specific reason code. The {@code message}
     * stays internal (logs only); what the client sees is decided by the
     * handler's allow-list.
     */
    public static UnauthorizedException withCode(String code, String message) {
        return new UnauthorizedException(code, message, null);
    }

    public String getCode() {
        return code;
    }
}

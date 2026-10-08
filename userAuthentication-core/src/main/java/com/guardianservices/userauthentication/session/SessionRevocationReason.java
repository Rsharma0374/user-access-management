package com.guardianservices.userauthentication.session;

public enum SessionRevocationReason {
    USER_LOGOUT,
    USER_LOGOUT_ALL,
    PASSWORD_RESET,
    PASSWORD_CHANGE,
    ACCOUNT_SUSPENDED,
    SECURITY_REVOCATION,
    TOKEN_REPLAY_DETECTED,
    ADMIN_ACTION
}
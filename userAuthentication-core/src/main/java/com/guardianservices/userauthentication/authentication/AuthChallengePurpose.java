package com.guardianservices.userauthentication.authentication;

public enum AuthChallengePurpose {
    MFA_VERIFICATION,
    PASSWORD_CHANGE,
    EMAIL_CHANGE,
    MFA_ENROLLMENT,
    MFA_REMOVAL,
    ACCOUNT_DELETION
}
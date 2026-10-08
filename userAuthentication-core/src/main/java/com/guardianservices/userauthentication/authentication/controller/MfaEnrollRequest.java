package com.guardianservices.userauthentication.authentication.controller;

import java.util.UUID;
import lombok.Data;

/**
 * Optional body for POST /v1/auth/mfa/enroll.
 *
 * When {@code userId} is omitted (or equals the caller), enrollment targets the
 * authenticated user (self-enrollment). When a different {@code userId} is
 * supplied, a super-admin may initiate enrollment on that user's behalf.
 */
@Data
public class MfaEnrollRequest {

    private UUID userId;
}

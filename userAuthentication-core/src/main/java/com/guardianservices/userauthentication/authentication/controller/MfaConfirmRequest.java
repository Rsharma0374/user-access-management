package com.guardianservices.userauthentication.authentication.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.UUID;
import com.guardianservices.userauthentication.common.ProductAwareRequest;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class MfaConfirmRequest extends ProductAwareRequest {

    @NotBlank
    @Size(min = 6, max = 8)
    private String code;

    /**
     * Optional target user. When omitted (or equal to the caller) the
     * authenticated user's pending enrollment is confirmed; a super-admin may
     * confirm on behalf of another user by supplying their id.
     */
    private UUID userId;
}

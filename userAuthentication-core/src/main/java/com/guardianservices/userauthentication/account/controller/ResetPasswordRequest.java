package com.guardianservices.userauthentication.account.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.guardianservices.userauthentication.common.ProductAwareRequest;
import lombok.Data;

@Data
public class ResetPasswordRequest extends ProductAwareRequest {

    @NotBlank
    @Size(min = 32, max = 128)
    private String token;

    @NotBlank
    @Size(min = 8, max = 256)
    private String password;
}
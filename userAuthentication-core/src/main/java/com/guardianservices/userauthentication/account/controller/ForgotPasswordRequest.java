package com.guardianservices.userauthentication.account.controller;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.guardianservices.userauthentication.common.ProductAwareRequest;
import lombok.Data;

@Data
public class ForgotPasswordRequest extends ProductAwareRequest {

    @NotBlank
    @Email
    @Size(max = 320)
    private String email;
}
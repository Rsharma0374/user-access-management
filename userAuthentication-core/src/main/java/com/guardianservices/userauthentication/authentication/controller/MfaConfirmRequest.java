package com.guardianservices.userauthentication.authentication.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.guardianservices.userauthentication.common.ProductAwareRequest;
import lombok.Data;

@Data
public class MfaConfirmRequest extends ProductAwareRequest {

    @NotBlank
    @Size(min = 6, max = 8)
    private String code;
}
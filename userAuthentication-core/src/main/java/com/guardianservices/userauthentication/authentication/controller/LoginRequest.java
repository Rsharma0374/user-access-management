package com.guardianservices.userauthentication.authentication.controller;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.guardianservices.userauthentication.common.ProductAwareRequest;
import lombok.Data;

@Data
public class LoginRequest extends ProductAwareRequest {

    @NotBlank
    @Email
    @Size(max = 320)
    private String email;

    @NotBlank
    @Size(max = 256)
    private String password;

    private String deviceId;
    private String deviceName;
}
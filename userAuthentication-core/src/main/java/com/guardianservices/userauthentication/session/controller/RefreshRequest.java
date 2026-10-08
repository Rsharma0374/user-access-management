package com.guardianservices.userauthentication.session.controller;

import jakarta.validation.constraints.Size;
import com.guardianservices.userauthentication.common.ProductAwareRequest;
import lombok.Data;

@Data
public class RefreshRequest extends ProductAwareRequest {

    @Size(min = 32, max = 128)
    private String refreshToken;

    private String deviceId;
    private String deviceName;
}
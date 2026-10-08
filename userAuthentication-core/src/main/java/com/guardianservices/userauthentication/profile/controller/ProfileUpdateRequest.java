package com.guardianservices.userauthentication.profile.controller;

import jakarta.validation.constraints.Size;
import com.guardianservices.userauthentication.common.ProductAwareRequest;
import lombok.Data;

@Data
public class ProfileUpdateRequest extends ProductAwareRequest {

    @Size(max = 100)
    private String displayName;

    @Size(max = 10)
    private String locale;

    @Size(max = 50)
    private String timezone;
}
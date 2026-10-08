package com.guardianservices.userauthentication.common;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public abstract class ProductAwareRequest {

    @NotBlank
    @Size(max = 100)
    private String productName;
}

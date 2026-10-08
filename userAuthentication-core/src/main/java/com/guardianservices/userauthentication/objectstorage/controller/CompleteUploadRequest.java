package com.guardianservices.userauthentication.objectstorage.controller;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import com.guardianservices.userauthentication.common.ProductAwareRequest;
import lombok.Data;

@Data
public class CompleteUploadRequest extends ProductAwareRequest {

    @NotBlank
    @Size(min = 36, max = 36)
    private String versionId;
}
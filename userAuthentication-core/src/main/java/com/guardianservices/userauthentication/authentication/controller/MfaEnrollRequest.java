package com.guardianservices.userauthentication.authentication.controller;

import lombok.Data;
import com.guardianservices.userauthentication.common.ProductAwareRequest;

@Data
public class MfaEnrollRequest extends ProductAwareRequest {
    // Empty request body for enrollment initiation
}
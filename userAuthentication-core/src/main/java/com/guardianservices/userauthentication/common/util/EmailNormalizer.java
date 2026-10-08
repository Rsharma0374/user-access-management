package com.guardianservices.userauthentication.common.util;

import org.springframework.stereotype.Component;

@Component
public class EmailNormalizer {

    /**
     * Normalizes email by lowercasing the domain part only.
     * Preserves the local part as-is (including dots and plus suffixes).
     */
    public String normalize(String email) {
        if (email == null || email.isEmpty()) {
            return email;
        }
        
        int atIndex = email.lastIndexOf('@');
        if (atIndex <= 0 || atIndex == email.length() - 1) {
            return email.toLowerCase();
        }
        
        String localPart = email.substring(0, atIndex);
        String domainPart = email.substring(atIndex + 1).toLowerCase();
        
        return localPart + '@' + domainPart;
    }
}
package com.guardianservices.userauthentication.common.util;

import org.springframework.stereotype.Component;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;

@Component
public class TokenHasherImpl implements TokenHasher {

    private static final String ALGORITHM = "SHA-256";

    @Override
    public byte[] hash(String token) {
        return hash(token.getBytes(StandardCharsets.UTF_8));
    }

    @Override
    public byte[] hash(byte[] token) {
        try {
            MessageDigest digest = MessageDigest.getInstance(ALGORITHM);
            return digest.digest(token);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 algorithm not available", e);
        }
    }

    @Override
    public boolean verify(String token, byte[] expectedHash) {
        byte[] computedHash = hash(token);
        return MessageDigest.isEqual(computedHash, expectedHash);
    }
}
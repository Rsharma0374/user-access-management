package com.guardianservices.userauthentication.common.util;

import java.security.SecureRandom;
import java.util.Base64;

public class SecureTokenGeneratorImpl implements SecureTokenGenerator {

    private static final SecureRandom SECURE_RANDOM = new SecureRandom();
    private static final Base64.Encoder URL_ENCODER = Base64.getUrlEncoder().withoutPadding();

    private static final int DEFAULT_ENTROPY_BYTES = 32; // 256 bits

    @Override
    public String generateToken(int entropyBytes) {
        byte[] bytes = new byte[entropyBytes];
        SECURE_RANDOM.nextBytes(bytes);
        return URL_ENCODER.encodeToString(bytes);
    }

    @Override
    public String generateToken() {
        return generateToken(DEFAULT_ENTROPY_BYTES);
    }

    @Override
    public byte[] generateBytes(int length) {
        byte[] bytes = new byte[length];
        SECURE_RANDOM.nextBytes(bytes);
        return bytes;
    }
}
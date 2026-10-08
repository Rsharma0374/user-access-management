package com.guardianservices.userauthentication.common.util;

public interface SecureTokenGenerator {

    String generateToken(int entropyBytes);

    String generateToken();

    byte[] generateBytes(int length);
}
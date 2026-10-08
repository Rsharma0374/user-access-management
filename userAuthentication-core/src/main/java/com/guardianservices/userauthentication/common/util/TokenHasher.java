package com.guardianservices.userauthentication.common.util;

public interface TokenHasher {

    byte[] hash(String token);

    byte[] hash(byte[] token);

    boolean verify(String token, byte[] hash);
}
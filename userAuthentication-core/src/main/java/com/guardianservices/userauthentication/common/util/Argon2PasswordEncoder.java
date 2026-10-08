package com.guardianservices.userauthentication.common.util;

import de.mkammerer.argon2.Argon2;
import de.mkammerer.argon2.Argon2Factory;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.nio.charset.Charset;
import java.nio.charset.StandardCharsets;

public class Argon2PasswordEncoder implements PasswordEncoder {

    private final Argon2 argon2;
    private final int memoryKib;
    private final int iterations;
    private final int parallelism;

    public Argon2PasswordEncoder(int memoryKib, int iterations, int parallelism) {
        this.argon2 = Argon2Factory.create(Argon2Factory.Argon2Types.ARGON2id);
        this.memoryKib = memoryKib;
        this.iterations = iterations;
        this.parallelism = parallelism;
    }

    @Override
    public String encode(CharSequence rawPassword) {
        // rawPassword is expected to be already SHA-256 hashed
        return argon2.hash(iterations, memoryKib, parallelism, rawPassword.toString());
    }

    @Override
    public boolean matches(CharSequence rawPassword, String encodedPassword) {
        // rawPassword is expected to be already SHA-256 hashed
        return argon2.verify(encodedPassword, rawPassword.toString());
    }

    @Override
    public boolean upgradeEncoding(String encodedPassword) {
        return false;
    }
}
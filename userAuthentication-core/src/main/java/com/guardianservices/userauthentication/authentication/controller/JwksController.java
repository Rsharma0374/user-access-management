package com.guardianservices.userauthentication.authentication.controller;

import com.guardianservices.userauthentication.authentication.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/.well-known")
@RequiredArgsConstructor
public class JwksController {

    private final JwtService jwtService;

    @GetMapping("/jwks.json")
    public ResponseEntity<String> getJwks() {
        String jwks = jwtService.getJwks();
        return ResponseEntity.ok()
            .header("Content-Type", "application/json")
            .body(jwks);
    }
}
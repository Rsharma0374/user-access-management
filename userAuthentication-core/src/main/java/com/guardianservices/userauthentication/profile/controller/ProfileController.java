package com.guardianservices.userauthentication.profile.controller;

import com.guardianservices.userauthentication.profile.UserProfile;
import com.guardianservices.userauthentication.profile.service.ProfileService;
import com.guardianservices.userauthentication.product.ProductScopeValidator;
import com.guardianservices.userauthentication.product.CurrentUserService;
import com.guardianservices.userauthentication.account.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/v1/users/me")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfileService profileService;
    private final ProductScopeValidator productScopeValidator;
    private final CurrentUserService currentUserService;
    private final AccountService accountService;

    @GetMapping
    public ResponseEntity<?> getProfile() {
        UserProfile profile = profileService.getProfile(getCurrentUser());
        log.debug("Profile retrieved");
        return ResponseEntity.ok(Map.of(
            "displayName", profile.getDisplayName(),
            "avatarObjectId", profile.getAvatarObjectId(),
            "locale", profile.getLocale(),
            "timezone", profile.getTimezone()
        ));
    }

    @PatchMapping
    public ResponseEntity<?> updateProfile(@Valid @RequestBody ProfileUpdateRequest request) {
        productScopeValidator.assertMatchesAuthenticatedProduct(request.getProductName());
        UserProfile profile = profileService.updateProfile(
            getCurrentUser(),
            request.getDisplayName(),
            request.getLocale(),
            request.getTimezone()
        );
        log.info("Profile update request completed");
        return ResponseEntity.ok(Map.of(
            "displayName", profile.getDisplayName(),
            "avatarObjectId", profile.getAvatarObjectId(),
            "locale", profile.getLocale(),
            "timezone", profile.getTimezone()
        ));
    }

    @PostMapping("/avatar")
    public ResponseEntity<?> setAvatar(@RequestParam UUID objectId) {
        UserProfile profile = profileService.updateAvatar(getCurrentUser(), objectId);
        log.info("Avatar update request completed");
        return ResponseEntity.ok(Map.of("avatarObjectId", profile.getAvatarObjectId()));
    }

    @DeleteMapping("/avatar")
    public ResponseEntity<?> deleteAvatar() {
        profileService.deleteAvatar(getCurrentUser());
        log.info("Avatar deletion request completed");
        return ResponseEntity.ok(Map.of("message", "Avatar removed"));
    }

    @PostMapping("/email-change")
    public ResponseEntity<?> initiateEmailChange(@Valid @RequestBody 
        com.guardianservices.userauthentication.account.controller.EmailChangeRequest request) {
        productScopeValidator.assertMatchesAuthenticatedProduct(request.getProductName());
        accountService.initiateEmailChange(currentUserService.getCurrentUser(), request.getNewEmail());
        return ResponseEntity.accepted().body(Map.of("message", "Email change initiated"));
    }

    private com.guardianservices.userauthentication.account.User getCurrentUser() {
        return currentUserService.getCurrentUser();
    }
}
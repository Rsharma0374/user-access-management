package com.guardianservices.userauthentication.objectstorage.controller;

import com.guardianservices.userauthentication.objectstorage.service.ObjectStorageService;
import com.guardianservices.userauthentication.product.ProductScopeValidator;
import com.guardianservices.userauthentication.product.CurrentUserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/v1")
@RequiredArgsConstructor
public class ObjectController {

    private final ObjectStorageService objectStorageService;
    private final ProductScopeValidator productScopeValidator;
    private final CurrentUserService currentUserService;

    @PostMapping("/uploads")
    public ResponseEntity<?> createUploadIntent(@Valid @RequestBody UploadIntentRequest request) {
        productScopeValidator.assertMatchesAuthenticatedProduct(request.getProductName());
        ObjectStorageService.UploadIntent intent = objectStorageService.createUploadIntent(
            getCurrentUser(),
            request.getPurpose(),
            request.getContentType(),
            request.getSize()
        );
        log.info("Upload intent request completed for object {}", intent.objectId());
        return ResponseEntity.ok(Map.of(
            "objectId", intent.objectId(),
            "uploadUrl", intent.uploadUrl(),
            "headers", intent.headers(),
            "expiresAt", intent.expiresAt()
        ));
    }

    @PostMapping("/uploads/{id}/complete")
    public ResponseEntity<?> completeUpload(@PathVariable UUID id,
                                             @Valid @RequestBody CompleteUploadRequest request) {
        productScopeValidator.assertMatchesAuthenticatedProduct(request.getProductName());
        objectStorageService.completeUpload(getCurrentUser(), id, request.getVersionId());
        log.info("Upload completion request processed for object {}", id);
        return ResponseEntity.ok(Map.of("message", "Upload completed, processing started"));
    }

    @GetMapping("/uploads/{id}")
    public ResponseEntity<?> getUploadStatus(@PathVariable UUID id) {
        var object = objectStorageService.getUploadStatus(getCurrentUser(), id);
        return ResponseEntity.ok(Map.of("status", object.getStatus()));
    }

    @GetMapping("/objects/{id}/download")
    public ResponseEntity<?> downloadObject(@PathVariable UUID id) {
        ObjectStorageService.DownloadUrl url = objectStorageService.generateDownloadUrl(getCurrentUser(), id);
        log.info("Download request processed for object {}", id);
        return ResponseEntity.ok(Map.of("downloadUrl", url.url()));
    }

    @DeleteMapping("/objects/{id}")
    public ResponseEntity<?> deleteObject(@PathVariable UUID id) {
        objectStorageService.deleteObject(getCurrentUser(), id);
        log.info("Object deletion request completed for object {}", id);
        return ResponseEntity.ok(Map.of("message", "Object deletion initiated"));
    }

    private com.guardianservices.userauthentication.account.User getCurrentUser() {
        return currentUserService.getCurrentUser();
    }
}
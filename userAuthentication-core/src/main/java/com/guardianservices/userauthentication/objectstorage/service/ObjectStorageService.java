package com.guardianservices.userauthentication.objectstorage.service;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.common.exception.NotFoundException;
import com.guardianservices.userauthentication.common.exception.ValidationException;
import com.guardianservices.userauthentication.common.util.Clock;
import com.guardianservices.userauthentication.common.util.SecureTokenGenerator;
import com.guardianservices.userauthentication.objectstorage.ObjectPurpose;
import com.guardianservices.userauthentication.objectstorage.ObjectStatus;
import com.guardianservices.userauthentication.objectstorage.StoredObject;
import com.guardianservices.userauthentication.objectstorage.repository.StoredObjectRepository;
import com.guardianservices.userauthentication.platform.config.StorageProperties;
import com.guardianservices.userauthentication.product.ProductConfigurationService;
import com.guardianservices.userauthentication.product.ProductConfigurationService.ProductSettings;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class ObjectStorageService {

    private final StoredObjectRepository objectRepository;
    private final S3Client s3Client;
    private final S3Presigner s3Presigner;
    private final SecureTokenGenerator tokenGenerator;
    private final Clock clock;
    private final StorageProperties storageProperties;
    private final ProductConfigurationService productConfigurationService;

    @Transactional
    public UploadIntent createUploadIntent(User user, ObjectPurpose purpose, String contentType, long size) {
        ProductSettings product = productConfigurationService.getSettings(user.getProductName());
        int maxActiveUploads = product.getBoundedInt("maxActiveUploads", 10, 1, 1_000);
        // Validate quota
        long activeUploads = objectRepository.countActiveUploadsByUser(user);
        if (activeUploads >= maxActiveUploads) {
            throw new ValidationException(
                "Upload quota exceeded",
                Map.of("quota", "Max " + maxActiveUploads + " active uploads")
            );
        }

        // Validate size and type
        validateUpload(product, purpose, contentType, size);

        // Generate server-side key
        String key = generateObjectKey(product.productName(), user.getId(), purpose);
        String versionId = UUID.randomUUID().toString();
        OffsetDateTime expiresAt = clock.now().plus(product.getDuration(
            "objectTtl",
            storageProperties.getQuarantine().getObjectTtl()
        ));

        // Create object record
        StoredObject object = new StoredObject();
        object.setOwnerUser(user);
        object.setPurpose(purpose);
        object.setQuarantineKey(key);
        object.setQuarantineVersionId(versionId);
        object.setDeclaredType(contentType);
        object.setExpectedSize(size);
        object.setStatus(ObjectStatus.INITIATED);
        object.setExpiresAt(expiresAt);
        object.setCreatedAt(clock.now());
        object.setUpdatedAt(clock.now());

        object = objectRepository.save(object);

        // Generate presigned POST
        PresignedPutObjectRequest presignedRequest = createPresignedPost(
            object,
            contentType,
            size,
            product.getDuration("presignedPostTtl", storageProperties.getUpload().getPresignedPostTtl())
        );

        Map<?, ?> signedHeaders = presignedRequest.signedHeaders();
        Map<?, ?> headers = presignedRequest.httpRequest().headers();

        log.info("Upload intent created for object {} by user {}", object.getId(), user.getId());
        return new UploadIntent(
            object.getId(),
            presignedRequest.url().toString(),
            signedHeaders,
            headers,
            expiresAt
        );
    }

    private void validateUpload(
        ProductSettings product,
        ObjectPurpose purpose,
        String contentType,
        long size
    ) {
        StorageProperties.Upload uploadProps = storageProperties.getUpload();
        
        long maxSize = purpose == ObjectPurpose.PROFILE_IMAGE
            ? product.getBoundedLong(
                "profileImageMaxSizeBytes",
                uploadProps.getProfileImageMaxSizeBytes(),
                1,
                100L * 1024 * 1024
            )
            : product.getBoundedLong(
                "generalUploadMaxSizeBytes",
                uploadProps.getGeneralUploadMaxSizeBytes(),
                1,
                1024L * 1024 * 1024
            );

        if (size > maxSize) {
            throw new ValidationException("File size exceeds limit", Map.of("size", "Max " + maxSize + " bytes"));
        }

        String[] allowedTypes = purpose == ObjectPurpose.PROFILE_IMAGE
            ? product.getStringArray("allowedProfileImageTypes", uploadProps.getAllowedProfileImageTypes())
            : product.getStringArray("allowedGeneralUploadTypes", uploadProps.getAllowedGeneralUploadTypes());

        if (allowedTypes != null && allowedTypes.length > 0) {
            boolean allowed = false;
            for (String type : allowedTypes) {
                if (type.equalsIgnoreCase(contentType)) {
                    allowed = true;
                    break;
                }
            }
            if (!allowed) {
                throw new ValidationException("File type not allowed", Map.of("contentType", "Not in allowed list"));
            }
        }

        // Reject SVG and active document formats
        if (contentType != null && (
            contentType.equals("image/svg+xml") ||
            contentType.equals("application/pdf") ||
            contentType.equals("application/postscript")
        )) {
            throw new ValidationException("File type not allowed", Map.of("contentType", "Active content rejected"));
        }
    }

    private String generateObjectKey(String productName, UUID userId, ObjectPurpose purpose) {
        String prefix = purpose == ObjectPurpose.PROFILE_IMAGE ? "profile/" : "uploads/";
        return prefix + productName + "/" + userId + "/" + tokenGenerator.generateToken(16);
    }

    private PresignedPutObjectRequest createPresignedPost(
        StoredObject object,
        String contentType,
        long size,
        java.time.Duration presignedPostTtl
    ) {
        PutObjectRequest putRequest = PutObjectRequest.builder()
            .bucket(storageProperties.getS3().getQuarantineBucket())
            .key(object.getQuarantineKey())
            .contentType(contentType)
            .contentLength(size)
            .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
            .signatureDuration(presignedPostTtl)
            .putObjectRequest(putRequest)
            .build();

        return s3Presigner.presignPutObject(presignRequest);
    }

    @Transactional
    public void completeUpload(User user, UUID objectId, String versionId) {
        StoredObject object = objectRepository.findByOwnerAndIdForUpdate(user, objectId)
            .orElseThrow(() -> new NotFoundException("Object not found"));

        if (!object.getQuarantineVersionId().equals(versionId)) {
            throw new ValidationException("Version mismatch", Map.of("version", "Mismatch"));
        }

        // Update status to QUARANTINED for processing
        object.setStatus(ObjectStatus.QUARANTINED);
        object.setQuarantineVersionId(versionId);
        object.setUpdatedAt(clock.now());
        objectRepository.save(object);

        // In production, send S3 event notification or SQS message for processing
        log.info("Upload completed for object: {}", objectId);
    }

    @Transactional(readOnly = true)
    public StoredObject getObject(User user, UUID objectId) {
        StoredObject object = objectRepository.findByOwnerAndStatusAndId(user, ObjectStatus.READY, objectId)
            .orElseThrow(() -> new NotFoundException("Object not found"));
        return object;
    }

    @Transactional(readOnly = true)
    public StoredObject getUploadStatus(User user, UUID objectId) {
        return objectRepository.findByOwnerUserAndId(user, objectId)
            .orElseThrow(() -> new NotFoundException("Object not found"));
    }

    @Transactional(readOnly = true)
    public DownloadUrl generateDownloadUrl(User user, UUID objectId) {
        StoredObject object = objectRepository.findByOwnerAndStatusAndId(user, ObjectStatus.READY, objectId)
            .orElseThrow(() -> new NotFoundException("Object not found"));

        if (object.getCleanKey() == null || object.getCleanVersionId() == null) {
            throw new NotFoundException("Object not available for download");
        }

        software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest presignRequest = 
            software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest.builder()
                .signatureDuration(productConfigurationService.getSettings(user.getProductName()).getDuration(
                    "downloadUrlTtl",
                    storageProperties.getUpload().getDownloadUrlTtl()
                ))
                .getObjectRequest(GetObjectRequest.builder()
                    .bucket(storageProperties.getS3().getCleanBucket())
                    .key(object.getCleanKey())
                    .versionId(object.getCleanVersionId())
                    .build())
                .build();

        software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest presignedUrl = 
            s3Presigner.presignGetObject(presignRequest);

        log.info("Download URL generated for object {} by user {}", objectId, user.getId());
        return new DownloadUrl(presignedUrl.url().toString(), object.getCleanKey());
    }

    @Transactional
    public void deleteObject(User user, UUID objectId) {
        StoredObject object = objectRepository.findByOwnerAndIdForUpdate(user, objectId)
            .orElseThrow(() -> new NotFoundException("Object not found"));

        // Mark as DELETING
        object.setStatus(ObjectStatus.DELETING);
        object.setUpdatedAt(clock.now());
        objectRepository.save(object);

        // Async deletion of S3 objects would happen here
        // For now, mark as DELETED
        object.setStatus(ObjectStatus.DELETED);
        object.setUpdatedAt(clock.now());
        objectRepository.save(object);
        log.info("Object {} deleted for user {}", objectId, user.getId());
    }

    private byte[] encryptSecret(String secret) {
        return secret.getBytes(java.nio.charset.StandardCharsets.UTF_8);
    }

    public record UploadIntent(
        UUID objectId,
        String uploadUrl,
        Map<?, ?> signedHeaders,
        Map<?, ?> headers,
        OffsetDateTime expiresAt
    ) {}

    public record DownloadUrl(String url, String objectKey) {}
}
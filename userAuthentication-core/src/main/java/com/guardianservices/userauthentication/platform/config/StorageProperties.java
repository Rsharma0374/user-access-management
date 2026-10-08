package com.guardianservices.userauthentication.platform.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "app.storage")
public class StorageProperties {

    private S3 s3 = new S3();
    private Upload upload = new Upload();
    private Quarantine quarantine = new Quarantine();

    public S3 getS3() {
        return s3;
    }

    public void setS3(S3 s3) {
        this.s3 = s3;
    }

    public Upload getUpload() {
        return upload;
    }

    public void setUpload(Upload upload) {
        this.upload = upload;
    }

    public Quarantine getQuarantine() {
        return quarantine;
    }

    public void setQuarantine(Quarantine quarantine) {
        this.quarantine = quarantine;
    }

    @Validated
    public static class S3 {
        @NotBlank
        private String region;

        @NotBlank
        private String quarantineBucket;

        @NotBlank
        private String cleanBucket;

        private String kmsKeyId;

        private String endpointOverride;

        public String getRegion() {
            return region;
        }

        public void setRegion(String region) {
            this.region = region;
        }

        public String getQuarantineBucket() {
            return quarantineBucket;
        }

        public void setQuarantineBucket(String quarantineBucket) {
            this.quarantineBucket = quarantineBucket;
        }

        public String getCleanBucket() {
            return cleanBucket;
        }

        public void setCleanBucket(String cleanBucket) {
            this.cleanBucket = cleanBucket;
        }

        public String getKmsKeyId() {
            return kmsKeyId;
        }

        public void setKmsKeyId(String kmsKeyId) {
            this.kmsKeyId = kmsKeyId;
        }

        public String getEndpointOverride() {
            return endpointOverride;
        }

        public void setEndpointOverride(String endpointOverride) {
            this.endpointOverride = endpointOverride;
        }
    }

    @Validated
    public static class Upload {
        @NotNull
        @Positive
        private long profileImageMaxSizeBytes = 5 * 1024 * 1024; // 5 MiB

        @NotNull
        @Positive
        private long generalUploadMaxSizeBytes = 50 * 1024 * 1024; // 50 MiB

        @NotNull
        @Positive
        private Duration presignedPostTtl = Duration.ofMinutes(5);

        @NotNull
        @Positive
        private Duration downloadUrlTtl = Duration.ofSeconds(60);

        private String[] allowedProfileImageTypes = {"image/jpeg", "image/png", "image/webp"};
        private String[] allowedGeneralUploadTypes;

        public long getProfileImageMaxSizeBytes() {
            return profileImageMaxSizeBytes;
        }

        public void setProfileImageMaxSizeBytes(long profileImageMaxSizeBytes) {
            this.profileImageMaxSizeBytes = profileImageMaxSizeBytes;
        }

        public long getGeneralUploadMaxSizeBytes() {
            return generalUploadMaxSizeBytes;
        }

        public void setGeneralUploadMaxSizeBytes(long generalUploadMaxSizeBytes) {
            this.generalUploadMaxSizeBytes = generalUploadMaxSizeBytes;
        }

        public Duration getPresignedPostTtl() {
            return presignedPostTtl;
        }

        public void setPresignedPostTtl(Duration presignedPostTtl) {
            this.presignedPostTtl = presignedPostTtl;
        }

        public Duration getDownloadUrlTtl() {
            return downloadUrlTtl;
        }

        public void setDownloadUrlTtl(Duration downloadUrlTtl) {
            this.downloadUrlTtl = downloadUrlTtl;
        }

        public String[] getAllowedProfileImageTypes() {
            return allowedProfileImageTypes;
        }

        public void setAllowedProfileImageTypes(String[] allowedProfileImageTypes) {
            this.allowedProfileImageTypes = allowedProfileImageTypes;
        }

        public String[] getAllowedGeneralUploadTypes() {
            return allowedGeneralUploadTypes;
        }

        public void setAllowedGeneralUploadTypes(String[] allowedGeneralUploadTypes) {
            this.allowedGeneralUploadTypes = allowedGeneralUploadTypes;
        }
    }

    @Validated
    public static class Quarantine {
        @NotNull
        @Positive
        private Duration objectTtl = Duration.ofDays(7);

        @NotNull
        @Positive
        private Duration multipartTtl = Duration.ofDays(1);

        public Duration getObjectTtl() {
            return objectTtl;
        }

        public void setObjectTtl(Duration objectTtl) {
            this.objectTtl = objectTtl;
        }

        public Duration getMultipartTtl() {
            return multipartTtl;
        }

        public void setMultipartTtl(Duration multipartTtl) {
            this.multipartTtl = multipartTtl;
        }
    }
}
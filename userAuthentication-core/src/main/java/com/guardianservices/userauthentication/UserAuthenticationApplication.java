package com.guardianservices.userauthentication;

import com.guardianservices.userauthentication.authentication.service.JwtService;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.web.servlet.support.SpringBootServletInitializer;
import com.guardianservices.userauthentication.platform.config.AuthProperties;
import com.guardianservices.userauthentication.platform.config.StorageProperties;
import com.guardianservices.userauthentication.platform.config.NotificationProperties;
import org.springframework.context.annotation.Bean;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.DefaultCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.kms.KmsClient;

@SpringBootApplication(scanBasePackages = {"com.guardianservices.userauthentication"})
@EnableConfigurationProperties({AuthProperties.class, StorageProperties.class, NotificationProperties.class})
@Slf4j
public class UserAuthenticationApplication extends SpringBootServletInitializer {

    @Override
    protected SpringApplicationBuilder configure(SpringApplicationBuilder applicationBuilder) {
        return applicationBuilder.sources(UserAuthenticationApplication.class);
    }

    public static void main(String[] args) {
        System.setProperty("spring.threads.virtual.enabled", "true");
        SpringApplication.run(UserAuthenticationApplication.class, args);
        log.info("User authentication service started");
    }

    @Bean
    public S3Client s3Client(StorageProperties storageProperties) {
        var builder = S3Client.builder()
            .region(Region.of(storageProperties.getS3().getRegion()))
            .credentialsProvider(DefaultCredentialsProvider.create());
        String endpointOverride = storageProperties.getS3().getEndpointOverride();
        if (endpointOverride != null && !endpointOverride.isBlank()) {
            builder.endpointOverride(java.net.URI.create(endpointOverride));
        }
        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner(StorageProperties storageProperties) {
        var builder = S3Presigner.builder()
            .region(Region.of(storageProperties.getS3().getRegion()))
            .credentialsProvider(DefaultCredentialsProvider.create());
        String endpointOverride = storageProperties.getS3().getEndpointOverride();
        if (endpointOverride != null && !endpointOverride.isBlank()) {
            builder.endpointOverride(java.net.URI.create(endpointOverride));
        }
        return builder.build();
    }

    @Bean
    public SqsClient sqsClient(StorageProperties storageProperties) {
        return SqsClient.builder()
            .region(Region.of(storageProperties.getS3().getRegion()))
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build();
    }

    @Bean
    public KmsClient kmsClient(StorageProperties storageProperties) {
        return KmsClient.builder()
            .region(Region.of(storageProperties.getS3().getRegion()))
            .credentialsProvider(DefaultCredentialsProvider.create())
            .build();
    }

    @Bean
    public JwtService jwtService(AuthProperties authProperties,
                                  com.guardianservices.userauthentication.account.repository.UserRoleRepository userRoleRepository,
                                  com.guardianservices.userauthentication.product.ProductConfigurationService productConfigurationService) {
        JwtService jwtService = new JwtService(authProperties, userRoleRepository, productConfigurationService);
        jwtService.initialize();
        return jwtService;
    }
}
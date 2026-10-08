package com.guardianservices.userauthentication;

import org.junit.jupiter.api.BeforeAll;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.containers.localstack.LocalStackContainer;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.utility.DockerImageName;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.sqs.SqsClient;
import software.amazon.awssdk.services.kms.KmsClient;

@Testcontainers
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@ActiveProfiles("test")
public abstract class BaseIntegrationTest {

    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>(DockerImageName.parse("postgres:16-alpine"))
        .withDatabaseName("identity_service_test")
        .withUsername("test")
        .withPassword("test")
        .withReuse(true);

    @Container
    static GenericContainer<?> redis = new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
        .withExposedPorts(6379)
        .withReuse(true);

    @Container
    static LocalStackContainer localstack = new LocalStackContainer(DockerImageName.parse("localstack/localstack:3.0"))
        .withServices(LocalStackContainer.Service.S3, LocalStackContainer.Service.SQS, LocalStackContainer.Service.KMS)
        .withReuse(true);

    static S3Client s3Client;
    static SqsClient sqsClient;
    static KmsClient kmsClient;

    @BeforeAll
    static void setupAwsClients() {
        s3Client = S3Client.builder()
            .endpointOverride(localstack.getEndpointOverride(LocalStackContainer.Service.S3))
            .region(Region.of(localstack.getRegion()))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(localstack.getAccessKey(), localstack.getSecretKey())))
            .build();

        sqsClient = SqsClient.builder()
            .endpointOverride(localstack.getEndpointOverride(LocalStackContainer.Service.SQS))
            .region(Region.of(localstack.getRegion()))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(localstack.getAccessKey(), localstack.getSecretKey())))
            .build();

        kmsClient = KmsClient.builder()
            .endpointOverride(localstack.getEndpointOverride(LocalStackContainer.Service.KMS))
            .region(Region.of(localstack.getRegion()))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(localstack.getAccessKey(), localstack.getSecretKey())))
            .build();

        // Create test buckets
        createTestBuckets();
    }

    private static void createTestBuckets() {
        String quarantineBucket = "test-quarantine";
        String cleanBucket = "test-clean";

        try {
            s3Client.createBucket(b -> b.bucket(quarantineBucket));
        } catch (Exception e) {
            // Bucket may already exist
        }

        try {
            s3Client.createBucket(b -> b.bucket(cleanBucket));
        } catch (Exception e) {
            // Bucket may already exist
        }
    }

    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
        registry.add("spring.datasource.username", postgres::getUsername);
        registry.add("spring.datasource.password", postgres::getPassword);
        
        registry.add("spring.redis.host", redis::getHost);
        registry.add("spring.redis.port", redis::getFirstMappedPort);
        
        registry.add("app.storage.s3.endpoint-override", localstack::getEndpoint);
        registry.add("app.storage.s3.region", localstack::getRegion);
        registry.add("app.storage.s3.quarantine-bucket", () -> "test-quarantine");
        registry.add("app.storage.s3.clean-bucket", () -> "test-clean");
        
    }
}
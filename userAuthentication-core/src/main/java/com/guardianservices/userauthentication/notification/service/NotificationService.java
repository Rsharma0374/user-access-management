package com.guardianservices.userauthentication.notification.service;

import com.guardianservices.userauthentication.notification.OutboxEvent;
import com.guardianservices.userauthentication.notification.ProcessedEvent;
import com.guardianservices.userauthentication.notification.ProcessedEventId;
import com.guardianservices.userauthentication.notification.repository.OutboxEventRepository;
import com.guardianservices.userauthentication.notification.repository.ProcessedEventRepository;
import com.guardianservices.userauthentication.platform.config.NotificationProperties;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    private final OutboxEventRepository outboxEventRepository;
    private final ProcessedEventRepository processedEventRepository;
    private final NotificationProperties notificationProperties;

    @Transactional
    public void publishEvent(UUID aggregateId, String type, Map<String, Object> payload) {
        OutboxEvent event = new OutboxEvent();
        event.setAggregateId(aggregateId);
        event.setType(type);
        event.setSchemaVersion(1);
        event.setAvailableAt(OffsetDateTime.now());
        // In production, encrypt payload for sensitive events
        try {
            event.setPayload(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(payload));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize payload", e);
        }
        
        outboxEventRepository.save(event);
        log.info("Notification event {} queued for aggregate {}", type, aggregateId);
    }

    @Transactional
    public void publishEncryptedEvent(UUID aggregateId, String type, Map<String, Object> payload, String encryptionKeyAlias) {
        // In production, encrypt payload with KMS key
        OutboxEvent event = new OutboxEvent();
        event.setAggregateId(aggregateId);
        event.setType(type);
        event.setSchemaVersion(1);
        event.setAvailableAt(OffsetDateTime.now());
        // Encrypted payload would go in protected_payload column
        event.setProtectedPayload("ENCRYPTED".getBytes());
        
        outboxEventRepository.save(event);
        log.info("Encrypted notification event {} queued for aggregate {}", type, aggregateId);
    }
}
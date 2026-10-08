package com.guardianservices.userauthentication.audit.service;

import com.guardianservices.userauthentication.account.User;
import com.guardianservices.userauthentication.audit.AuditEvent;
import com.guardianservices.userauthentication.audit.AuditOutcome;
import com.guardianservices.userauthentication.audit.repository.AuditEventRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditService {

    private final AuditEventRepository auditEventRepository;

    @Transactional
    public void logEvent(User actor, User target, String action, AuditOutcome outcome, 
                         UUID requestId, java.net.InetAddress ipAddress, String userAgent, Map<String, Object> metadata) {
        AuditEvent event = new AuditEvent();
        event.setActor(actor);
        event.setTarget(target);
        event.setAction(action);
        event.setOutcome(outcome);
        event.setRequestId(requestId);
        event.setIpAddress(ipAddress);
        event.setUserAgent(userAgent);
        try {
            event.setMetadata(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(metadata));
        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new IllegalStateException("Failed to serialize metadata", e);
        }
        event.setCreatedAt(OffsetDateTime.now());

        auditEventRepository.save(event);
        log.info("Audit event recorded: action={}, outcome={}", action, outcome);
    }

    @Transactional
    public void logEvent(User actor, String action, AuditOutcome outcome, 
                         UUID requestId, java.net.InetAddress ipAddress, String userAgent, Map<String, Object> metadata) {
        logEvent(actor, null, action, outcome, requestId, ipAddress, userAgent, metadata);
    }
}
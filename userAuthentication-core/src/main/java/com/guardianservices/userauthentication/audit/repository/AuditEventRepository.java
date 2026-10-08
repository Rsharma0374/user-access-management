package com.guardianservices.userauthentication.audit.repository;

import com.guardianservices.userauthentication.audit.AuditEvent;
import com.guardianservices.userauthentication.account.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface AuditEventRepository extends JpaRepository<AuditEvent, UUID> {

    List<AuditEvent> findByActor(User actor);

    List<AuditEvent> findByTarget(User target);

    List<AuditEvent> findByAction(String action);

    List<AuditEvent> findByCreatedAtBetween(OffsetDateTime start, OffsetDateTime end);
}
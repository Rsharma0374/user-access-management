package com.guardianservices.userauthentication.notification.repository;

import com.guardianservices.userauthentication.notification.ProcessedEvent;
import com.guardianservices.userauthentication.notification.ProcessedEventId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.UUID;

@Repository
public interface ProcessedEventRepository extends JpaRepository<ProcessedEvent, ProcessedEventId> {

    boolean existsByConsumerNameAndEventId(String consumerName, UUID eventId);
}
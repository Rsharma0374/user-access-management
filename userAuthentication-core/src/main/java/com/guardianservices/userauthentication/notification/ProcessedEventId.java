package com.guardianservices.userauthentication.notification;

import java.io.Serializable;
import java.util.UUID;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@EqualsAndHashCode
public class ProcessedEventId implements Serializable {

    private String consumerName;
    private UUID eventId;
}
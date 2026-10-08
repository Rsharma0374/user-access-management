package com.guardianservices.userauthentication.common;

import java.io.Serializable;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@EqualsAndHashCode
public class IdempotencyRequestId implements Serializable {

    private String principalKey;
    private String endpoint;
    private String key;
}
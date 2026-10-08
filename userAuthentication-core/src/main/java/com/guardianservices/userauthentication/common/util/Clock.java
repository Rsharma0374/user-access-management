package com.guardianservices.userauthentication.common.util;

import java.time.OffsetDateTime;

public interface Clock {

    OffsetDateTime now();

    default OffsetDateTime nowUtc() {
        return now().withOffsetSameInstant(java.time.ZoneOffset.UTC);
    }
}
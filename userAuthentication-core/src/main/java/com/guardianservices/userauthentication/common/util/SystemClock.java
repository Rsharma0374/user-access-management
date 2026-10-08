package com.guardianservices.userauthentication.common.util;

import org.springframework.stereotype.Component;
import java.time.OffsetDateTime;

@Component
public class SystemClock implements Clock {

    @Override
    public OffsetDateTime now() {
        return OffsetDateTime.now();
    }
}
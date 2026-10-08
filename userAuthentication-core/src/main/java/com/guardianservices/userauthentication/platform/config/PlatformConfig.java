package com.guardianservices.userauthentication.platform.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties({
    AuthProperties.class,
    StorageProperties.class,
    NotificationProperties.class
})
public class PlatformConfig {
}
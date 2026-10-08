package com.guardianservices.userauthentication.conf;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

public class CacheConfig {
    public static Map<String, Object> CACHE = new ConcurrentHashMap<>();
}

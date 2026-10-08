package com.guardianservices.userauthentication.conf.util;

import lombok.extern.slf4j.Slf4j;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

@Slf4j
public class Helper {

    public static Properties fetchProperties(String passManagerPropertiesPath) {
        Properties properties = new Properties();
        try {
            properties.load(new FileInputStream(passManagerPropertiesPath));
            return properties;
        } catch (IOException e) {
            log.error("Exception occurred while getting pass manager config with probable cause - ", e);
            return null;
        }
    }
}

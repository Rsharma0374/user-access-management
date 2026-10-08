package com.guardianservices.userauthentication.conf;


import com.guardianservices.userauthentication.service.InfisicalService;
import com.zaxxer.hikari.HikariConfig;
import com.zaxxer.hikari.HikariDataSource;
import org.apache.commons.lang3.StringUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.orm.jpa.JpaTransactionManager;
import org.springframework.orm.jpa.LocalContainerEntityManagerFactoryBean;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.transaction.PlatformTransactionManager;

import javax.sql.DataSource;
import java.util.Properties;

@Configuration
public class DatabaseConf {

    private static final String UAM_SECRET_TYPE = "UAM_Secret";
    @Autowired
    private InfisicalService infisicalService;

    @Bean
    @ConfigurationProperties(prefix = "app.datasource.hikari")
    public HikariConfig hikariConfig() {
        HikariConfig config = new HikariConfig();
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(30000);
        return config;
    }

    @Bean
    public DataSource dataSource() {
        String uam_db_url = infisicalService.getSecret("uam_db_url", UAM_SECRET_TYPE);
        String uam_db_username = infisicalService.getSecret("uam_db_username", UAM_SECRET_TYPE);
        String uam_db_password = infisicalService.getSecret("uam_db_password", UAM_SECRET_TYPE);

        HikariConfig config = new HikariConfig();
        config.setJdbcUrl(StringUtils.isNotBlank(uam_db_url) ? uam_db_url : "jdbc:postgresql://localhost:5432/uam_db");
        config.setUsername(StringUtils.isNotBlank(uam_db_username) ? uam_db_username : "postgres");
        config.setPassword(StringUtils.isNotBlank(uam_db_password) ? uam_db_password : "postgres");
        config.setDriverClassName("org.postgresql.Driver");
        config.setMaximumPoolSize(10);
        config.setMinimumIdle(5);
        config.setConnectionTimeout(30000);
        return new HikariDataSource(config);
    }

    @Bean
    public LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
        LocalContainerEntityManagerFactoryBean em = new LocalContainerEntityManagerFactoryBean();
        em.setDataSource(dataSource);
        em.setPackagesToScan("com.guardianservices.userauthentication");

        HibernateJpaVendorAdapter vendorAdapter = new HibernateJpaVendorAdapter();
        vendorAdapter.setShowSql(false);
        em.setJpaVendorAdapter(vendorAdapter);

        Properties jpaProperties = new Properties();
        jpaProperties.put("hibernate.hbm2ddl.auto", "update");
        jpaProperties.put("hibernate.dialect", "org.hibernate.dialect.PostgreSQLDialect");
        jpaProperties.put("hibernate.format_sql", true);
        em.setJpaProperties(jpaProperties);

        return em;
    }

    @Bean
    public PlatformTransactionManager transactionManager(LocalContainerEntityManagerFactoryBean entityManagerFactory) {
        JpaTransactionManager transactionManager = new JpaTransactionManager();
        transactionManager.setEntityManagerFactory(entityManagerFactory.getObject());
        return transactionManager;
    }
}

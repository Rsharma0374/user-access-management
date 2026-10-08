package com.guardianservices.userauthentication.notification.service;

import java.time.Duration;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.HtmlUtils;

@Service
public class EmailService {

    private static final String VERIFICATION_TEMPLATE_KEY = "EMAIL_VERIFICATION";
    private static final String SELECT_TEMPLATE_SQL =
        "SELECT subject, body FROM email_templates WHERE product_name = ? AND template_key = ?";

    private final RestClient restClient;
    private final JdbcTemplate jdbcTemplate;

    public EmailService(RestClient.Builder builder, JdbcTemplate jdbcTemplate) {
        this.restClient = builder
            .baseUrl("https://kong.guardianservices.in/email-service")
            .build();
        this.jdbcTemplate = jdbcTemplate;
    }

    /** Call from the outbox consumer, not the transaction creating the token. */
    public void sendVerificationEmail(
        String productName,
        String email,
        String verificationUrl,
        String expiresIn
    ) {
        EmailTemplate template = jdbcTemplate.queryForObject(
            SELECT_TEMPLATE_SQL,
            (resultSet, rowNumber) -> new EmailTemplate(
                resultSet.getString("subject"),
                resultSet.getString("body")
            ),
            productName,
            VERIFICATION_TEMPLATE_KEY
        );
        if (template == null) {
            throw new IllegalStateException(
                "Email template not found for product " + productName
                    + ": " + VERIFICATION_TEMPLATE_KEY
            );
        }

        String message = template.body()
            .replace("{{verificationUrl}}", HtmlUtils.htmlEscape(verificationUrl))
            .replace("{{expiresIn}}", HtmlUtils.htmlEscape(formatExpiry(expiresIn)))
            .replaceAll("\\R", "");

        restClient.post()
            .uri("/send-mail")
            .contentType(MediaType.APPLICATION_JSON)
            .body(Map.of(
                "to", email,
                "subject", template.subject(),
                "message", message
            ))
            .retrieve()
            .toBodilessEntity();
    }

    private static String formatExpiry(String expiresIn) {
        Duration duration = Duration.parse(expiresIn);
        if (duration.isNegative() || duration.isZero()) {
            throw new IllegalArgumentException("Verification TTL must be positive");
        }
        long seconds = duration.getSeconds();
        if (duration.getNano() == 0 && seconds % 86400 == 0) {
            return plural(seconds / 86400, "day");
        }
        if (duration.getNano() == 0 && seconds % 3600 == 0) {
            return plural(seconds / 3600, "hour");
        }
        if (duration.getNano() == 0 && seconds % 60 == 0) {
            return plural(seconds / 60, "minute");
        }
        return plural(seconds + (duration.getNano() > 0 ? 1 : 0), "second");
    }

    private static String plural(long count, String unit) {
        return count + " " + unit + (count == 1 ? "" : "s");
    }

    private record EmailTemplate(String subject, String body) {}
}

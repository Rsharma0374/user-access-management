INSERT INTO products (product_name, display_name, settings) VALUES
    (
        'super-admin',
        'Super Admin',
        '{"jwtAudience":"identity-service:super-admin","mfaIssuer":"Super Admin","accessTokenTtl":"PT10M","refreshIdleTtl":"P7D","refreshAbsoluteTtl":"P30D","verificationTtl":"PT24H","passwordResetTtl":"PT15M","emailChangeTtl":"PT24H"}'::JSONB
    )
ON CONFLICT (product_name) DO NOTHING;

INSERT INTO email_templates (template_key, subject, body, product_name)
SELECT template_key, subject, body, 'super-admin'
FROM email_templates
WHERE product_name = 'legacy'
ON CONFLICT (product_name, template_key) DO NOTHING;

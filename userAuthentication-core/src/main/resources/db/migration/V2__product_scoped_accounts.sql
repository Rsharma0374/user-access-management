-- Product configuration and tenant isolation for the shared authentication service.
CREATE TABLE products (
    product_name VARCHAR(100) PRIMARY KEY,
    display_name VARCHAR(150) NOT NULL,
    settings JSONB NOT NULL DEFAULT '{}'::JSONB,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

INSERT INTO products (product_name, display_name, settings) VALUES
    (
        'legacy',
        'Legacy Application',
        '{"jwtAudience":"identity-service:legacy","mfaIssuer":"Identity Service","accessTokenTtl":"PT10M","refreshIdleTtl":"P7D","refreshAbsoluteTtl":"P30D","verificationTtl":"PT24H","passwordResetTtl":"PT15M","emailChangeTtl":"PT24H"}'::JSONB
    ),
    (
        'ai-log-analyser',
        'AI Log Analyser',
        '{"jwtAudience":"identity-service:ai-log-analyser","mfaIssuer":"AI Log Analyser","accessTokenTtl":"PT10M","refreshIdleTtl":"P7D","refreshAbsoluteTtl":"P30D","verificationTtl":"PT24H","passwordResetTtl":"PT15M","emailChangeTtl":"PT24H"}'::JSONB
    ),
    (
        'password-manager',
        'Password Manager',
        '{"jwtAudience":"identity-service:password-manager","mfaIssuer":"Password Manager","accessTokenTtl":"PT5M","refreshIdleTtl":"P3D","refreshAbsoluteTtl":"P14D","verificationTtl":"PT24H","passwordResetTtl":"PT10M","emailChangeTtl":"PT24H","passwordMaxLength":128,"argon2MemoryKib":65536,"argon2Iterations":3,"argon2Parallelism":4}'::JSONB
    ),
    (
        'document-utility',
        'Document Utility',
        '{"jwtAudience":"identity-service:document-utility","mfaIssuer":"Document Utility","accessTokenTtl":"PT10M","refreshIdleTtl":"P7D","refreshAbsoluteTtl":"P30D","verificationTtl":"PT24H","passwordResetTtl":"PT15M","emailChangeTtl":"PT24H"}'::JSONB
    );

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

ALTER TABLE users ADD COLUMN product_name VARCHAR(100);
UPDATE users SET product_name = 'legacy';
ALTER TABLE users ALTER COLUMN product_name SET NOT NULL;
ALTER TABLE users
    ADD CONSTRAINT fk_users_product
    FOREIGN KEY (product_name) REFERENCES products(product_name);

ALTER TABLE users DROP CONSTRAINT IF EXISTS uk_users_email_normalized;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_normalized_key;
DROP INDEX IF EXISTS idx_users_email_normalized;

ALTER TABLE users
    ADD CONSTRAINT uk_users_product_email UNIQUE (product_name, email_normalized);
CREATE INDEX idx_users_product_email ON users(product_name, email_normalized);

ALTER TABLE email_templates ADD COLUMN product_name VARCHAR(100);
UPDATE email_templates SET product_name = 'legacy';
ALTER TABLE email_templates
    ADD CONSTRAINT fk_email_templates_product
    FOREIGN KEY (product_name) REFERENCES products(product_name);
ALTER TABLE email_templates ALTER COLUMN product_name SET NOT NULL;
ALTER TABLE email_templates DROP CONSTRAINT email_templates_pkey;
ALTER TABLE email_templates
    ADD CONSTRAINT pk_email_templates PRIMARY KEY (product_name, template_key);

INSERT INTO email_templates (template_key, subject, body, product_name)
SELECT templates.template_key, templates.subject, templates.body, products.product_name
FROM email_templates templates
CROSS JOIN products
WHERE products.product_name <> 'legacy';

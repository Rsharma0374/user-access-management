-- V1__initial_schema.sql
-- Identity and User Service initial schema
-- Based on architecture.md section 8: PostgreSQL model

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Custom types
CREATE TYPE user_status AS ENUM ('PENDING_VERIFICATION', 'ACTIVE', 'SUSPENDED', 'DELETED');
CREATE TYPE object_status AS ENUM ('INITIATED', 'QUARANTINED', 'PROCESSING', 'READY', 'REJECTED', 'DELETING', 'DELETED');
CREATE TYPE object_purpose AS ENUM ('PROFILE_IMAGE', 'GENERAL_UPLOAD');
CREATE TYPE mfa_type AS ENUM ('TOTP');
CREATE TYPE action_token_purpose AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET', 'EMAIL_CHANGE');
CREATE TYPE auth_challenge_purpose AS ENUM ('MFA_VERIFICATION', 'PASSWORD_CHANGE', 'EMAIL_CHANGE', 'MFA_ENROLLMENT', 'MFA_REMOVAL', 'ACCOUNT_DELETION');
CREATE TYPE session_revocation_reason AS ENUM ('USER_LOGOUT', 'USER_LOGOUT_ALL', 'PASSWORD_RESET', 'PASSWORD_CHANGE', 'ACCOUNT_SUSPENDED', 'SECURITY_REVOCATION', 'TOKEN_REPLAY_DETECTED', 'ADMIN_ACTION');

-- users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_original VARCHAR(320) NOT NULL,
    email_normalized VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    status user_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified_at TIMESTAMPTZ,
    credentials_changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_email_original_length CHECK (char_length(email_original) <= 320),
    CONSTRAINT chk_email_normalized_length CHECK (char_length(email_normalized) <= 320)
);

CREATE INDEX idx_users_email_normalized ON users(email_normalized);
CREATE INDEX idx_users_status ON users(status);

-- user_profiles table
CREATE TABLE user_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    display_name VARCHAR(100),
    avatar_object_id UUID,
    locale VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_display_name_length CHECK (char_length(display_name) <= 100)
);

-- roles table
CREATE TABLE roles (
    name VARCHAR(50) PRIMARY KEY,
    description TEXT,
    is_privileged BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (name, description, is_privileged) VALUES
    ('USER', 'Standard user', FALSE),
    ('ADMIN', 'Administrator with elevated privileges', TRUE),
    ('SERVICE_ACCOUNT', 'Service-to-service authentication', TRUE);

-- user_roles table
CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_name VARCHAR(50) NOT NULL REFERENCES roles(name) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    granted_by UUID REFERENCES users(id),
    PRIMARY KEY (user_id, role_name)
);

CREATE INDEX idx_user_roles_role_name ON user_roles(role_name);

-- sessions table
CREATE TABLE sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_used_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    idle_expires_at TIMESTAMPTZ NOT NULL,
    absolute_expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    reason session_revocation_reason,
    device_id VARCHAR(255),
    device_name VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_idle_before_absolute CHECK (idle_expires_at <= absolute_expires_at)
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_revoked_at ON sessions(revoked_at) WHERE revoked_at IS NOT NULL;
CREATE INDEX idx_sessions_expires ON sessions(idle_expires_at, absolute_expires_at);

-- refresh_tokens table
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    token_hash BYTEA NOT NULL UNIQUE,
    parent_token_id UUID REFERENCES refresh_tokens(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_expires_after_created CHECK (expires_at > created_at),
    CONSTRAINT uk_refresh_tokens_parent UNIQUE (parent_token_id)
);

CREATE INDEX idx_refresh_tokens_session_id ON refresh_tokens(session_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX idx_refresh_tokens_expires_at ON refresh_tokens(expires_at) WHERE consumed_at IS NULL;

-- action_tokens table (verification, reset, email change)
CREATE TABLE action_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose action_token_purpose NOT NULL,
    token_hash BYTEA NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_action_token_expires CHECK (expires_at > created_at)
);

CREATE INDEX idx_action_tokens_user_purpose ON action_tokens(user_id, purpose);
CREATE INDEX idx_action_tokens_expires_at ON action_tokens(expires_at) WHERE consumed_at IS NULL;

-- mfa_credentials table
CREATE TABLE mfa_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type mfa_type NOT NULL,
    encrypted_secret BYTEA NOT NULL,
    encryption_key_version INT NOT NULL DEFAULT 1,
    confirmed_at TIMESTAMPTZ,
    last_accepted_step BIGINT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_mfa_credentials_user_id ON mfa_credentials(user_id);

-- mfa_recovery_codes table
CREATE TABLE mfa_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code_hash BYTEA NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_mfa_recovery_codes_user_id ON mfa_recovery_codes(user_id);

-- auth_challenges table
CREATE TABLE auth_challenges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    challenge_hash BYTEA NOT NULL,
    purpose auth_challenge_purpose NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempt_count INT NOT NULL DEFAULT 0,
    completed_at TIMESTAMPTZ,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_challenge_expires CHECK (expires_at > created_at)
);

CREATE INDEX idx_auth_challenges_user_purpose ON auth_challenges(user_id, purpose);
CREATE INDEX idx_auth_challenges_expires_at ON auth_challenges(expires_at) WHERE completed_at IS NULL;

-- objects table
CREATE TABLE objects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose object_purpose NOT NULL,
    quarantine_key VARCHAR(1024) NOT NULL UNIQUE,
    quarantine_version_id VARCHAR(255),
    clean_key VARCHAR(1024) UNIQUE,
    clean_version_id VARCHAR(255),
    declared_type VARCHAR(100) NOT NULL,
    detected_type VARCHAR(100),
    expected_size BIGINT NOT NULL,
    actual_size BIGINT,
    checksum VARCHAR(128),
    status object_status NOT NULL DEFAULT 'INITIATED',
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT chk_object_size_positive CHECK (expected_size > 0),
    CONSTRAINT chk_actual_size_positive CHECK (actual_size IS NULL OR actual_size >= 0)
);

CREATE INDEX idx_objects_owner ON objects(owner_user_id);
CREATE INDEX idx_objects_status ON objects(status);
CREATE INDEX idx_objects_quarantine_key ON objects(quarantine_key);
CREATE INDEX idx_objects_clean_key ON objects(clean_key);
CREATE INDEX idx_objects_expires_at ON objects(expires_at);

-- email_templates table
CREATE TABLE email_templates (
    template_key VARCHAR(100) PRIMARY KEY,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO email_templates (template_key, subject, body) VALUES (
    'EMAIL_VERIFICATION',
    'Verify your email address to activate your account',
    $email$
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify Your Email</title>
</head>
<body style="margin:0; padding:0; background-color:#f4f5f7; font-family: Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff; border-radius:8px; overflow:hidden;">
          <tr>
            <td style="background:#4f46e5; padding:24px; text-align:center;">
              <h1 style="color:#ffffff; margin:0; font-size:20px;">Verify Your Email Address</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px; color:#333333; font-size:15px; line-height:1.6;">
              <p>Hi,</p>
              <p>Thanks for signing up! Please confirm your email address to activate your account.</p>
              <table cellpadding="0" cellspacing="0" style="margin:24px 0;">
                <tr>
                  <td align="center" style="border-radius:6px; background:#4f46e5;">
                    <a href="{{verificationUrl}}"
                       style="display:inline-block; padding:12px 28px; color:#ffffff; text-decoration:none; font-weight:bold; font-size:15px;">
                      Verify Email
                    </a>
                  </td>
                </tr>
              </table>
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break:break-all; color:#4f46e5; font-size:13px;">{{verificationUrl}}</p>
              <p style="color:#888888; font-size:13px; margin-top:24px;">
                This link will expire in {{expiresIn}}. If you didn't create an account, you can safely ignore this email.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px; background:#f9fafb; color:#999999; font-size:12px; text-align:center;">
              &copy; 2026 YourCompany. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
$email$
);

-- outbox_events table
CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    aggregate_id UUID NOT NULL,
    type VARCHAR(100) NOT NULL,
    schema_version INT NOT NULL DEFAULT 1,
    protected_payload BYTEA,
    payload JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attempt_count INT NOT NULL DEFAULT 0,
    delivered_at TIMESTAMPTZ,
    lease_until TIMESTAMPTZ,
    consumer_name VARCHAR(100),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_outbox_events_delivery ON outbox_events(available_at, delivered_at, lease_until) WHERE delivered_at IS NULL;
CREATE INDEX idx_outbox_events_aggregate ON outbox_events(aggregate_id);

-- processed_events table (for deduplication)
CREATE TABLE processed_events (
    consumer_name VARCHAR(100) NOT NULL,
    event_id UUID NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (consumer_name, event_id)
);

-- idempotency_requests table
CREATE TABLE idempotency_requests (
    principal_key VARCHAR(255) NOT NULL,
    endpoint VARCHAR(255) NOT NULL,
    key VARCHAR(255) NOT NULL,
    request_hash VARCHAR(64) NOT NULL,
    response_status INT,
    response_body JSONB,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0,
    PRIMARY KEY (principal_key, endpoint, key)
);

CREATE INDEX idx_idempotency_expires ON idempotency_requests(expires_at);

-- audit_events table
CREATE TABLE audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES users(id),
    target_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    request_id UUID,
    ip_address INET,
    user_agent TEXT,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    version BIGINT NOT NULL DEFAULT 0
);

CREATE INDEX idx_audit_events_actor ON audit_events(actor_id);
CREATE INDEX idx_audit_events_target ON audit_events(target_id);
CREATE INDEX idx_audit_events_action ON audit_events(action);
CREATE INDEX idx_audit_events_created ON audit_events(created_at);

-- Trigger function for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mfa_credentials_updated_at BEFORE UPDATE ON mfa_credentials FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON objects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_action_tokens_updated_at BEFORE UPDATE ON action_tokens FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_mfa_recovery_codes_updated_at BEFORE UPDATE ON mfa_recovery_codes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auth_challenges_updated_at BEFORE UPDATE ON auth_challenges FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outbox_events_updated_at BEFORE UPDATE ON outbox_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_idempotency_requests_updated_at BEFORE UPDATE ON idempotency_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_audit_events_updated_at BEFORE UPDATE ON audit_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_processed_events_updated_at BEFORE UPDATE ON processed_events FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to normalize email (lowercase domain part only)
CREATE OR REPLACE FUNCTION normalize_email(email TEXT) RETURNS TEXT AS $$
BEGIN
    -- Split at @, lowercase domain part only
    -- Preserve local part as-is (including dots and plus suffixes)
    RETURN lower(substring(email from '@(.+)$')) || substring(email from '^(.+)@');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate token hash (SHA-256)
CREATE OR REPLACE FUNCTION hash_token(token TEXT) RETURNS BYTEA AS $$
BEGIN
    RETURN decode(sha256(token), 'hex');
END;
$$ LANGUAGE plpgsql IMMUTABLE;
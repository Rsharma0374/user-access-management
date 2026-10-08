# Identity and User Service Architecture

## 1. Scope and decisions

Build a Java Spring Boot service for account registration, authentication, session management, user profiles, and private object uploads. Kong is the public API gateway, PostgreSQL is the source of truth, and Amazon S3 stores profile images and other approved user objects. Start as a modular service rather than splitting credentials, profiles, and sessions into independently deployed services. Deploy a separate worker process from the same codebase for notifications, object processing, and cleanup.

This is a production-oriented architecture and implementation contract, not evidence that an implementation is production ready. Release requires the acceptance gates below. Initial assumptions are first-party web and mobile clients, a single organization rather than multi-tenancy, one write region, and no public third-party OAuth clients. Record changes to these assumptions as architecture decisions.

Use a supported Java LTS and compatible supported Spring Boot release, Spring Security, Spring Data JPA, Bean Validation, Flyway, PostgreSQL, AWS SDK for Java v2, Maven, and Testcontainers. Pin dependency and container versions, generate an SBOM, and automate vulnerability checks. Select supported versions at implementation time rather than assuming a version in this document is current.

## 2. Logical topology

Browser or mobile client → TLS load balancer → Kong → Identity API → PostgreSQL.

Identity API → managed signing key service and secrets manager.

Client → short-lived presigned upload → private S3 quarantine bucket.

S3 notification → SQS → Object worker → malware and image validation → private clean S3 bucket.

PostgreSQL transactional outbox → Notification worker → email provider.

Kong and the service → telemetry collector → metrics, traces, and restricted logs.

Only Kong is an application API ingress. The API, workers, and database run on private networks. Presigned S3 transfers intentionally bypass Kong for object bytes, but every grant is authorized by the service. Permit service ingress only from gateway and explicitly approved internal workloads, using network controls and authenticated transport. Infrastructure health probes use separately restricted paths.

## 3. Kong responsibilities and trust boundaries

Kong handles TLS ingress, routing, request identifiers, request/body size limits, appropriate timeouts, coarse abuse controls, and gateway telemetry. Use declarative, version-controlled gateway configuration with review and deployment validation. Keep the Admin API private and restrict administrative access. Explicitly allow known routes and methods; never publicly proxy actuator, administrative, or internal paths through a catch-all route.

Treat gateway JWT/OIDC support as a deployment-specific decision. Kong plugin capabilities, JWKS support, distributed rate limiting, and licenses differ by version and edition. Before implementation, record the Kong version, edition, deployment mode, available plugins, and supported validation behavior. Do not claim that a particular plugin supports JWKS or OIDC without verifying it. The baseline remains secure without gateway token verification: Kong forwards the bearer token and Spring Security Resource Server verifies it in the service. If an appropriate Kong plugin is available, add matching gateway verification as defense in depth.

The service always independently validates access-token signatures, a fixed algorithm allowlist, exact issuer, intended audience, expiry, and required claims, using trusted configuration rather than token-provided key locations. It performs role, scope, and resource ownership checks. Gateway acceptance never replaces service authorization. Strip spoofable inbound identity headers such as X-User-Id and X-Roles, and never use them as authentication. Configure trusted proxy chains before using forwarded IP addresses for security decisions. Kong consumer identities are not automatically application user identities.

Unauthenticated routes are limited to registration, verification, login, recovery, refresh, and public key discovery as applicable. Unauthenticated means no access token requirement; refresh and verification still require their own credentials. Apply tighter endpoint-specific limits and abuse protection to all credential-related routes. Set CORS at one designated layer with an explicit origin allowlist; never combine credentialed requests with wildcard origins. Cookie-authenticated endpoints also enforce CSRF defenses. Do not blindly retry POST authentication or mutation requests at the gateway.

## 4. Authentication model

The baseline is first-party authentication with short-lived asymmetrically signed JWT access tokens and opaque random rotating refresh tokens. This is not a homegrown OAuth/OIDC provider. If federation, SSO, delegated third-party clients, or complex identity governance become requirements, adopt Keycloak or a managed OIDC provider and retain this service for application profiles and object authorization. Never claim custom endpoints implement OAuth merely because they issue tokens.

Access tokens have a starting lifetime of 10 minutes and contain iss, aud, sub, exp, iat, jti, sid, and minimal scopes or roles. User IDs are immutable UUIDs. Tokens contain no secrets or sensitive profile fields. Publish public signing keys through a JWKS endpoint and configure each resource server with trusted issuer and audience. Keep signing private keys non-exportable where supported; perform signing through a maintained integration with managed keys. Rotation publishes new public keys before issuing new-key tokens, and retains old verification keys through the maximum token lifetime plus clock tolerance. Unknown key handling must be bounded and must never bypass verification.

Refresh sessions have a starting absolute lifetime of 30 days and an idle lifetime of 7 days. These are configurable policy choices. Generate refresh secrets with a cryptographically secure generator using at least 256 bits of entropy and store only SHA-256 token digests. Fast hashing is appropriate for these high-entropy tokens, not passwords. Rotate on every refresh and never extend a session beyond its absolute expiry.

For a first-party browser, return access tokens for in-memory use and set refresh tokens in Secure, HttpOnly, host-only cookies with SameSite chosen for the actual site topology. Use a __Host- cookie prefix only with Path=/ and no Domain. Require an approved Origin and a session-bound CSRF token on refresh, logout, and other cookie-authenticated mutations; do not assume SameSite alone suffices. Never persist bearer or refresh tokens in browser localStorage. A BFF with server-held tokens and a cookie session is the preferred alternative if the frontend topology supports it. Mobile clients store refresh credentials in operating-system secure storage. Separate browser and mobile response handling so browser refresh secrets never leak into response bodies or logs.

Logout revokes a refresh session. Ordinary resource servers can still accept already-issued access tokens for up to their remaining lifetime. All-session logout, password reset, and account suspension revoke refresh sessions. Security-sensitive operations additionally verify current account/session status in PostgreSQL; downstream services needing immediate revocation must use an authenticated status/introspection path or an explicitly designed revocation mechanism. Do not promise instant revocation for stateless JWT validation. Role changes likewise take effect at token expiry unless a live authorization check is used.

## 5. Account lifecycle and credential security

Registration validates bounded input, applies a documented email normalization policy, and inserts a PENDING_VERIFICATION account, verification token digest, and outbox notification in one transaction. Preserve the email supplied for display; enforce uniqueness on a normalized lookup column. Do not strip dots or plus suffixes based on provider assumptions. Rely on a database unique constraint to resolve concurrent requests. Return a generic accepted response for syntactically valid registration attempts, including existing addresses, without sending unnecessary duplicate mail.

Use Spring Security PasswordEncoder with Argon2id through a maintained implementation. Benchmark memory and computation parameters on deployment hardware, document the selected work factor, and support rehash-on-login. Accept long passphrases with a documented maximum that limits resource abuse; never silently truncate. Check passwords against a breached-password source without sending plaintext passwords. Never encrypt passwords for later recovery. For unknown login accounts, run an equivalent dummy password-hash verification and return a generic authentication failure. Limit authentication concurrency to protect memory-hard password verification capacity.

Successful password authentication requires ACTIVE account status and any enrolled MFA challenge before session issuance. Require MFA for privileged accounts; support TOTP with encrypted enrollment secrets, one-time hashed recovery codes, bounded attempts, and replay protection for accepted TOTP steps. Never issue a normal access token for a partially completed MFA challenge. Require recent authentication and MFA where applicable for password changes, email changes, MFA changes, and account deletion.

Verification and reset links contain random single-use tokens with digests stored in PostgreSQL, purpose binding, and configurable short expiries; initial values are 24 hours for verification and 15 minutes for password reset. Public recovery responses are generic. Consume tokens atomically. Resetting a password revokes refresh sessions and sends a security notification. A GET link displays confirmation rather than consuming a token, to avoid mail scanner activation; the actual mutation uses POST. Restrict post-action redirects to approved destinations and keep tokens out of analytics, referrers, and logs.

Use layered rate limits by trusted source IP, normalized account key, and endpoint. Use Redis only if shared service-side counters are necessary and an existing gateway implementation does not cover the need; protect account identifiers in counter keys. Explicitly document behavior when rate-limit infrastructure is unavailable. Avoid permanent account lockouts that attackers can trigger. Record safe audit events for registration, failed and successful authentication, MFA changes, session revocation, role changes, and recovery.

## 6. Refresh rotation correctness

Model sessions separately from refresh-token history. Each refresh request resolves a digest and locks the session row and token row in a consistent order inside a transaction. Validate account status, session idle/absolute expiry, revocation, and token state. Mark the presented token consumed and insert its successor before committing, then update session activity. Exactly one concurrent use of the same token may rotate successfully. Reuse of a consumed token revokes the entire session family and emits an audit event. Preserve consumed token digests until the session is no longer relevant for replay detection.

Commit replay-triggered revocation even when returning an authentication error; do not throw an exception that rolls back the revocation transaction. Return credentials only after the rotation transaction commits. Clients serialize refresh requests and must not automatically replay refresh on uncertain network outcomes. The baseline uses strict replay detection: a response lost after commit may require reauthentication. Any grace window or idempotent refresh design requires a separate threat analysis and tests; do not add one casually.

## 7. API contract

Use /v1, JSON, explicit request/response DTOs, bounded pagination, and application/problem+json error responses without stack traces. Publish OpenAPI describing authentication, cookies, CSRF, validation, errors, and idempotency. Never expose persistence entities directly.

Every request body includes a required `productName` selected from the active products configured in PostgreSQL. Normalize product keys before lookup. Public account, challenge, and refresh-token queries must scope by product; access tokens carry the signed product key and authenticated request bodies must match it. Derive product scope from the verified access token for authenticated requests without a body. The product key selects a data namespace; it is not proof of the calling service's identity.

| Method and path | Purpose and authorization |
|---|---|
| POST /v1/auth/register | Public, rate-limited registration; generic 202 |
| POST /v1/auth/email/verify | Consume verification token |
| GET /v1/auth/email/verify/{productName}/{token} | Consume a verification token from an email link |
| POST /v1/auth/email/resend | Public, generic response, heavily rate-limited |
| POST /v1/auth/login | Password authentication; session or restricted MFA challenge |
| POST /v1/auth/mfa/verify | Complete bounded pending authentication challenge |
| POST /v1/auth/refresh | Rotate refresh credential; browser CSRF required |
| POST /v1/auth/logout | Revoke current session; browser CSRF required |
| POST /v1/auth/forgot-password | Generic accepted response |
| POST /v1/auth/reset-password | Consume reset token and revoke sessions |
| POST /v1/auth/change-password | Authenticated, recent authentication required |
| GET /v1/auth/sessions | List own sessions without credentials |
| DELETE /v1/auth/sessions/{id} | Revoke own session |
| POST /v1/auth/logout-all | Revoke all own sessions |
| GET /.well-known/jwks.json | Public verification keys only |
| GET /v1/users/me | Own profile |
| PATCH /v1/users/me | Allowlisted profile fields, optimistic concurrency |
| POST /v1/users/me/email-change | Begin verified email-change workflow with recent authentication |
| POST /v1/users/me/mfa/enroll | Begin authenticated enrollment; confirm before activation |
| POST /v1/users/me/mfa/confirm | Confirm enrollment and return recovery codes once |
| DELETE /v1/users/me/mfa | Require recent authentication and existing MFA/recovery proof |
| DELETE /v1/users/me | Begin account deletion with recent authentication |
| POST /v1/uploads | Authorize and create upload intent |
| POST /v1/uploads/{id}/complete | Signal transfer completion; never mark object clean |
| GET /v1/uploads/{id} | Owner-authorized processing status |
| GET /v1/objects/{id}/download | Authorize and issue short-lived download URL |
| DELETE /v1/objects/{id} | Owner-authorized deletion workflow |

Define separate, explicitly authorized internal or administrative APIs only when needed. Do not allow registration or profile requests to set roles, account status, owner ID, or verification state. Use 401 for invalid credentials and 403 for insufficient authority, with 404 where concealing object existence is appropriate. Apply idempotency keys to upload-intent creation and relevant asynchronous mutations; bind keys to principal, endpoint, and request digest with an expiry and unique constraint. Idempotency storage must not retain raw authentication tokens.

## 8. PostgreSQL model

| Table | Essential fields and constraints |
|---|---|
| products | product_name PK, display_name, per-product auth/notification/storage settings JSONB, active, version |
| users | id UUID PK, product_name FK, email_original, email_normalized, UNIQUE(product_name, email_normalized), password_hash, status, email_verified_at, credentials_changed_at, created_at, updated_at, version |
| email_templates | product_name FK, template_key, subject, body, composite PK (product_name, template_key) |
| user_profiles | user_id PK/FK, display_name, avatar_object_id nullable FK, allowlisted optional fields, version |
| roles / user_roles | Unique role name; composite unique user-role association |
| sessions | id UUID PK, user_id FK, created_at, last_used_at, idle_expires_at, absolute_expires_at, revoked_at, reason, safe device metadata |
| refresh_tokens | id UUID PK, session_id FK, token_hash UNIQUE, parent_token_id, created_at, expires_at, consumed_at; unique successor per parent |
| action_tokens | id, user_id FK, purpose, token_hash UNIQUE, expires_at, consumed_at, purpose-specific bounded metadata |
| mfa_credentials | id, user_id FK, type, encrypted_secret, encryption_key_version, confirmed_at, last_accepted_step |
| mfa_recovery_codes | id, user_id FK, code_hash, consumed_at |
| auth_challenges | id, user_id FK, challenge_hash, purpose, expires_at, attempt_count, completed_at |
| objects | id UUID PK, owner_user_id FK, purpose, quarantine_key UNIQUE, quarantine_version_id, clean_key UNIQUE nullable, clean_version_id, declared_type, detected_type, expected_size, actual_size, checksum, status, expires_at, created_at, version |
| outbox_events | id UUID PK, aggregate_id, type, schema_version, protected_payload, created_at, available_at, attempt_count, delivered_at, lease_until |
| processed_events | consumer_name and event_id composite PK, processed_at |
| idempotency_requests | principal_key, endpoint, key, request_hash, safe response reference, expires_at; composite uniqueness |
| audit_events | id, actor_id nullable, target_id nullable, action, outcome, request_id, created_at, minimized metadata |

Use timestamptz in UTC, foreign keys, explicit check constraints for state and size, and indexes driven by queries: sessions by user/revocation/expiry, token digests, objects by owner/status, and outbox by delivery state/available time. Bound retention and batch cleanup. Enforce ownership when assigning an avatar: only the same user's READY profile-image object is valid. Use row versions for profile updates and database row locks for security-critical token transitions.

Use Flyway migrations with application-side schema validation, never automatic production schema creation. Use separate migration and runtime database roles. Bound Hikari connection pools across all replicas against PostgreSQL capacity. Avoid network calls while holding database transactions. Use expand-contract migrations so old and new releases can coexist. Avoid PostgreSQL-specific isolation changes unless justified by a tested concurrency requirement.

## 9. S3 upload and download lifecycle

S3 buckets are private, have public access blocked, require TLS, use server-side encryption with managed access-controlled KMS keys, and apply least-privilege workload IAM. Use a quarantine bucket and a clean bucket or strictly separated access domains; download code must have no path that serves quarantine content. Store object IDs and storage keys in PostgreSQL, never expiring signed URLs. Do not use client filenames as keys or filesystem paths.

1. Authenticate POST /uploads, authorize the object purpose, check account quota and outstanding upload reservations, and validate declared size/type. Start with profile images limited to JPEG, PNG, and WebP up to 5 MiB; general uploads require a separate explicit allowlist and configurable size cap. Reject SVG and active document formats unless a dedicated sanitization pipeline exists.
2. Insert an INITIATED object record with server-generated owner-scoped key and short expiry. Return an S3 presigned POST valid for approximately 5 minutes with exact key, approved content type, encryption requirements as applicable, and a content-length-range condition. The browser sends bytes directly to quarantine. Configure S3 CORS only for approved frontend origins and methods. A declared MIME type is not trusted validation.
3. The completion endpoint or an S3 event triggers server-side inspection. Check object existence, metadata, size, and checksum as applicable, then enqueue processing. Treat ETags as storage identifiers, not universal integrity hashes. A completion request is only a hint and never makes content downloadable.
4. Pin a specific quarantine object version for processing. Scan that exact version for malware, verify file signatures, enforce decoded image pixel and decompression limits, and re-encode profile images to strip metadata and active payloads. Workers run with bounded resources and no unnecessary network access.
5. Write validated bytes to a new server-only clean key, record the clean version, and atomically transition the metadata to READY. Revalidate ownership/state before assigning a profile avatar. A late upload or event must never replace an already validated object: client upload credentials cannot write to the clean location, and immutable version references prevent scan-versus-overwrite races.
6. On scan failure, transition to REJECTED; on transient processing failure, retry with bounded backoff and eventually dead-letter. States include INITIATED, QUARANTINED, PROCESSING, READY, REJECTED, DELETING, and DELETED. Handle duplicate and out-of-order notifications idempotently.
7. Download authorizes the requester and object READY state before generating an approximately 60-second signed GET for the exact clean version. General files use attachment disposition and safe filenames. Profile delivery must preserve the privacy policy; public CDN distribution is a separate opt-in design. Anyone possessing a signed URL can use it until expiry, so never log it.
8. Deletion first denies new download grants, then asynchronously deletes storage versions and records completion. Existing signed URLs may remain usable until expiry or object deletion. Reconcile failed deletes and orphaned metadata. Apply lifecycle policies to expired quarantine uploads, incomplete multipart uploads if supported later, noncurrent versions, and rejected content according to retention policy.

For large-file multipart uploads, add explicit per-part and total quotas, completion ownership checks, checksums, abort workflows, and cost controls before enabling the feature. Presigning is a temporary permission grant, not a substitute for validation.

## 10. Reliability and asynchronous work

Use the transactional outbox for work coupled to account or metadata changes. Workers claim bounded batches with leases and FOR UPDATE SKIP LOCKED, commit the claim, perform external work outside the transaction, and then record completion. Delivery is at least once. Consumers deduplicate using stable event IDs and transactional state transitions. Use provider idempotency keys when supported; do not promise exactly-once email delivery.

Verification and recovery delivery requires the raw token temporarily. Keep token digests in action_tokens, but encrypt any token-bearing outbox payload with narrowly scoped keys, limit decryption to the notification worker, and delete the protected payload after delivery or expiry. Never store raw links in plaintext event tables or telemetry. A worker retry must not silently generate a different token unless the corresponding token state is updated consistently.

S3/SQS consumers validate event source, bucket, key, and version against expected metadata. Configure dead-letter queues, bounded retries, visibility timeouts, and alarms. Make duplicate processing safe. Use scheduled reconciliation for stale upload states, stuck outbox leases, abandoned object reservations, and storage/database divergence.

Email and scanning outages degrade registration delivery or object readiness without invalidating unrelated authenticated requests. Database unavailability fails authentication and security-sensitive mutations closed. Signing-service outages block new token issuance but do not automatically invalidate already-issued tokens. Use explicit timeouts, bounded retries with jitter only for safe/idempotent operations, and dependency bulkheads. No cross-system operation relies on an imaginary transaction spanning PostgreSQL and S3.

## 11. Deployment and operations

Deploy stateless API replicas and independently scaled workers on a managed container platform. Use at least two API replicas across failure zones where the availability target requires it. Kong must also be deployed without a single avoidable instance failure point. Use graceful shutdown and connection draining. Liveness checks confirm process health without making external dependencies restart the process; readiness reflects ability to serve the relevant workload. Keep management endpoints private.

Use managed PostgreSQL with encrypted storage, high availability, automated backups, and point-in-time recovery. Set initial planning targets of 99.9% API availability, RPO no greater than 5 minutes, and RTO no greater than 60 minutes, subject to business approval, infrastructure configuration, and restore drills. Set and measure latency SLOs separately for login, refresh, profile reads, and asynchronous upload processing after representative load tests. Never publish unmeasured latency claims.

Infrastructure as code provisions networks, Kong configuration, workloads, database, S3, KMS, SQS, IAM, secrets, and monitoring. Use workload identity rather than static AWS access keys. Run containers as non-root with minimal images, read-only filesystems where practical, constrained resources, and restricted egress. Promote signed immutable images through environments. Production credentials never enter repositories or build artifacts.

Collect structured redacted logs, OpenTelemetry traces, and metrics for auth outcomes, rate-limit rejections, credential-hash saturation, refresh replay, token signing failures, database pool pressure, outbox age, queue age, scan failures, upload quota use, and S3 errors. Never use raw emails, user IDs, or object keys as unbounded metric labels. Separate audit access and retention from operational logs, and export sensitive audit records to access-controlled immutable storage when required.

Maintain runbooks for credential compromise, signing-key compromise, session revocation, email outage, queue backlog, database failover, data restore, and object scanning incidents. Document privacy retention, deletion completion, backup expiry, and legal-hold behavior. Account deletion revokes access, prevents new object grants, removes/anonymizes eligible data, and deletes associated objects asynchronously with reconciliation; backups age out under documented retention rather than being claimed immediately erased.

## 12. Code organization

Use packages grouped by business capability: account, authentication, session, profile, objectstorage, notification, audit, and platform. Within each capability separate API DTOs/controllers, application use cases, domain rules, and infrastructure adapters. Keep Spring controllers thin and place transaction boundaries on explicit application operations. Use interfaces for clocks, secure token generation, mail delivery, object storage, and signing so tests can model expiry and failures deterministically. Do not overabstract simple CRUD or share database entity classes with other microservices.

The API and worker may be separate Maven modules or runtime profiles inside one repository; they share domain contracts, not uncontrolled table mutation. Define event schema versions and compatibility tests. Use constructor injection, explicit configuration properties with startup validation, centralized safe error mapping, and bounded request fields. Disable open-session-in-view. Avoid generic utility packages that accumulate security logic without ownership.

## 13. Testing and release gates

Unit tests cover account state machines, token policy, ownership, object purpose constraints, and input validation. Integration tests run against PostgreSQL through Testcontainers and verify real constraints and locking behavior. Include concurrent registration, simultaneous refresh, consumed-token replay with persisted family revocation, expiry boundaries, password-reset revocation, MFA replay, optimistic profile updates, and transactional outbox rollback tests.

Security tests cover spoofed gateway headers, direct service ingress denial, incorrect issuer/audience/algorithm, expired and malformed tokens, unknown signing keys, forbidden origins, CSRF, IDOR, role escalation, account enumeration, mass assignment, oversized payloads, malicious files, image decompression bombs, upload overwrite races, duplicate S3 events, unauthorized downloads, and secret redaction. Test Kong route and plugin behavior using the selected edition and deployment mode.

Use a local S3 emulator for fast development but validate presigned POST conditions, version pinning, KMS permissions, notification semantics, and bucket policies against an isolated real AWS environment before release. Use a local mail sink and deterministic signing adapter only in development; startup checks must prevent those profiles in production. Load tests include password hashing memory pressure and total database connection limits across replicas. Exercise dependency outages, migration compatibility, backup restore, and rollback.

CI must pass compilation, unit and integration tests, API contract checks, formatting/static analysis, dependency and container vulnerability scanning, secret detection, migration checks, and infrastructure policy checks. Release also requires reviewed threat modeling, a security assessment appropriate to risk, configured alerts and on-call ownership, successful restore evidence, and demonstrated SLO capacity. No placeholder MFA, scanning, authorization, or fake success response may be shipped behind a production route.

## 14. Delivery sequence

Implement the schema and threat model first, then registration/verification, login and MFA, session rotation/revocation, profile APIs, upload quarantine/scan/download, asynchronous delivery, and operational hardening. Each increment includes tests and deployable configuration. Do not enable general object uploads until the scanner, quota reservation, immutable clean-copy workflow, and authorization tests pass. Resolve Kong capabilities and browser origin topology before finalizing gateway and cookie configuration.

## Implementation prompt

Act as a Java platform tech lead and implement the identity and user service specified in architecture.md using a supported Java LTS, compatible Spring Boot and Spring Security, Maven, PostgreSQL with Flyway, Kong as the only public API ingress, and private Amazon S3 quarantine and clean storage for profile images and approved user objects. Treat architecture.md as the implementation contract, record assumptions and architecture decisions, and verify the selected Kong version, edition, deployment mode, and plugin capabilities before producing gateway configuration; do not assume paid or unsupported plugins, and always validate access JWTs and enforce authorization inside the service. Build a modular codebase with thin controllers, explicit application transactions, domain state transitions, repository and external-service adapters, validated configuration, OpenAPI, and safe problem responses. Implement email registration and verification, benchmarked Argon2id password storage, generic recovery responses, rate-limited login, privileged-account MFA and recovery codes, asymmetric access-token signing through managed keys with JWKS rotation, opaque hashed refresh credentials with transactionally correct rotation and committed replay-family revocation, session management, recent-authentication checks, profile ownership, password and email changes, and account deletion. Implement private presigned POST uploads with size/type restrictions, atomic quota reservations, immutable version-pinned quarantine processing, actual malware scanning and safe image re-encoding, idempotent S3/SQS processing, clean-only authorized downloads, and reconciled asynchronous deletion; never expose unscanned objects or trust client metadata. Use a PostgreSQL transactional outbox with leased workers, encrypted temporary token-bearing email payloads, bounded retries, deduplication, dead-letter handling, and cleanup. Provide local development containers and clearly isolated development adapters, production-oriented container and infrastructure configuration, declarative Kong routes, workload IAM, secrets and key management, metrics, tracing, redacted logs, audit events, backup/restore procedures, and operational runbooks. Include unit, PostgreSQL Testcontainers, concurrency, API contract, authorization, CSRF, upload-race, AWS staging, load, and fault tests covering the release gates in the document. Never hardcode secrets, invent successful external integrations, disable security to make tests pass, or label scaffolding production ready; fail closed for unconfigured production dependencies, identify any remaining environment-specific inputs explicitly, and deliver the implementation in executable increments with commands, migration instructions, test evidence, and a final acceptance checklist.
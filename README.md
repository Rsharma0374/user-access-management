# User Access Management (UAM)

A complete, multi-tenant **User Access Management** platform combining a
production-ready authentication backend with a React single-page frontend. The
two components live side by side in this repository and are developed and
deployed together.

| Component | Directory | Stack | Dev port |
|---|---|---|---|
| **Identity / Auth API** | [`userAuthentication-core/`](userAuthentication-core/) | Java 21 · Spring Boot 3.4 · PostgreSQL · Kong | `10009` (context path `/auth-service`) |
| **Auth Web UI** | [`userAuthentication-web/`](userAuthentication-web/) | React 18 · Vite 5 · Tailwind CSS · React Router | `5173` |

Each component has its own in-depth documentation. This top-level README
explains how they fit together and how to run the full stack locally.

- Backend details → [`userAuthentication-core/README.md`](userAuthentication-core/README.md) · [`architecture.md`](userAuthentication-core/architecture.md)
- Frontend details → [`userAuthentication-web/README.md`](userAuthentication-web/README.md) · [`architecture.md`](userAuthentication-web/architecture.md)

---

## Table of contents

- [What this provides](#what-this-provides)
- [Architecture](#architecture)
- [Repository layout](#repository-layout)
- [Prerequisites](#prerequisites)
- [Quick start (full stack)](#quick-start-full-stack)
- [Core concepts](#core-concepts)
- [How the pieces connect](#how-the-pieces-connect)
- [Testing](#testing)
- [Building & deployment](#building--deployment)
- [Security notes](#security-notes)

---

## What this provides

A turnkey identity layer for one or more products:

- **Account management** — email registration with verification, password reset,
  email change, and account deletion.
- **Authentication** — username/password login with Argon2id hashing, TOTP MFA
  with recovery codes, and short-lived RS256 JWT access tokens.
- **Session management** — rotating refresh tokens with replay detection; list
  and revoke individual sessions or all sessions at once.
- **User profiles** — display name, locale, timezone, and avatar.
- **Private object storage** — presigned S3 uploads with a quarantine/clean
  bucket pattern, malware scanning, and authorized signed-URL downloads.
- **Multi-tenancy** — all auth data is isolated per product via a `productName`
  key, so the same email can hold separate accounts across products.
- **Admin** — list users and products (requires the `ADMIN` role in the
  super-admin product).

The web UI implements the end-user flows (register, verify, login, MFA,
forgot/reset password, session dashboard) against this API.

---

## Architecture

```
                         Browser
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  userAuthentication-web (React SPA)     │
        │  Vite · Tailwind · React Router         │
        │  In-memory access token + __Host cookie │
        └───────────────────────────────────────┘
                            │  /auth-service/**
                            │  (Vite dev proxy → :10009,
                            │   same-origin reverse proxy in prod)
                            ▼
        ┌───────────────────────────────────────┐
        │  Kong API Gateway                       │
        │  TLS · routing · rate limiting          │
        └───────────────────────────────────────┘
                            │
                            ▼
        ┌───────────────────────────────────────┐
        │  userAuthentication-core (Spring Boot)  │
        │  account · authentication · session ·   │
        │  profile · objectstorage · admin · …    │
        └───────────────────────────────────────┘
             │              │              │
             ▼              ▼              ▼
        PostgreSQL        Redis        Amazon S3
       (Flyway schema)  (rate limit)  (quarantine/clean)
```

**Request flow:** `Page → React Hook Form + Zod → authService → httpClient →
(Kong) → Spring Boot → PostgreSQL / Redis / S3`.

---

## Repository layout

```
user-authentication-uam-conbined/
├── README.md                     ← you are here (repo overview)
├── userAuthentication-core/      ← Spring Boot identity service
│   ├── src/main/java/com/guardianservices/userauthentication/
│   │   ├── account/              account lifecycle & registration
│   │   ├── authentication/       login, MFA, JWT, refresh rotation
│   │   ├── session/              session listing & revocation
│   │   ├── profile/              user profiles & avatars
│   │   ├── objectstorage/        presigned uploads & downloads
│   │   ├── product/              multi-tenant product config
│   │   ├── admin/ audit/ notification/ platform/ common/ conf/
│   │   └── service/
│   ├── src/main/resources/db/migration/   Flyway migrations
│   ├── kong/kong.yml             API gateway declarative config
│   ├── docker-compose.yml        Postgres + Redis + LocalStack (S3/SQS/KMS)
│   ├── Dockerfile
│   └── pom.xml
└── userAuthentication-web/       ← React frontend
    ├── src/
    │   ├── app/                  App, router, providers
    │   ├── components/           ui/ + layout/ design system
    │   ├── features/auth/        pages, context, services, validation
    │   └── services/httpClient.js
    ├── .env.example
    ├── vite.config.js            dev proxy /auth-service/** → :10009
    └── package.json
```

---

## Prerequisites

- **Java 21+** and **Maven 3.9+** (a Maven wrapper, `./mvnw`, is included)
- **Node.js 18+** and **npm**
- **Docker** & **Docker Compose** (for Postgres, Redis, and LocalStack)

---

## Quick start (full stack)

Run the three steps below in separate terminals.

### 1. Start backing services

```bash
cd userAuthentication-core
docker-compose up -d        # PostgreSQL :5432, Redis :6379, LocalStack :4566
```

### 2. Start the backend (Identity API)

```bash
cd userAuthentication-core
./mvnw spring-boot:run -Pdev
```

The API is served at **`http://localhost:10009/auth-service`** in the `dev`
profile. Swagger UI and the OpenAPI spec are exposed under that context path.

### 3. Start the frontend (Web UI)

```bash
cd userAuthentication-web
cp .env.example .env.local   # set VITE_PRODUCT_NAME (see below)
npm install
npm run dev                  # http://localhost:5173
```

The Vite dev server proxies `/auth-service/**` to `http://localhost:10009`, so
no CORS configuration is needed for local development. Open
**`http://localhost:5173`** and register an account.

> **Seeded product keys:** `ai-log-analyser`, `password-manager`,
> `document-utility` (legacy accounts use `legacy`). Set `VITE_PRODUCT_NAME` to
> one of these so the frontend's requests match a configured tenant.

---

## Core concepts

### Multi-tenancy (`productName`)

Authentication data is isolated per product. Every API request carries a
`productName` key (sent by the web UI from `VITE_PRODUCT_NAME`); access tokens
embed a signed `productName` claim that authenticated request bodies must match.
The same email can register independently in each product. `productName` selects
an account namespace — it does **not** authenticate the calling application.

Per-product settings (JWT audience, token TTLs, frontend base URL, MFA limits,
password hashing cost, upload quotas, email templates, …) are stored in the
database and override deployment defaults.

### Token model

- **Access token** — short-lived RS256 JWT (10 min), held in memory by the SPA
  and sent as `Authorization: Bearer <token>`.
- **Refresh token** — long-lived (30 days absolute / 7 days idle) in the
  `__Host-refresh` HttpOnly cookie. The frontend never reads it; the browser
  forwards it automatically via `credentials: 'include'`. The SPA proactively
  refreshes every ~9 minutes and stays in an `initializing` state on startup
  until the first refresh resolves, avoiding a login-redirect flash.

---

## How the pieces connect

| Concern | Backend (`core`) | Frontend (`web`) |
|---|---|---|
| Base path | context path `/auth-service` on `:10009` | calls `/auth-service/**` (proxied in dev) |
| Auth endpoints | `/v1/auth/*` (register, login, mfa/verify, refresh, logout, sessions, forgot/reset-password) | consumed by `features/auth/services/authService.js` |
| Tenant key | `productName` claim + request-body validation | `VITE_PRODUCT_NAME` on every request |
| CORS | allowed origins in `SecurityConfig` (`:5173`, prod origin) | avoided in dev via proxy; use same-origin proxy in prod |
| Reset links | `base-url` + reset path + `?token=` | serves `/reset-password`, reads `?token=` |

See the two subproject READMEs for the full endpoint tables and the error-format
contract.

---

## Testing

**Backend:**

```bash
cd userAuthentication-core
./mvnw test -Ptest        # unit tests
./mvnw verify -Ptest      # integration tests (Testcontainers)
```

**Frontend:**

```bash
cd userAuthentication-web
npm test                  # Vitest unit/component tests
npm run test:coverage     # coverage report
npm run test:e2e          # Playwright end-to-end tests
```

---

## Building & deployment

**Backend:**

```bash
cd userAuthentication-core
./mvnw clean package -Pprod                 # build JAR
docker build -t identity-service:latest .   # build image
```

Runs as a stateless deployment (multiple replicas, HPA, PDBs, readiness/liveness
probes). Required infrastructure: managed HA PostgreSQL, Redis, S3-compatible
storage, KMS for signing keys, Kong gateway, and SMTP.

**Frontend:**

```bash
cd userAuthentication-web
npm run build             # static SPA → dist/
npm run preview           # preview the production build
```

Serve `dist/` from any static host or CDN. Configure SPA fallback so unknown
paths return `index.html` (e.g. nginx `try_files $uri $uri/ /index.html;`). For
production, route the SPA and API through a **same-origin reverse proxy** — this
eliminates CORS and satisfies the `__Host-` cookie requirements cleanly. See the
frontend README's *Deployment requirements* section for a sample nginx config.

---

## Security notes

- Never expose actuator endpoints publicly — Kong restricts them to internal IPs.
- Use a managed **KMS/HSM** for JWT signing keys in production.
- Enable **TLS everywhere**; set `cookie-secure: true` for any non-localhost
  deployment so the `__Host-refresh` cookie is accepted.
- Rotate secrets regularly (database passwords, JWT keys, encryption keys).
- Monitor audit logs and alert on suspicious patterns.
- Generic auth error responses prevent account enumeration; rate limiting guards
  the auth endpoints.

---

## License

Proprietary — All rights reserved.

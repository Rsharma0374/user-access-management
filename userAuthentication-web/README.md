# userAuthentication-web

React authentication frontend for Guardian Services. Works alongside the Java
backend in `../userAuthentication`.

---

## Contents

- [Quick start](#quick-start)
- [Environment variables](#environment-variables)
- [Development](#development)
- [Testing](#testing)
- [Production build](#production-build)
- [Architecture overview](#architecture-overview)
- [Backend integration](#backend-integration)
- [Deployment requirements](#deployment-requirements)
- [Known gaps](#known-gaps)

---

## Quick start

```bash
cd userAuthentication-web
npm install
npm run dev                      # http://localhost:5173 (dev profile)
```

`npm run dev` loads the committed `dev` profile (`.env.dev`), so it works with
no setup. To override anything for yourself, `cp .env.example .env.local`.

The Vite dev server proxies `/auth-service/**` to `http://localhost:10009`, so
no extra CORS or backend configuration is needed for local development.

---

## Environment variables

All variables are prefixed `VITE_` and are **public** — never put secrets in them.

| Variable | Default | Description |
|---|---|---|
| `VITE_API_BASE_URL` | _(empty)_ | Base URL of the Java backend. Leave empty when using the Vite dev proxy. Set to the full origin (e.g. `https://api.example.com`) for remote targets. |
| `VITE_PRODUCT_NAME` | `default` | Tenant/product identifier required by every backend API call (`productName`). Obtain the correct value from your backend administrator. |
| `VITE_DEBUG_API` | `false` | Set to `true` to log API requests and errors to the browser console. Never enable in production. |

| `VITE_ADMIN_MOCK` | `false` | Set to `true` to force the admin dashboard to use local mock data instead of the backend admin API. |

### Build profiles

Profiles mirror the `dev` / `prod` Maven profiles in `userAuthentication-core`.
Each one is a committed env file selected by Vite's `--mode` flag:

| Command | Profile | File loaded |
|---|---|---|
| `npm run dev` | `dev` | `.env.dev` |
| `npm run build:dev` | `dev` | `.env.dev` |
| `npm run build` | `prod` | `.env.prod` |
| `npm run build:prod` | `prod` | `.env.prod` |
| `npx vite build --mode <profile>` | `<profile>` | `.env.<profile>` |

`npm run build` defaults to the `prod` profile so a plain build is never
accidentally shipped with development settings. You can still pass a profile
explicitly on the command line — it overrides the script default:

```bash
npm run build -- --mode dev
```

Add a new profile by dropping in a matching `.env.<profile>` file; no code or
config change is needed.

### Precedence

Later entries win:

```
.env.<profile>  <  .env.local  <  .env.<profile>.local  <  shell / CI env
```

So a deployment can override any value without editing a committed file, e.g.
`VITE_API_BASE_URL=https://api.example.com npm run build:prod`.

Only `*.local` files are gitignored. The profile files are committed, which is
safe because every `VITE_*` value is inlined into the bundle and therefore
public regardless.

> **Empty values are not defaults.** The code reads these with `??`, which only
> falls back when a variable is *undefined*. Writing `VITE_PRODUCT_NAME=` sets
> it to an empty string and the `'super-admin'` fallback will not apply.
> `VITE_API_BASE_URL=` is the deliberate exception — empty means "same origin",
> which is what the dev proxy relies on.

---

## Development

```bash
npm run dev          # Start Vite dev server on port 5173
npm run lint         # ESLint
npm run lint:fix     # ESLint with auto-fix
```

The Java backend must be running on port 10009 for API calls to succeed. See
`../userAuthentication/README.md` for backend setup instructions.

### Dev proxy

`vite.config.js` proxies all requests matching `/auth-service/**` to
`http://localhost:10009`. This mirrors the production path structure so no code
change is needed between environments.

---

## Testing

```bash
npm test                 # Run all unit/component tests once (CI-safe)
npm run test:watch       # Watch mode for development
npm run test:coverage    # Generate coverage report in coverage/
npm run test:ui          # Vitest browser UI
npm run test:e2e         # Playwright end-to-end tests
```

Tests live in `src/**/__tests__/` (unit/component) and `tests/` (Playwright).

---

## Production build

```bash
npm run build       # Outputs to dist/
npm run preview     # Preview the production build locally
```

The build produces a static SPA. Serve `dist/` from any static host or CDN.
See [Deployment requirements](#deployment-requirements) for infrastructure notes.

---

## Architecture overview

```
src/
├── app/
│   ├── App.jsx          Root component
│   ├── router.jsx       React Router routes + ProtectedRoute / PublicOnlyRoute guards
│   └── providers.jsx    Global provider tree (BrowserRouter → AuthProvider)
├── components/
│   ├── ui/              Reusable design-system components (Button, Input,
│   │                    PasswordInput, Alert, Spinner)
│   └── layout/          AuthLayout (split-panel branding + form card)
├── features/auth/
│   ├── context/         AuthContext — session status, signIn, signOut
│   ├── hooks/           useFormError — bridges server errors into RHF
│   ├── pages/           LoginPage, RegisterPage, ForgotPasswordPage,
│   │                    ResetPasswordPage, DashboardPage
│   ├── services/        authService.js — all backend API calls
│   └── validation/      Zod schemas for every form
├── pages/               NotFoundPage
├── services/
│   └── httpClient.js    Shared fetch wrapper + in-memory token store
└── styles/
    └── globals.css      Tailwind base + component layer
```

**Request flow:**

```
Page → Form (React Hook Form + Zod) → authService → httpClient → Java backend
```

**Session state machine:**

```
initializing ──► authenticated
      │
      └────────► unauthenticated
```

The app stays in `initializing` until the startup `POST /refresh` completes.
This prevents a redirect flash to `/login` before the cookie is checked.

---

## Backend integration

### Endpoints used

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/auth-service/v1/auth/register` | Create account (returns 202; email verify required) |
| `POST` | `/auth-service/v1/auth/email/verify` | Submit email verification token |
| `POST` | `/auth-service/v1/auth/email/resend` | Resend verification email |
| `POST` | `/auth-service/v1/auth/login` | Authenticate; returns access token + sets cookie |
| `POST` | `/auth-service/v1/auth/mfa/verify` | Complete MFA challenge after login |
| `POST` | `/auth-service/v1/auth/refresh` | Rotate refresh token; returns new access token |
| `POST` | `/auth-service/v1/auth/logout` | Revoke current session; clears cookie |
| `POST` | `/auth-service/v1/auth/logout-all` | Revoke all user sessions |
| `GET`  | `/auth-service/v1/auth/sessions` | List active sessions |
| `DELETE` | `/auth-service/v1/auth/sessions/{id}` | Revoke a specific session |
| `POST` | `/auth-service/v1/auth/forgot-password` | Request password reset email |
| `POST` | `/auth-service/v1/auth/reset-password` | Reset password with token |

### Authentication mechanism

The backend uses **JWT Bearer tokens** with an HttpOnly cookie refresh flow:

- **Access token** — short-lived JWT (10 min TTL), stored in memory only, sent
  as `Authorization: Bearer <token>` on authenticated requests.
- **Refresh token** — long-lived (30 days absolute / 7 days idle), stored in
  the `__Host-refresh` HttpOnly cookie set by the backend. The frontend never
  reads its value; it is forwarded automatically via `credentials: 'include'`.

The frontend schedules a proactive refresh every 9 minutes while authenticated.
If the refresh fails (token expired, cookie cleared), the user is redirected to
`/login`.

### Password reset link format

The backend constructs reset links as:

```
<notification.base-url><password-reset-path>?token=<RAW_TOKEN>
```

In the dev config this is:

```
http://localhost:10009/auth-service/reset-password?token=<TOKEN>
```

The frontend serves `/reset-password` and reads `?token=` from the URL. The raw
token is posted directly to `/reset-password` — no additional encoding required.

### productName field

Every request body includes `productName` (from `VITE_PRODUCT_NAME`). This is a
multi-tenant identifier required by `ProductAwareRequest` on the backend. Set it
to the value matching your deployment.

### Error format

```json
{ "message": "Human-readable error", "errors": { "fieldName": "Field-level message" } }
```

`errors` is present only on validation failures (400). The `httpClient` surfaces
`message` as `ApiError.message` and `errors` as `ApiError.errors`.

---

## Deployment requirements

### CORS

The Java backend `SecurityConfig` currently allows these origins:

```
http://localhost:5173
https://kong.guardianservices.in
```

To deploy to a different origin, add it to `CorsConfiguration.allowedOrigins` in
`SecurityConfig.java` — or route the frontend through a same-origin reverse proxy
to avoid CORS entirely (recommended for production).

### Cookie security

The `__Host-refresh` cookie requires `Secure` in production. In the dev config,
`cookie-secure: false` allows it over HTTP. For any non-localhost deployment:

1. Serve the backend and frontend over HTTPS.
2. Set `cookie-secure: true` in `application.yml`.
3. Ensure the `__Host-` prefix requirements are met (Secure flag, no Domain
   attribute, Path=/).

### Same-origin reverse proxy (recommended)

Running the frontend and backend on the same origin (e.g. via nginx) eliminates
CORS and satisfies the `__Host-` cookie requirements cleanly:

```nginx
location /auth-service/ {
    proxy_pass http://localhost:10009/auth-service/;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
}
location / {
    root /srv/www/userAuthentication-web/dist;
    try_files $uri $uri/ /index.html;
}
```

### Serving the SPA

The `dist/` folder is a single-page application. Any 404 from the file system
must serve `index.html` so client-side routing works:

- **nginx:** `try_files $uri $uri/ /index.html;`
- **Apache:** `FallbackResource /index.html`
- **Caddy:** `try_files {path} /index.html`

---

## Known gaps

These features have no corresponding backend endpoint in the inspected codebase
and are therefore not implemented in the frontend:

| Feature | Status | Notes |
|---|---|---|
| User profile / account details API | Not implemented | No `GET /v1/auth/profile` or equivalent endpoint found. |
| Password change from dashboard | UI wired for sign-out only | `POST /v1/auth/change-password` exists but requires the current authenticated user from the security context; the full flow is not exposed via a dedicated profile page in this frontend. |
| Email change confirmation page | Not implemented | Backend sends email with a link to `/confirm-email-change?token=XXX`; no frontend page handles this route yet. Add `ConfirmEmailChangePage` if needed. |
| Social / OAuth login | Not implemented | Not supported by the backend. |
| Persistent "remember me" sessions | Not implemented | Intentionally excluded; the refresh token's 30-day absolute TTL handles session persistence without storing tokens in browser storage. |
| MFA enrollment UI | Not implemented | `POST /v1/auth/mfa/enroll` and `POST /v1/auth/mfa/confirm` exist but MFA management screens are out of scope for the initial authentication frontend. |
| Automatic TOTP recovery code regeneration | Not implemented | Endpoint exists; requires a dedicated account settings page. |

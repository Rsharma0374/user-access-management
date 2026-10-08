# userAuthentication-web — Architecture

> This document describes the frontend architecture. For backend architecture see
> `../userAuthentication/architecture.md`.

---

## 1. Overview

`userAuthentication-web` is a React single-page application that provides
login, registration, forgot-password, and reset-password screens for the
Guardian Services identity platform. It integrates with the existing Java Spring
Boot backend in `../userAuthentication` without modifying any backend files.

---

## 2. Technology stack

| Concern | Choice | Version |
|---|---|---|
| UI library | React (JSX, no TypeScript) | 18.x |
| Build tool | Vite | 5.x |
| Routing | React Router | 6.x |
| Styling | Tailwind CSS + design tokens | 3.x |
| Forms | React Hook Form | 7.x |
| Validation | Zod + @hookform/resolvers | 3.x |
| HTTP | Native Fetch via shared client | — |
| Auth state | React Context + useReducer | — |
| Unit/component tests | Vitest + React Testing Library | 2.x |
| API mocking | MSW (Mock Service Worker) | 2.x |
| Browser tests | Playwright | 1.x |

---

## 3. Folder structure

```
src/
├── app/                    Application layer
│   ├── App.jsx             Root — composes Providers + AppRouter
│   ├── providers.jsx       Global provider tree
│   └── router.jsx          Route definitions + guards
│
├── assets/                 Static assets (if any)
│
├── components/
│   ├── ui/                 Design-system primitives
│   │   ├── Alert.jsx       Status banners (error / success / info / warning)
│   │   ├── Badge.jsx       Status / label pill (success / error / purple / …)
│   │   ├── Button.jsx      Primary / secondary / ghost / danger variants
│   │   ├── Input.jsx       Labelled text input with error + hint support
│   │   ├── Modal.jsx       Accessible portal dialog (focus trap, Esc, backdrop)
│   │   ├── PasswordInput.jsx  Input with show/hide toggle
│   │   ├── Select.jsx      Labelled native <select> with error + hint support
│   │   ├── Skeleton.jsx    Loading shimmers (card / table-row variants)
│   │   ├── Spinner.jsx     Accessible loading indicator
│   │   ├── Toast.jsx       App-wide toast notifications (ToastProvider/useToast)
│   │   └── Toggle.jsx      Accessible switch (role="switch"), used for MFA
│   └── layout/
│       └── AuthLayout.jsx  Split-panel desktop / single-column mobile
│
├── features/admin/         Super-admin dashboard feature module
│   ├── components/
│   │   ├── ProductSwitcher.jsx        Top-bar product context dropdown
│   │   ├── ProductOverviewGrid.jsx    Summary cards (users, MFA adoption)
│   │   ├── UserTable.jsx              Searchable/filterable user table + MFA toggle
│   │   ├── CreateUserModal.jsx        Create-user form (RHF + Zod)
│   │   ├── MfaConfirmationDialog.jsx  Safeguard confirm before MFA change
│   │   └── MockDataBanner.jsx         Visible banner when mock data is in use
│   ├── context/
│   │   └── ProductContext.jsx         Active product + product list state
│   ├── pages/
│   │   └── AdminDashboardPage.jsx     Orchestrates the whole dashboard
│   ├── services/
│   │   ├── adminService.js            Admin API calls + 404→mock fallback
│   │   └── mockData.js                Static mock products/users
│   └── validation/
│       └── schemas.js                 createUserSchema (Zod)
│
├── features/auth/          Authentication feature module
│   ├── context/
│   │   └── AuthContext.jsx Session state machine + signIn / signOut actions
│   ├── hooks/
│   │   └── useFormError.js Bridge server errors into React Hook Form
│   ├── pages/
│   │   ├── LoginPage.jsx
│   │   ├── RegisterPage.jsx
│   │   ├── ForgotPasswordPage.jsx
│   │   └── ResetPasswordPage.jsx
│   │   (the authenticated landing is features/admin/pages/AdminDashboardPage.jsx)
│   ├── services/
│   │   └── authService.js  All API calls; maps to backend contracts
│   └── validation/
│       └── schemas.js      Zod schemas for every form
│
├── pages/
│   └── NotFoundPage.jsx
│
├── services/
│   └── httpClient.js       Shared fetch wrapper + in-memory token store
│
├── styles/
│   └── globals.css         Tailwind directives + base/component layers
│
└── test/
    └── setup.js            Vitest global setup (jest-dom matchers + MSW)
```

---

## 4. Layer responsibilities

### Application layer (`src/app/`)

Configures routing, mounts global providers, and defines route guards. Contains
no business logic.

### Presentation layer (`src/components/`)

Renders accessible, reusable controls. UI components must not contain endpoint
URLs or backend-specific response parsing. They receive data and callbacks as
props only.

### Feature layer (`src/features/auth/`)

Owns authentication forms, local form state, workflow-specific interactions, and
session context. Pages compose UI components and delegate API work to
`authService`.

### Service layer (`src/services/`, `src/features/auth/services/`)

`httpClient.js` — single `fetch` wrapper handling headers, credentials, error
normalisation, and the in-memory access token. No component imports `fetch`
directly.

`authService.js` — the only file that knows endpoint paths, request field names,
and response shapes. All backend-specific logic lives here.

---

## 5. Request flow

```
Page component
  └─► React Hook Form (local form state)
        └─► Zod schema validation
              └─► authService.js  (endpoint mapping, request shaping)
                    └─► httpClient.js  (fetch, credentials, headers, error normalisation)
                          └─► Java backend  (Spring Boot, port 10009, /auth-service)
```

---

## 6. Authentication state machine

```
          ┌─────────────────────────────────────────────────────────┐
          │                   AuthContext                           │
          │                                                         │
          │   'initializing' ──► POST /refresh success ──► 'authenticated'
          │         │                                               │
          │         └──────── POST /refresh fails ────► 'unauthenticated'
          │                                                         │
          │   'authenticated' ─── signOut / token expired ──► 'unauthenticated'
          └─────────────────────────────────────────────────────────┘
```

The three-state model (`initializing` / `authenticated` / `unauthenticated`)
prevents the app from redirecting to `/login` before the initial refresh
completes, avoiding a UX flash.

---

## 7. Security design

### Token storage

| Token | Storage | Rationale |
|---|---|---|
| Access token (JWT) | JavaScript `let` variable (module scope) | Never persisted; lost on page reload; refreshed automatically |
| Refresh token | HttpOnly cookie (`__Host-refresh`) | Set by backend; inaccessible to JS; sent automatically by browser |

Passwords are never stored or logged. Form state is cleared on successful
submission.

### CSRF

The backend disables CSRF (`csrf.disable()`) because it uses stateless JWT
authentication. No CSRF token is required from the frontend.

### Token rotation

The backend uses refresh-token rotation with replay detection. If a consumed
refresh token is presented again, the entire session family is revoked. The
frontend handles 401 responses from `/refresh` by redirecting to `/login`.

### Client-side validation

Client-side Zod validation improves UX but does not replace server-side
enforcement. Password policy, rate limiting, and token expiry are enforced
exclusively by the backend.

### Route guards

`ProtectedRoute` and `PublicOnlyRoute` are UX conveniences, not security
controls. The backend enforces authorisation on every API request.

---

## 7a. Super-admin dashboard (`src/features/admin/`)

The authenticated landing (`/dashboard`) is a multi-product admin dashboard.

**Data flow & graceful degradation.** `adminService.js` is the only file that
knows the admin endpoint paths. Each call tries the real backend first and falls
back to `mockData.js` **only** on a 404 / network error (endpoint not yet live),
or when `VITE_ADMIN_MOCK=true`. Every mock response carries `{ _mock: true }` so
the UI can surface a visible `MockDataBanner` — a mocked operation is never
reported as a real one.

```
AdminDashboardPage  (owns all data fetching + dialog state)
  ├─ ProductContext        active product + product list
  ├─ ProductSwitcher       top-bar context switcher
  ├─ ProductOverviewGrid   per-product cards (users, MFA adoption %)
  ├─ UserTable             search (debounced) + MFA filter + per-row MFA toggle
  ├─ CreateUserModal       RHF + Zod (createUserSchema), product pre-selected
  └─ MfaConfirmationDialog safeguard confirm before any MFA change
```

Endpoints (under `/auth-service/v1/admin`):
`GET /products`, `GET /users?productName&search&mfaFilter`, `POST /users`,
`PATCH /users/:id/mfa`.

**MFA toggle RBAC (strict).** The per-user MFA toggle is interactive **only**
when the session is super-admin (`isSuperAdminClaims` — `productName ===
'super-admin'` or `SUPER_ADMIN` in `roles`). For everyone else the toggle is
`disabled` with the tooltip *"Only Super Admins can modify MFA settings."* A
confirmation dialog gates every change. As with route guards, this is a UX
control only — the backend remains the authoritative enforcement point on the
`PATCH /users/:id/mfa` endpoint.

---

## 8. Responsive design

| Breakpoint | Layout |
|---|---|
| `< 1024px` | Single-column, full-width form card, no branding panel |
| `≥ 1024px` | Split panel: indigo branding column (41%) + form column (59%) |
| `≥ 1280px` | Split panel: wider branding column (44%) |

Tailwind uses mobile-first utilities. No horizontal scrolling at any viewport.

---

## 9. Accessibility targets

- WCAG 2.2 Level AA colour contrast (verified with Tailwind token ratios)
- All interactive elements reachable and operable by keyboard
- Visible `:focus-visible` indicator (2px brand ring + 2px offset)
- Persistent `<label>` for every input (placeholder never replaces label)
- `aria-invalid`, `aria-describedby`, `aria-required` on form fields
- `role="alert"` on error messages, `role="status"` on informational messages
- `aria-busy`, `aria-disabled` on loading buttons
- `aria-label`/`aria-pressed` on password show/hide toggle
- `prefers-reduced-motion` respected via CSS `@media` query
- `autocomplete` attributes set appropriately on all credential fields

> Full WCAG compliance requires manual testing with assistive technologies and
> an expert accessibility review.

---

## 10. Testing strategy

| Layer | Tool | Coverage |
|---|---|---|
| Zod schemas | Vitest | Valid/invalid inputs, boundary values |
| httpClient | Vitest + MSW | Status codes, error shapes, token store |
| authService | Vitest + MSW | All endpoint mappings, success + error paths |
| AuthContext | Vitest + RTL | initializing → authenticated/unauthenticated, signIn, signOut |
| LoginPage | Vitest + RTL | Validation, submit, MFA step, server errors |
| RegisterPage | Vitest + RTL | Validation, success confirmation, resend flow |
| ForgotPasswordPage | Vitest + RTL | Neutral confirmation, server error |
| ResetPasswordPage | Vitest + RTL | Missing token, expired token, success |
| admin createUserSchema | Vitest | Email, password strength, role, product required |
| admin UserTable | Vitest + RTL | MFA toggle RBAC (super-admin vs not), aria-checked, search |
| E2E flows | Playwright | Full login, registration, password reset journeys |

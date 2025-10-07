# Fuhrpark Manager – System Architecture

## 1. Overview
- **Goal:** Multi-tenant fleet management SaaS covering vehicle lifecycle, services, repairs, scheduling, billing and admin oversight.
- **Stack:** Next.js (App Router, TypeScript), Tailwind CSS, Zustand, React Hook Form + Zod, next-intl; NestJS backend with Prisma ORM on MySQL; Redis + BullMQ for jobs; JWT auth; Stripe billing; Dockerized deploy; GitHub Actions CI/CD.
- **Tenancy:** Row-level multi-tenancy with tenant scoped data and role-based permissions (OWNER, MANAGER, MECHANIC, VIEWER). SUPERADMIN operates platform-wide admin.

## 2. High-Level Architecture
- **Frontend (Next.js)**
  - App Router with `/[locale]/(tenant)` structure and `/admin` section for SUPERADMIN.
  - Shared `providers` for auth session, intl, Zustand store and design tokens (dark mode default).
  - CRM layout: left rail navigation, content area, top actions, responsive down to mobile, WCAG 2.1 AA.
  - UI kit built atop Headless UI + Tailwind (components: navigation, tables, forms, date pickers, cards, charts, notifications).
  - State management: Zustand slices (vehicles, services, notifications, billing, settings). React Query optional for server cache.

- **Backend (NestJS)**
  - Modular domain driven structure (`auth`, `tenants`, `vehicles`, `services`, `repairs`, `appointments`, `billing`, `notifications`, `admin`, `files`, `jobs`).
  - REST API documented via OpenAPI (`/api/docs`).
  - Prisma for MySQL schema management. Redis/BullMQ for queues.
  - Event bus (Nest EventEmitter) for cross-module reactions (e.g., service due triggers notifications & emails).
  - Background job runners for scheduled tasks (`DailyChecker`, `AppointmentDigest`, `Cleanup`, `MonthlyDigest`, `BillingReconcile`, `MailBounceSync`).

- **Infrastructure**
  - Docker Compose development stack (`web`, `api`, `db`, `redis`, `worker`, `mailhog`).
  - Production: containerized deploy (e.g., ECS/Kubernetes). S3-compatible storage (MinIO in dev).
  - GitHub Actions for lint/test/build; integration tests via Playwright (frontend) and Pact-like contract tests for API.

## 3. Authentication & Authorization
- **Auth Flow:** Email/password registration + login. HttpOnly access/refresh JWT pair with short-lived access token; refresh rotation. Optional OAuth providers (Google, Microsoft) via NextAuth in frontend and backend callbacks.
- **RBAC:** Policy-based guards in NestJS leveraging Prisma middleware. Tenant-scoped roles stored in `TenantMembership`. SUPERADMIN flag on user for platform admin.
- **Security:** Helmet/CSP, rate limiting (per IP + per tenant), IP whitelist option, audit logging for every mutating action (tenant + admin). 2FA enforcement (TOTP) stored per user.

## 4. Data Model (Prisma Overview)
- `User`, `Tenant`, `TenantMembership`, `SubscriptionPlan`, `Subscription`, `Vehicle`, `VehicleMileage`, `VehicleTUV`, `TireSet`, `ServiceType`, `VehicleServiceSchedule`, `ServiceEntry`, `RepairEntry`, `RepairDocument`, `Appointment`, `Notification`, `NotificationPreference`, `AuditLog`, `FeatureFlag`, `WebhookEndpoint`, `WebhookEvent`, `ServicePartnerSetting`, `JobRun`, `BillingEvent`.
- **Key Constraints**
  - Mileage entries strictly increasing via DB constraints + service validation.
  - Repair/Service entries reference current `VehicleMileage` snapshot to enforce non-decreasing kilometers.
  - Subscription enforcement via DB triggers/service layer (Starter limit ≤5 active vehicles).
  - Soft delete with `deleted_at` on most entities for auditability.

## 5. Core Domain Flows
- **Vehicle Management:** CRUD with CSV import/export. Mileage updates create `VehicleMileage` records. TÜV updates tracked in `VehicleTUV`.
- **Service & Repair:** `ServiceEntry` (maintenance) and `RepairEntry` (issue fixes) share attachments. Ampel status derived from `next_due_date/km` vs tenant lead days. PDF export built server-side (NestJS + `pdf-lib`) with branded template.
- **Appointments:** Created when services near due (orange/red). Automatically email service partner via SMTP (nodemailer) with ICS attachment; optional CC to assigned driver.
- **Notifications:** In-app (persisted) plus email. Preferences per user; daily cron populates queue.
- **Billing:** Stripe subscription products for Trial/Starter/Pro. Webhooks processed via `billing` module. Trial auto-expiry triggers role update (read-only). Downgrade rules enforced by service + background audits.
- **Admin:** `/admin` area surfaces KPIs (MRR, ARPA, churn, usage), tenant management with impersonation (guarded + audit log), user resets, queue dashboards, system health probes.

## 6. Internationalization & Accessibility
- `next-intl` for `de`/`en`. Content stored in `messages/{locale}.json`.
- Tailwind design tokens for high-contrast themes; focus states, ARIA labels, semantic HTML, keyboard shortcuts. Date/time localized. PDF export localized as well.

## 7. Testing Strategy
- **Unit Tests:** Jest for backend modules; React Testing Library for components.
- **Integration Tests:** Prisma test DB, API contract tests via Supertest. Playwright e2e for key flows (vehicle CRUD, mileage rule, appointment request, admin impersonation).
- **Background Jobs:** Simulated scheduler tests with BullMQ Test harness.
- **Security:** Automated dependency scanning (Dependabot), ESLint security rules, OWASP dependency check in CI.

## 8. Observability & Ops
- Structured logging (Pino) with correlation IDs per request.
- Metrics via Prometheus exporter (Nest + Next instrumentation). Dashboard in Grafana.
- Alerting on queue latency, email failures, billing webhooks errors.
- Backups for MySQL + S3 nightly (documented runbooks).

## 9. Roadmap & Next Steps
1. Scaffold repository (monorepo via Turborepo or pnpm workspaces).
2. Implement core auth & tenant management.
3. Deliver vehicle + service domain MVP with ampelsystem.
4. Build appointment flow + notifications.
5. Expand billing + admin dashboards.
6. Harden security, jobs, and reporting.
7. Polish UI, accessibility audits, internationalization completeness.


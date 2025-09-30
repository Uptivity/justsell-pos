# Stack Guides (select per Architecture/ADR)

## Laravel 11 + MySQL (DigitalOcean; AWS S3/DO Spaces)
- Build: composer install -> Pint -> PHPStan -> PHPUnit.
- Security: Sanctum/Passport; policies/gates; Storage::disk("s3") with private buckets and signed URLs.
- Ops: Redis queue; Horizon metrics; separate S3 buckets per environment.

## Node.js / TypeScript API
- Build: npm ci -> lint -> typecheck -> tests; Supertest integration.
- Security: Helmet; CORS allow-list; Zod/Yup schemas; JWT rotation; mTLS internal.
- Perf: Autocannon/k6; p95 latencies budgeted.

## React Web / PWA
- Build: lint -> test (Vitest) -> build; Playwright E2E; Lighthouse CI.
- PWA: manifest + SW; offline fallbacks; cache bust on deploy.

## React Native / Expo
- Jest/RTL; Detox/EAS (if feasible); secure token storage; OTA policy.

## Electron + React (if used)
- ContextIsolation; no nodeIntegration; signed releases; Spectron/Playwright.
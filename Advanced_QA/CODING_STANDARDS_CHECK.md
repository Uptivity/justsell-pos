# Coding Standards Check
## Universal
- EditorConfig (CRLF ok), UTF-8; lint-staged + Husky; Conventional Commits.
## Laravel 11 (PHP 8.3)
- PSR-12 (Pint), PHPStan L7+, PHPUnit >=80% critical paths, strict types.
- Policies/Gates on mutations; mass-assignment tests; migrations idempotent.
## Node.js / TypeScript
- TS strict; ESLint + Prettier clean; Jest/Vitest >=80%; tsc --noEmit.
## React (Web/PWA)
- RTL tests; Playwright E2E with data-testid; Storybook a11y; perf budgets.
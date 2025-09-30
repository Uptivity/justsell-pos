# Playwright QA Suite Plan
## Conventions
- Use stable data-testid (kebab-case) only; avoid brittle selectors.
## Scenarios
- Auth happy/edge (lockout, reset, MFA, expiry); RBAC per role.
- Critical CRUD (create/edit/list/delete with search/pagination).
- Payments/refunds (sandbox), webhooks idempotent; file upload (AV), downloads.
- a11y smoke (axe); perf smoke via Lighthouse; cross-browser + dark-mode.
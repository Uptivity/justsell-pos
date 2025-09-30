# CI/CD Quality Gates (GitHub Actions)
## Pull Request
- Build compiles; lint/format clean; unit/component tests >= thresholds.
- SAST/SCA no High/Critical; Lighthouse budgets pass; bundle size within limits.
## Merge to main (staging)
- Integration tests on staging; DB migrations dry-run; Playwright E2E green; SBOM/provenance.
## Promote to production
- Manual approval on protected environment; change freeze respected; canary percent set.
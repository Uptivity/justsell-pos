# QA Pack - Overview

Enterprise QA system of record for multi-stack apps (Laravel 11/PHP, Node.js/TS, React Web/PWA, React Native, Electron).

## How to use
1) Consult STACK_GUIDES.md and your Architecture/ADR to pick the right stack sections.
2) On each PR, run CI quality gates. On merge, auto-deploy to test, promote to staging, then to production when green.

## Files
- PROJECT_VALIDATION.md
- CODING_STANDARDS_CHECK.md
- SECURITY_CHECKLIST.md
- API_HARDENING_TESTS.md
- SMS_EMAIL_ANTIFRAUD.md
- PERFORMANCE_TEST_PLAN.md
- RELIABILITY_DR_CHECK.md
- COMPLIANCE_PRIVACY.md
- PLAYWRIGHT_QA_SUITE_PLAN.md
- CI_CD_QUALITY_GATES.md
- THREAT_MODEL.md
- ACCESSIBILITY_CHECKLIST.md
- OBSERVABILITY_CHECKLIST.md
- SUPPLY_CHAIN_SECURITY.md
- SECRETS_MANAGEMENT.md
- PARTNER_INTEGRATION_RISK.md
- RANSOMWARE_RESILIENCE_PLAYBOOK.md
- RELEASE_READINESS.md
- STACK_GUIDES.md
- DOCKER_GUIDE.md
- ARCHITECTURE_CONFORMANCE.md
- UI_CROSS_BROWSER_THEME.md

## Environments
- test -> staging -> production (live) via GitHub Actions.
- Hosting: DigitalOcean (Droplets/App Platform), storage on AWS S3/DO Spaces; optional Vercel for web front-ends.
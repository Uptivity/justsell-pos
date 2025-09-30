# Architecture Conformance (Template)
## Verify stack vs ADR
- DB engine, queues, storage (AWS S3/DO Spaces), auth scheme, messaging, CDN.
## Automated checks
- Unit test verifies DB driver; grep migrations for non-portable features.
- Composer/npm scans forbid disallowed libs (e.g., wrong DB adapters).
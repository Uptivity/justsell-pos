# API Hardening Tests
- OAuth2/OIDC or signed sessions; short-lived JWT + rotating refresh; scopes.
- mTLS/private networks for sensitive partner APIs; HMAC webhooks + timestamp.
- Rate limits (user/IP/token) + Retry-After; idempotency keys on POST/PUT.
- Pagination cap; input size/depth limits; gzip bombs blocked.
- Partner isolation (per-key tenant); circuit breakers; egress allow-list.
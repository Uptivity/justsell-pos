# Security Checklist (OWASP ASVS aligned)
- Headers: CSP, HSTS, X-Content-Type-Options, Referrer-Policy.
- Input validation (allow-lists), output encoding; CSRF on state changes.
- Auth: MFA (admin required), session fixation defense, password breach checks.
- RBAC/ABAC deny-by-default; server-side checks; audit logs (actor/time/IP/UA).
- TLS 1.2+ end-to-end; PII at-rest encryption; secrets out of repo and rotated.
- Ransomware-aware: immutable/backed-up snapshots; EDR; integration kill-switch.
- Infra: IaC scanned; dependencies pinned and signed; SCA/SAST/DAST gates.
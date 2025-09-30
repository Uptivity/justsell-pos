# Threat Model (STRIDE-lite)
- System diagram and trust boundaries (web, API, DB, third parties).
- Spoofing: MFA; signed cookies/JWT; mTLS internal.
- Tampering: input validation; checksums; WORM logs.
- Repudiation: time-synced audit logs; immutable storage.
- Info Disclosure: PII encryption; access reviews; field masking.
- DoS: rate limits; autoscale; circuit breakers.
- Elevation: least privilege; code reviews on authz; partner-compromise blast radius.
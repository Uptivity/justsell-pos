# SMS and Email Anti-Fraud
- Deny/allow patterns (including high-risk ranges such as +44 1534 if your policy).
- HLR/number lookup; rate limits per user/IP/destination; warm-up new senders.
- Content scanning (known scam URLs/keywords); link wrapping allow-list; no open redirects.
- Unsubscribe and complaint loops honored; suppression lists; DMARC/SPF/DKIM set.
- Tests cover unicode homoglyphs/zero-width/punycode bypass attempts.
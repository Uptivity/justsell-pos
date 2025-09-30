# Performance Test Plan
- Web Vitals (4G mobile): LCP <= 2.5s, INP <= 200ms, CLS <= 0.1.
- API: p50 <= 150ms, p95 <= 400ms; error rate <= 0.1%; DB queries p95 <= 50ms; no N+1.
- Tests: Load/Stress/Spike/Soak; k6/Artillery; Lighthouse CI; WebPageTest.
- CI fails on budget regression; seed prod-like data with billing disabled.
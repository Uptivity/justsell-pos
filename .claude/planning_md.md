# JustSell POS System - Technical Planning & Architecture

## 🎯 Project Mission
Build a **secure, compliant, and user-friendly PWA POS system** for the US vape/smokes retail vertical that can handle complex regulatory requirements while providing excellent UX that matches Clover's familiarity but exceeds its capabilities.

## 🏗️ Architecture Overview

### Technology Stack
```yaml
Frontend:
  - React 18+ with TypeScript (strict mode)
  - Vite for build tooling and dev server
  - Tailwind CSS + Headless UI for components
  - PWA capabilities with Workbox
  - Framer Motion for animations

Backend:
  - Node.js 20+ with Express.js
  - TypeScript throughout
  - PostgreSQL 15+ with Prisma ORM
  - Redis for session management and caching
  - JWT authentication with refresh tokens

Testing:
  - Jest + Testing Library for unit tests
  - Playwright for E2E testing
  - Supertest for API testing
  - Security scanning with Snyk/OWASP ZAP

Hardware Integration:
  - Square Terminal API (primary)
  - Stripe Terminal SDK (secondary)
  - Generic USB HID device support
  - Bluetooth peripheral connections
```

### Application Structure
```
src/
├── admin-app/          # Administrative interface
│   ├── components/     # Admin-specific components
│   ├── pages/         # Admin screens
│   ├── hooks/         # Admin business logic
│   └── services/      # Admin API calls
├── pos-app/           # Point-of-sale interface
│   ├── components/    # POS-specific components
│   ├── pages/         # POS screens
│   ├── hooks/         # POS business logic
│   └── services/      # POS API calls
├── shared/            # Common code between apps
│   ├── components/    # Reusable UI components
│   ├── hooks/         # Shared business logic
│   ├── types/         # TypeScript definitions
│   ├── utils/         # Helper functions
│   └── constants/     # App constants
├── api/               # Backend services
│   ├── routes/        # Express route handlers
│   ├── controllers/   # Business logic
│   ├── services/      # Core business services
│   ├── middleware/    # Auth, validation, logging
│   ├── models/        # Database models (Prisma)
│   └── utils/         # Backend utilities
└── tests/             # Test suites
    ├── unit/          # Unit tests
    ├── integration/   # API integration tests
    └── e2e/           # End-to-end tests
```

## 🔒 Security Standards (NON-NEGOTIABLE)

### Authentication & Authorization
- JWT tokens with 15-minute expiry + refresh tokens
- Role-based access control (RBAC)
- Password hashing with bcrypt (12+ rounds)
- Session management with Redis
- Multi-factor authentication for admin users

### Data Protection
- All sensitive data encrypted at rest (AES-256)
- TLS 1.3 for all communications
- PCI-DSS Level 1 compliance
- No credit card data storage (tokenization only)
- GDPR-compliant data handling

### Input Validation
- All inputs validated and sanitized
- SQL injection prevention
- XSS protection with Content Security Policy
- Rate limiting on all endpoints
- CSRF protection

## 🎨 UI/UX Standards

### Design Principles
1. **Clover Familiarity:** Match Clover's workflow patterns
2. **Modern Enhancement:** Improve visual design and responsiveness
3. **Accessibility First:** WCAG 2.1 AA compliance
4. **Mobile-First:** Responsive design for all screen sizes
5. **Performance:** <2s load times, 60fps interactions

### Component Standards
- All interactive elements must have data-testid attributes
- Consistent spacing using 8px grid system
- Standardized color palette with semantic naming
- Typography scale optimized for retail environments
- Dark/light mode support

### Animation Guidelines
- Subtle transitions (200-300ms duration)
- Easing functions: ease-out for entrances, ease-in for exits
- Reduce motion for accessibility preferences
- Loading states for all async operations

## 📊 Database Schema Principles

### Core Tables
- **Users:** Employee accounts with role-based permissions
- **Customers:** Customer profiles with loyalty data
- **Products:** Inventory with compliance attributes
- **Transactions:** Complete transaction records
- **Compliance_Rules:** Dynamic regulatory configurations
- **Age_Verification_Logs:** Audit trail for compliance

### Data Integrity
- Foreign key constraints enforced
- Audit trails for all financial transactions
- Soft deletes for critical data
- Regular automated backups
- Point-in-time recovery capability

## 🧪 Testing Standards

### Test Coverage Requirements
- **Unit Tests:** 90%+ coverage for business logic
- **Integration Tests:** All API endpoints tested
- **E2E Tests:** Complete user workflows covered
- **Security Tests:** OWASP Top 10 vulnerabilities checked
- **Performance Tests:** Load testing for 1000+ concurrent users

### Test-Driven Development Process
1. Write failing tests first
2. Implement minimal code to pass tests
3. Refactor while keeping tests green
4. Commit only when all tests pass
5. No exceptions for financial/compliance code

## 🚀 Performance Standards

### Frontend Performance
- First Contentful Paint < 1.5s
- Largest Contentful Paint < 2.5s
- Cumulative Layout Shift < 0.1
- First Input Delay < 100ms
- Bundle size < 500KB gzipped

### Backend Performance
- API responses < 200ms (p95)
- Database queries < 50ms (p95)
- Payment processing < 2s end-to-end
- Memory usage < 512MB per instance
- CPU usage < 70% under normal load

## 🔧 Hardware Integration Standards

### Payment Terminals
- Square Terminal API (primary integration)
- Stripe Terminal SDK (fallback option)
- EMV chip card support
- Contactless payment support
- Error handling and retry logic

### Peripheral Devices
- Barcode scanners (USB HID)
- Receipt printers (ESC/POS protocol)
- Cash drawers (trigger via receipt printer)
- ID scanners (VapeTM, Apt-Verify APIs)
- Scale integration for weight-based products

## 📝 Code Standards

### TypeScript Guidelines
- Strict mode enabled
- No `any` types allowed
- Interface definitions for all data structures
- Proper error type definitions
- Generic type constraints where appropriate

### React Best Practices
- Functional components only
- Custom hooks for business logic
- Proper dependency arrays in useEffect
- Memoization for expensive computations
- Error boundaries for crash prevention

### API Design Standards
- RESTful endpoints with proper HTTP methods
- Consistent JSON response format
- Proper HTTP status codes
- Comprehensive error messages
- API versioning strategy

## 🏃‍♂️ Development Workflow

### Git Strategy
- Feature branches for all development
- Conventional commits for clear history
- Pre-commit hooks for linting and testing
- Squash merges to main branch
- Automated CI/CD pipeline

### Code Review Process
- All code reviewed by sub-agents before merge
- Security review for all payment/auth code
- Performance review for database queries
- UI/UX review with visual regression testing
- Documentation updates required

## 🔍 Monitoring & Observability

### Application Monitoring
- Real-time error tracking (Sentry)
- Performance monitoring (Web Vitals)
- User session recordings for UX analysis
- API response time monitoring
- Database query performance tracking

### Business Metrics
- Transaction success rates
- Average transaction time
- Customer satisfaction scores
- System uptime and availability
- Compliance audit trail completeness

## 📱 PWA Requirements

### Service Worker Features
- Offline transaction queuing
- Background sync for pending operations
- Push notifications for critical alerts
- Automatic app updates
- Caching strategy for static assets

### Native App Features
- Add to home screen prompting
- Full-screen experience
- Hardware access (camera, etc.)
- Bluetooth device connections
- Local storage for offline operations

## 🎯 Success Criteria

### Technical Milestones
- [ ] All tests passing with 90%+ coverage
- [ ] Security audit with zero critical vulnerabilities
- [ ] Performance benchmarks met
- [ ] PWA audit score > 90
- [ ] Accessibility audit score > 95

### Business Milestones
- [ ] Age verification system 100% accurate
- [ ] Tax calculations verified for all US states
- [ ] Payment processing under 3 seconds
- [ ] UI matches Clover workflow patterns
- [ ] Hardware integration with 3+ device types

## 🚨 Critical Reminders

1. **This is a financial application** - security cannot be compromised
2. **Regulatory compliance is law** - all rules must be configurable
3. **Test everything twice** - financial bugs cost real money
4. **Document all decisions** - compliance audits require paper trails
5. **Performance matters** - slow POS systems lose customers
# JustSell POS System - Claude Code Project

## 🔄 Project Awareness & Context
- **Always read `PLANNING.md`** at the start of a new conversation to understand the project's architecture, goals, style, and constraints.
- **Check `TASKS.md`** before starting a new task. If the task isn't listed, add it with a brief description and today's date.
- **Use consistent naming conventions, file structure, and architecture patterns** as described in `PLANNING.md`.
- **This is a FINANCIAL POS APPLICATION** - security, compliance, and testing are non-negotiable.

## Project Overview

**Project Name:** JustSell Point-of-Sale System (PWA)  
**Client:** Uptivity.co.uk  
**Industry:** US Vape/Smokes Retail Vertical  
**Application Type:** Progressive Web App (PWA) with Hardware Integration  
**Development Approach:** Modular AI-driven development with comprehensive testing

## Context & Objectives

### Background
- Uptivity.co.uk operates "JustSell" e-commerce platform with strong US vape market presence
- Clover POS is off-boarding vape clients, creating market opportunity
- Need specialized POS solution for highly regulated vape/smokes industry

### Primary Goals
1. **Regulatory Compliance:** Full compliance with federal, state, and local vape regulations
2. **Seamless Transition:** Easy migration path for existing Clover users
3. **Industry-Specific Features:** Age verification, tax calculations, loyalty management
4. **Security:** PCI-DSS compliant payment processing for high-risk industry

### Target Users
- Existing JustSell customers transitioning from Clover
- New vape/smokes retailers seeking compliant POS solution

## Core Features & Requirements

### Critical Compliance Features
- **Dynamic Age Verification:** 21+ federal, state-specific rules (e.g., 30+ ID requirement)
- **Product Restrictions:** Flavor bans, synthetic nicotine restrictions by jurisdiction
- **Complex Tax Engine:** Per-mL, percentage-based, per-cartridge excise taxes
- **PACT Act Reporting:** Automated compliance reports and record-keeping

### Business Features
- **AI-Driven Loyalty System:** Personalized offers based on purchase history
- **Inventory Management:** Use-by date tracking, FEFO/FIFO allocation
- **Advanced Reporting:** Sales, compliance, inventory, customer analytics
- **Multi-Payment Support:** Cash, cards, contactless, gift cards

## Technical Architecture

### Technology Stack
- **Frontend:** React with TypeScript for type safety
- **Backend:** Node.js with Express.js
- **Database:** PostgreSQL with JSONB for flexible compliance data
- **Authentication:** JWT-based secure authentication
- **Payment Processing:** Square Terminal API / Stripe Terminal integration
- **Testing:** Jest (unit), Playwright (E2E), automated security scanning

### Application Structure
- **Admin Application:** Product/customer/settings management
- **POS Application:** Sales processing, age verification, payments
- **Shared Components:** Reusable UI components and utilities

### Security Requirements
- **PCI-DSS Compliance:** No raw card data storage
- **Data Encryption:** At rest and in transit
- **Input Validation:** Comprehensive sanitization
- **Audit Trails:** Complete transaction and verification logging

## Development Instructions for Claude

### Autonomy Guidelines
1. **Self-Sufficiency:** Execute tasks without constant human approval
2. **Quality Assurance:** Use sub-agents for code review, security auditing, testing
3. **Iterative Improvement:** Test, identify issues, fix, retest until passing
4. **Progress Reporting:** Update task status and provide completion summaries

### Code Standards
- **TypeScript:** Use strict typing throughout
- **React Best Practices:** Functional components, hooks, proper state management
- **Security First:** OWASP compliance, input validation, secure coding practices
- **Testing:** Minimum 80% code coverage, comprehensive E2E scenarios
- **Accessibility:** WCAG 2.1 AA compliance, proper semantic HTML

### UI/UX Guidelines
- **Clover-Inspired Design:** Familiar workflow patterns for easy transition
- **Modern Improvements:** Enhanced visual design, better responsive layout
- **Accessibility:** Screen reader support, keyboard navigation
- **Performance:** Fast load times, smooth interactions

### Testing Requirements
- **Unit Tests:** All business logic functions
- **Integration Tests:** API endpoints with database
- **E2E Tests:** Complete user workflows using Playwright
- **Security Tests:** Vulnerability scanning, penetration testing patterns
- **Performance Tests:** Load testing for transaction processing

## File Structure
```
/justsell-pos-system
├── CLAUDE.md (this file)
├── TASKS.md (sequential task list)
├── requirements/ (detailed specifications)
├── sub-agents/ (AI agent definitions)
├── src/
│   ├── admin-app/ (administrative interface)
│   ├── pos-app/ (point-of-sale interface)
│   ├── api/ (backend services)
│   ├── shared/ (common components)
│   └── tests/ (test suites)
├── docs/ (generated documentation)
└── .aiexclude (files to ignore)
```

## Success Criteria
- All regulatory compliance requirements implemented and tested
- Comprehensive security audit passing with zero critical vulnerabilities
- Full E2E test suite covering all user workflows
- Performance benchmarks meeting retail POS standards
- Complete documentation for deployment and maintenance

## Critical Notes
- This is a financial application handling sensitive data - security is paramount
- Regulatory compliance is non-negotiable - all rules must be dynamically configurable
- The system must handle high-volume transactions reliably
- User experience must be intuitive for retail cashiers under pressure
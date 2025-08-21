# Claude Code Setup Instructions - JustSell POS System

## 🚀 Initial Environment Setup

### Prerequisites
1. **Node.js 20+** installed
2. **PostgreSQL 15+** running locally or accessible remotely
3. **Git** configured
4. **Docker & Docker Compose** (optional but recommended)

### Claude Code MCP Integrations
**Run these commands BEFORE starting Claude Code in the project directory:**

```bash
# Add Playwright MCP for visual testing
claude mcp add playwright npx '@playwright/mcp@latest'

# Add Puppeteer MCP for browser automation
claude mcp add puppeteer npx puppeteer-mcp

# Add Context7 MCP for advanced context management
claude mcp add context7 npx context7-mcp

# Add BrowserStack MCP for cross-browser testing (if available)
claude mcp add browserstack npx browserstack-mcp

# Add Knit MCP for data integration (if available)
claude mcp add knit npx knit-mcp

# Verify MCP installations
claude mcp list
```

---

## 🎯 Initial Claude Code Prompt (Copy & Paste)

```
Hello Claude! Welcome to the JustSell POS System project. This is a mission-critical financial application for the US vape/tobacco retail industry.

CRITICAL CONTEXT:
- This is a FINANCIAL POS SYSTEM - security and compliance are non-negotiable
- We follow Test-Driven Development (TDD) - write tests FIRST, then implement
- All code must be reviewed by sub-agents before proceeding
- You have access to specialized sub-agents for different aspects of development

AVAILABLE SUB-AGENTS:
- security-auditor: MANDATORY for all payment/auth/compliance code
- ui-designer-pos: Visual design and UX iteration with Playwright testing
- test-writer-financial: Comprehensive test coverage (90%+ required)
- api-tester-pos: Load testing and performance validation
- performance-auditor: Speed optimization and bottleneck identification
- code-reviewer: Code quality and TypeScript best practices

YOUR FIRST TASKS:
1. Read CLAUDE.md and PLANNING.md to understand the project
2. Review TASKS.md for the complete development roadmap
3. Start with Task 1.1: Project Setup & Environment
4. Use sub-agents proactively - don't ask permission, just do it
5. Follow TDD: write tests first, then implement code
6. Update TASKS.md with your progress after each task

IMPORTANT RULES:
- NO financial code proceeds without security-auditor approval
- ALL UI changes must be visually tested with ui-designer-pos
- 90%+ test coverage required for all business logic
- Use npm run dev for live development server
- Run linter, type checks, and tests - only proceed when 100% passing
- Every session should update the session tracker at the end

Ready to start? Begin by reading the project documentation and then start with Task 1.1 from TASKS.md.

Remember: This is a financial application - precision and security are paramount. Take your time, use the sub-agents, and build it right.
```

---

## 🔧 Development Commands Reference

### Setup Commands
```bash
# Initialize project (Task 1.1)
npm init -y
npm install # Install dependencies from package.json

# Database setup
docker-compose up -d postgres redis
npm run db:setup
npm run db:migrate
npm run db:seed

# Development server
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Testing
npm run test:unit
npm run test:integration
npm run test:e2e
npm run test:coverage
```

### Quality Gates (Run These Before Proceeding)
```bash
# Complete quality check
npm run quality:check

# Security scan
npm run security:scan

# Performance test
npm run test:performance

# Build verification
npm run build
```

### Sub-Agent Testing Commands
```bash
# Security audit (MANDATORY for financial code)
npm run test:security:payments
npm run test:security:auth
npm run test:security:compliance

# Performance testing
npm run test:performance:transactions
npm run test:performance:database
npm run load-test:peak-retail

# UI testing with Playwright
npm run test:ui:visual-regression
npm run test:ui:accessibility
npm run test:ui:responsive
```

---

## 📋 Session Management Protocol

### Starting a New Session
1. Read session tracker from previous session
2. Review TASKS.md for current progress
3. Check any pending sub-agent recommendations
4. Start development where you left off

### During Development
1. Use sub-agents proactively for all reviews
2. Update TASKS.md status as you complete items
3. Run quality gates before moving to next task
4. Commit frequently with meaningful messages

### Ending a Session
1. Update the session tracker (see template below)
2. Mark completed tasks in TASKS.md
3. Commit all changes with clear messages
4. Note any blockers or next steps for following session

---

## 📊 Session Tracker Template

**Create this file: `SESSION-TRACKER.md`**

```markdown
# Development Session Tracker - JustSell POS

## Current Sprint Focus
**Active Module:** [e.g., "Core API Development", "Frontend Implementation"]
**Current Task:** [e.g., "Task 2.1: Products API with Compliance"]

---

## Session Log

### Session #1 - [Date]
**Duration:** [X hours]
**Focus:** [Main area of work]

#### Accomplished:
- [ ] [Specific task completed]
- [ ] [Another accomplishment]

#### Sub-Agent Reviews:
- **Security Auditor:** [Findings/approvals]
- **Code Reviewer:** [Quality assessment]
- **Test Writer:** [Coverage status]
- **UI Designer:** [Design feedback]

#### What Worked Well:
- [Positive outcomes]

#### Challenges/Blockers:
- [Issues encountered]

#### Next Session Priority:
- [Top priority for next session]
- [Secondary priority]

#### Quality Metrics:
- Test Coverage: [X%]
- Type Coverage: [X%]
- Performance: [Pass/Fail]
- Security: [Pass/Fail]

---

### Session #2 - [Date]
[Same format as above]

---

## Current Status Summary

### Completed Tasks (✅):
- [List of completed tasks from TASKS.md]

### In Progress (🔄):
- [Current task being worked on]

### Next Up (⏳):
- [Next 2-3 tasks in priority order]

### Critical Blockers (🚨):
- [Any issues preventing progress]

### Sub-Agent Status:
- **Security Reviews:** [X completed, Y pending]
- **Performance Tests:** [Status]
- **UI Testing:** [Status]
- **Code Quality:** [Status]
```

---

## 🎯 Task Execution Pattern

For each task, follow this pattern:

### 1. Pre-Task Setup
```bash
# Pull latest and check status
git status
npm run quality:check
```

### 2. TDD Development Cycle
```bash
# Write tests first
npm run test:unit -- --watch

# Implement code to pass tests
npm run dev

# Refactor while keeping tests green
npm run test:unit
```

### 3. Sub-Agent Reviews
- **Code Reviewer:** Every file before moving on
- **Security Auditor:** MANDATORY for auth/payment/compliance code
- **Test Writer:** Ensure 90%+ coverage
- **UI Designer:** All frontend changes
- **Performance Auditor:** Check for bottlenecks

### 4. Quality Gates
```bash
# All must pass before proceeding
npm run lint
npm run type-check
npm run test:all
npm run security:scan
npm run build
```

### 5. Commit & Update
```bash
# Commit with clear message
git add .
git commit -m "feat: implement product API with compliance checks

- Add product CRUD operations
- Implement flavor ban compliance
- Add comprehensive test coverage (94%)
- Security audit passed"

# Update task status
# Update session tracker
```

---

## 🚨 Critical Reminders

1. **This is a FINANCIAL application** - no shortcuts on security
2. **Use TDD religiously** - tests first, then code
3. **Sub-agents are mandatory** - use them for every review
4. **Quality gates must pass** - 100% before proceeding
5. **Document everything** - session tracker and task updates
6. **Commit frequently** - small, focused commits
7. **Test on real hardware** - tablets, terminals, scanners

## 🎮 Ready to Start?

1. Run the MCP setup commands above
2. Start Claude Code in the project directory
3. Use the initial prompt provided
4. Begin with reading project documentation
5. Start Task 1.1 from TASKS.md

Remember: You're building a system that will handle real money and must comply with complex regulations. Take your time, use the sub-agents, and build it right the first time.

**Good luck! 🚀**
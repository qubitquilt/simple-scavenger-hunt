# Simple Scavenger Hunt Constitution

<!--
Sync Impact Report
Version change: none → 1.0.0
List of modified principles: New - Code Quality, Testing Standards, UX Consistency, Performance Requirements, Security Practices
Added sections: Technology Stack, Development Workflow
Removed sections: none
Templates requiring updates:
- .specify/templates/plan-template.md ✅ (Constitution Check aligns with new principles)
- .specify/templates/spec-template.md ✅ (No changes needed)
- .specify/templates/tasks-template.md ✅ (Testing and performance tasks align)
Commands: No files found, no updates needed
Follow-up TODOs: None
-->

## Core Principles

### I. Code Quality
All code MUST use TypeScript with strict mode enabled. ESLint MUST follow Next.js recommended configuration, integrated with Prettier for consistent formatting. Components MUST be functional with hooks; class components are prohibited. Naming conventions: PascalCase for components and types, camelCase for variables and functions. Code reviews MUST check for adherence before merging.

Rationale: Promotes readable, maintainable, and type-safe code, reducing bugs in a Next.js application.

### II. Testing Standards
Unit tests using Jest and React Testing Library MUST cover at least 80% of code, focusing on components and utilities. Integration tests for API interactions and end-to-end tests with Cypress for user flows are REQUIRED for critical features. Follow TDD: write failing tests before implementation. Tests MUST run in CI/CD pipeline.

Rationale: Ensures reliable functionality and catches regressions early in dynamic web apps.

### III. User Experience Consistency
A design system with Tailwind CSS MUST be used for styling to ensure uniform appearance. All UI elements MUST comply with WCAG 2.1 accessibility standards, including ARIA labels and keyboard navigation. Navigation patterns, error messages, and loading states MUST be consistent across pages.

Rationale: Delivers an intuitive and inclusive experience, improving user satisfaction and retention.

### IV. Performance Requirements
The app MUST achieve Core Web Vitals thresholds: Largest Contentful Paint < 2.5s, First Input Delay < 100ms, Cumulative Layout Shift < 0.1. Use Next.js features like Image optimization, dynamic imports for code splitting, and appropriate SSR/SSG. Bundle analysis MUST be performed regularly; optimize third-party scripts.

Rationale: Provides fast loading and responsive interactions, essential for user engagement in web apps.

### V. Security Practices
Inputs MUST be sanitized using libraries like DOMPurify. Secure headers (e.g., CSP, HSTS) MUST be configured via Next.js headers. Authentication with NextAuth.js or similar MUST use secure tokens; no secrets in code. Regular dependency scans with tools like npm audit are REQUIRED.

Rationale: Protects user data and prevents common vulnerabilities in client-server applications.

## Technology Stack
Next.js 14+ with App Router, TypeScript 5+, React 18+. Styling: Tailwind CSS. State management: React Context or Zustand if needed. Testing: Jest, React Testing Library, Cypress. Deployment: Vercel.

## Development Workflow
Use feature branches from main. Pull requests REQUIRE at least one approval, passing CI checks (lint, test, build). Merge via squash commits with descriptive messages. Automated deployments on main merge.

## Governance
This constitution supersedes other practices. Amendments REQUIRE documentation of impact, review in PR, and approval by project leads. Versioning follows semantic rules: MAJOR for incompatible changes, MINOR for additions, PATCH for fixes. Compliance is verified in every PR; violations block merges. Refer to README.md for runtime guidance.

**Version**: 1.0.0 | **Ratified**: 2025-10-10 | **Last Amended**: 2025-10-10

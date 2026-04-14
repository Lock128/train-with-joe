---
inclusion: auto
---

# Quality Gates

Every code change must pass these quality gates before being considered complete.

## Flutter Frontend

- `flutter analyze` must complete with zero issues. Fix all warnings and errors before moving on.
- Relevant Flutter tests must pass. Run tests related to the changed code with `flutter test` (or target specific test files).

## Backend (Node.js / TypeScript)

- `npm run lint` (or `npm run lint:fix`) must complete with zero issues. All ESLint rules must be satisfied.
- Relevant backend tests must pass. Run `npm run test:fast` or target specific test files with Vitest to verify changes.

## General Rules

- Don't suppress or ignore lint warnings/analyzer issues without a justified reason.
- If a change breaks an existing test, fix the test or the code — don't skip it.
- When adding new functionality, ensure existing related tests still pass.

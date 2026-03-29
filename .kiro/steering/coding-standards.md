---
inclusion: auto
---

# Coding Standards

## TypeScript

- Use `consistent-type-imports` (enforced by ESLint): `import type { Foo } from './foo'`
- Prefix unused parameters with `_`
- Single quotes, semicolons, trailing commas (Prettier config in `.prettierrc`)
- 120 character line width, 2-space indentation
- Target ES2022+ features

## Testing

- Use Vitest for all backend tests
- Use fast-check for property-based tests where appropriate
- Test files go in `backend/test/` with `.spec.ts` or `.test.ts` suffix
- Mock AWS SDK clients with `aws-sdk-client-mock`
- Aim for meaningful coverage on new code

## Backend Patterns

- Repositories handle DynamoDB CRUD operations
- Services contain business logic and orchestrate repository calls
- AppSync JS resolvers in `src/gql-functions/` are compiled to `lib/gql-functions/` via esbuild
- Lambda resolvers in `src/gql-lambda-functions/` handle complex operations (payments, AI, etc.)
- All Lambda functions use Node.js 20 runtime

## Angular Pages

- Angular 20+ standalone components (no NgModules)
- SCSS for styling
- Disable `consistent-type-imports` rule for Angular files (DI requires regular imports)

## Git Workflow

- Husky pre-commit hook runs lint-staged on `*.{js,ts}` files
- Husky pre-push hook runs tests
- Branch from `main`, open PRs for review

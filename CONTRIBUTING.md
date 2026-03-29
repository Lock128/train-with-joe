# Contributing to Train with Joe

Thanks for your interest in contributing! This guide will help you get set up and productive quickly.

## Getting Started

### Prerequisites

- Node.js 18+
- AWS CLI configured with credentials
- AWS CDK CLI: `npm install -g aws-cdk`
- Flutter 3.8+ / Dart 3.0+ (for frontend work)
- Angular CLI 20+ (for landing pages)

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd train-with-joe

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Build AppSync resolvers
npm run build:appsyncFunctions

# Run tests to verify everything works
npm test
```

## Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run linting and tests locally before pushing
4. Open a pull request against `main`
5. Get a review from the appropriate code owners (see `CODEOWNERS`)

### Branch Naming

Use descriptive branch names:
- `feature/add-vocabulary-game`
- `fix/subscription-renewal-bug`
- `chore/update-dependencies`

## Code Quality

### Linting & Formatting

The project uses ESLint v10+ (flat config) and Prettier. Husky pre-commit hooks run lint-staged automatically.

```bash
npm run lint          # Check for issues
npm run lint:fix      # Auto-fix issues
```

Prettier config is in `.prettierrc`:
- Single quotes, semicolons, trailing commas
- 120 character print width
- 2-space indentation

### Testing

```bash
npm test              # Full test suite with coverage
npm run test:fast     # Quick tests without coverage
npm run test:unit     # Unit tests only
npm run bt            # Lint fix + quick test (handy shortcut)
```

Tests use Vitest with fast-check for property-based testing. Aim for meaningful test coverage on new code.

### TypeScript

- Use `consistent-type-imports` (enforced by ESLint)
- Prefix unused parameters with `_`
- Target ES2022+ features

## Project Areas

### Backend (`/backend`)

AWS CDK infrastructure and serverless functions. Changes here affect cloud resources.

- CDK stacks in `lib/`
- AppSync resolvers in `src/gql-functions/` (compiled via `build.mjs`)
- Lambda resolvers in `src/gql-lambda-functions/`
- Domain models, repositories, and services in `src/`
- GraphQL schema in `src/gql-schemas/schema.graphql`

After modifying AppSync resolvers, rebuild with:
```bash
npm run build:appsyncFunctions
```

### Frontend (`/frontend`)

Flutter cross-platform app (web, iOS, Android) with Amplify integration.

```bash
cd frontend/src
flutter pub get
flutter run -d chrome
flutter test
```

### Landing Pages (`/join_page`, `/competitors_page`, `/profile_cards`)

Angular 20+ standalone apps for marketing and user-facing pages.

```bash
cd <page_directory>
npm install
npm start       # Dev server at http://localhost:4200
npm test        # Run tests
```

## Deployment

Deployments follow a promotion pipeline:

1. Push to `main` → auto-deploys to sandbox
2. Promote sandbox tag to beta via GitHub Actions
3. Promote beta tag to production (requires approval)

See `.github/README.md` for full CI/CD documentation.

## Environment Namespacing

Each developer gets an isolated sandbox. Resources are namespaced by `NODE_ENV` or default to `sandbox-<username>`. You can deploy your own stack without affecting others:

```bash
npm run deploy    # Deploys to your personal sandbox
npm run destroy   # Tears down your sandbox
```

## Pull Request Guidelines

- Keep PRs focused and reasonably sized
- Include a clear description of what changed and why
- Add or update tests for new functionality
- Make sure CI passes before requesting review
- GraphQL schema changes should be discussed before implementation

## Questions?

Check the `/documentation` directory or open an issue for discussion.

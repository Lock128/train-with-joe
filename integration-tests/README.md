# Integration Tests

End-to-end integration tests for **Train with Joe** using
[Playwright](https://playwright.dev/).

The headline test is a full **signup -> verify -> login** flow that exercises the
join_page registration form, the real Cognito email verification, and sign-in to
the Flutter web app.

This suite is self-contained: it has its own `package.json` and is not wired into
the main app build.

## Quick Start

```bash
cd integration-tests
npm install
npx playwright install --with-deps chromium

cp .env.example .env
# Edit .env: confirm/set APP_BASE_URL (the app subdomain is a deploy-time value,
# see below), and optionally override URLs or supply CONFIRMATION_CODE.

# Run the interactive registration flow against production, headed:
npm run test:registration
```

## This is an interactive, LIVE test

The registration spec hits a **real deployed environment** and a **real email
inbox**:

- It registers a brand new account with a random, plus-addressed email
  (`lockhead+<random>@lockhead.info` by default) and a Cognito-policy-compliant
  password (>= 8 chars, with upper, lower, digit, and symbol).
- Cognito emails a verification code to that address.
- The test **pauses and prompts on the terminal (stdin)** for that code. Provide
  it from the inbox, or set `CONFIRMATION_CODE` to skip the prompt.

Because of the interactive code step and the live email dependency, a green run
is **human-operated**. Do not expect this to pass unattended in CI without a
pre-supplied `CONFIRMATION_CODE` and a monitored inbox.

### Run it headed

```bash
cd integration-tests
ENVIRONMENT=production npx playwright test tests/ui/registration.spec.ts \
  --project=ui-tests --headed
```

### Non-interactive run (code already known)

```bash
CONFIRMATION_CODE=123456 ENVIRONMENT=production \
  npx playwright test tests/ui/registration.spec.ts --project=ui-tests
```

## DIVERGENCE — registration is an INLINE home-page form (no /register route)

Unlike the pegasus-galaxy reference (which has a dedicated `/register` page),
**Train with Joe's join_page has NO `/register` route.** Registration is an
**inline two-step form inside the home page**, in `section#register`
(`join_page/src/app/pages/home.component.html` / `.ts`). The test loads the home
page (`https://trainwithjoe.app/` by default) and **scrolls `#register` into
view**.

The form has two in-page steps driven by `step: 'register' | 'verify'`:

1. **register** — email + password + confirm-password + submit.
2. **verify** — a verification code input (`input[name="verificationCode"]`) +
   a verify button. This step appears **in-page** after a successful SignUp.

On a successful verify, `home.component.ts` redirects the browser to
`${appUrl}/signin?email=<email>&registered=true`, where the test completes a cold
sign-in to the Flutter app and asserts it lands on `/home`.

### Resilient (EN/DE) selectors

The join_page toggles between **English and German**, and the form inputs have
**no stable element ids** — their labels/placeholders are i18n-driven. The spec
therefore targets fields **structurally** (by role / input type / position)
rather than by visible text, so it works in either language:

| Field | Selector |
|-------|----------|
| email | `input[type="email"]` (autocomplete `email`) |
| password | first `input[type="password"]` |
| confirm password | second `input[type="password"]` |
| submit / verify button | the primary form button in the active step |
| verification code | `input[name="verificationCode"]` (stable `name`) |

The spec also asserts the submit button **leaves its submitting/disabled state**
(fail-fast on a hung SignUp) instead of matching the "Submitting..." /
"Wird gesendet..." label text.

## App URL is a DEPLOY-TIME value — confirm it

`join_page/src/environments/environment.ts` ships `appUrl` as a
`REPLACE_WITH_APP_URL` placeholder that is only substituted at deploy time, so
**the real app subdomain is not knowable from the source tree.** The suite
defaults `APP_BASE_URL` to `https://app.trainwithjoe.app` (a best guess from the
join_page apex `https://trainwithjoe.app`). **Confirm the deployed app URL** and
override `APP_BASE_URL` if it differs.

## CLEANUP LIMITATION — read this

**Train with Joe's join_page has NO delete surface at all.** There is no
`/delete`, no `/delete-account`, and no in-page delete form to drive in the
browser. So the intended *"cleanup via the join_page /delete option"* **cannot be
performed here** the way it is for places-unlock (which has a real
`/delete-account` form).

The backend does expose a `Mutation.deleteUser` GraphQL resolver, but it is an
**authenticated** mutation keyed on the signed-in user's Cognito identity (not a
public surface), and it ultimately performs an admin Cognito `AdminDeleteUser`
anyway.

Instead, the test's `afterEach` performs a **best-effort admin cleanup**:

- If **admin AWS credentials** (`AWS_ACCESS_KEY_ID` / `AWS_PROFILE` /
  `AWS_ROLE_ARN`) **and** `COGNITO_USER_POOL_ID` are present in the environment,
  it calls Cognito `AdminDeleteUser` to remove the test account.
- Otherwise it logs a **WARNING** that the account must be cleaned up **manually**
  and does **NOT** fail the test.

Cleanup never fails the suite. If you run without admin credentials, remember to
delete the generated `lockhead+<random>@lockhead.info` Cognito user yourself (or
rely on the random suffix so stale accounts do not block future runs).

## URLs

| Surface | Production default | Override env var |
|---------|--------------------|------------------|
| join_page register (inline on home) | `https://trainwithjoe.app/` | `REGISTER_URL` |
| App sign-in | `https://app.trainwithjoe.app/signin` (confirm subdomain) | `APP_BASE_URL` |
| join_page delete | NONE (no delete route or form) | n/a |

For lower environments (anything other than `production`) the defaults use the
`{env}.trainwithjoe.app` / `app.{env}.trainwithjoe.app` variants. Override any of
them explicitly via the env vars above.

## Environment variables

See [`.env.example`](./.env.example) for the full list. The most relevant:

| Variable | Purpose |
|----------|---------|
| `ENVIRONMENT` | `sandbox`, `beta`, or `production`; selects default URLs |
| `APP_BASE_URL` | Override the Flutter app base (for `/signin`) — confirm it |
| `REGISTER_URL` | Override the join_page home URL carrying the inline form |
| `AWS_REGION` | Cognito region (default `eu-central-1`) |
| `COGNITO_CLIENT_ID` | Optional; for the programmatic Cognito helpers |
| `COGNITO_USER_POOL_ID` | Optional; enables best-effort admin cleanup |
| `CONFIRMATION_CODE` | Supply the emailed code to skip the stdin prompt |
| `REGISTRATION_EMAIL` | Force a specific email instead of a random one |

## Test structure

```
integration-tests/
├── helpers/
│   ├── auth.ts               # Cognito ConfirmSignUp / InitiateAuth + best-effort admin delete
│   ├── interactive-code.ts   # Verification code via CONFIRMATION_CODE or stdin
│   ├── test-users.ts         # Minimal TestUser type (spec generates its own user)
│   └── ui-auth.ts            # Browser sign-in to the Flutter app (/signin -> /home)
├── tests/
│   └── ui/
│       └── registration.spec.ts   # signup -> verify -> login (+ best-effort cleanup)
├── playwright.config.ts
├── package.json
├── tsconfig.json
├── .env.example
└── .gitignore
```

## Static validation (no browser required)

```bash
cd integration-tests
npm install
npx tsc --noEmit                 # type-check
npx playwright test --list       # enumerate specs without launching a browser
```

## Viewing reports

```bash
npx playwright show-report reports/html
```

## GitHub Actions

Trigger manually via **Actions → "Integration Tests" → "Run workflow"**, choosing
the target environment. See
[`.github/workflows/integration-tests.yml`](../.github/workflows/integration-tests.yml).
Because the registration spec is interactive, CI runs expect `CONFIRMATION_CODE`
to be supplied for a non-interactive execution.

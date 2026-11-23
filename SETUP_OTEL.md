# Dash0 telemetry setup (manual steps)

The Flutter app reports real user monitoring data to [Dash0](https://www.dash0.com) with the
[Dash0 Flutter SDK](https://github.com/Lock128/flutter-dash0-sdk): page views, errors, HTTP spans for AppSync
calls, and web vitals on web. The code and CI wiring are in the repository. This file lists what you must do by hand.

Telemetry is a no-op until an OTLP endpoint and a bearer token are passed at build time with `--dart-define`.
Builds without them behave exactly as before.

## 1. Create Dash0 auth tokens and datasets

1. In Dash0, create two datasets, for example `train-with-joe-nonprod` (sandbox and beta) and `train-with-joe-prod`
   (production). One dataset per environment is also fine.
2. Create one auth token per environment (Settings, Auth Tokens). Grant the least privilege: ingest only (traces, logs,
   metrics), restricted to the matching dataset. Do not reuse a token with read or admin rights, because the token ships
   inside the web bundle and mobile binaries and can be extracted by anyone.
3. Note your OTLP endpoint (Settings, Endpoints), for example `https://ingress.eu-west-1.aws.dash0.com`. Use the base
   URL only, without `/v1/traces`. The app strips a trailing signal path if present.

## 1a. Set up Dash0 with the dash0 CLI

The [dash0 CLI](https://github.com/dash0hq/dash0-cli) can create the datasets and tokens from YAML files. The
commands below were verified with CLI v1.22.1.

**Current state:** the datasets `train-with-joe` (production) and `nonprod-train-with-joe` (sandbox and beta) and the
ingest-only tokens `train-with-joe-flutter-ingest` and `nonprod-train-with-joe-flutter-ingest` already exist in the
`eu-west-1` region. The maintainer's script sets the GitHub secrets from those tokens. You only need this section to
recreate them or to set up another environment.

Install:

```bash
brew install --cask dash0hq/dash0-cli/dash0
# or download a release binary from https://github.com/dash0hq/dash0-cli/releases
```

Authenticate with an admin token (a token with permission to manage datasets and auth tokens, not the ingest tokens):

```bash
export DASH0_API_URL=https://api.eu-west-1.aws.dash0.com
export DASH0_AUTH_TOKEN=<admin token>
# or interactively: dash0 login
```

Dataset file `ds.yaml` (repeat with slug `nonprod-train-with-joe` for the second dataset):

```yaml
apiVersion: dash0.com/v1alpha1
kind: Dash0Dataset
metadata:
  name: train-with-joe
  labels:
    dash0.com/id: train-with-joe
spec:
  slug: train-with-joe
  preferred: false
  permissions:
    - actions: [dataset:read]
      role: basic_member
  privacy:
    geoLocation:
      endUser:
        storage: up_to_city
    ipAddresses:
      endUser:
        storage: anonymize
  retention:
    logs: 30d
    metrics: 13M
    profiles: 30d
    traces: 30d
    webEvents: 30d
```

Token file `tok.yaml` (repeat with `nonprod-train-with-joe-flutter-ingest` and slug `nonprod-train-with-joe`):

```yaml
apiVersion: dash0.com/v1alpha1
kind: Dash0AuthToken
metadata:
  name: train-with-joe-flutter-ingest
spec:
  actions: [ingest:*]
  ingestion:
    defaultDataset: train-with-joe
  scope:
    datasets:
      restriction: restricted
      slugs: [train-with-joe]
    signals:
      restriction: unrestricted
      types: []
```

Create and check:

```bash
dash0 -X datasets create -f ds.yaml --dry-run
dash0 -X datasets create -f ds.yaml
dash0 -X auth-tokens create -f tok.yaml --secret-file ./train-with-joe.tok   # new file, outside git or gitignored
dash0 -X datasets list
dash0 -X auth-tokens list
```

The token secret is only available at creation time, in the `--secret-file`. Never commit that file.

Build the header value from the token and the dataset slug, and use the OTLP base URL
`https://ingress.eu-west-1.aws.dash0.com` as endpoint:

```text
Authorization=Bearer <token>,Dash0-Dataset=<slug>
```

Ingest-only, dataset-restricted tokens are safe to ship in web builds: they can write to one dataset and read nothing.
They are still public, so rotate them if abused. Because this is a children's app, the privacy gate in section 7 stays:
do not enable telemetry in production before the privacy release gate listed there is complete.

## 1b. Local setup script

`scripts/setup-otel.sh` does section 1a and the secrets of section 2 in one run, from your own machine. Use it when
setting secrets through an agent or gateway fails with HTTP 403: the script uses your own `gh` login.

Prerequisites:

- `dash0` CLI 1.22 or newer, `gh` and `jq`.
- `gh auth login` with permission to write Actions secrets on `Lock128/train-with-joe`: a classic token with the
  `repo` scope, or a fine-grained token with Secrets: Read and write (plus Metadata: Read) on that repository.
- `DASH0_AUTH_TOKEN` in the environment, set to a Dash0 admin token. It is never accepted as an argument.
  `DASH0_API_URL` defaults to `https://api.eu-west-1.aws.dash0.com`.

```bash
read -rs DASH0_AUTH_TOKEN && export DASH0_AUTH_TOKEN
scripts/setup-otel.sh --dry-run          # validate and print the plan, change nothing
scripts/setup-otel.sh                    # nonprod and prod
scripts/setup-otel.sh --only nonprod     # one environment
scripts/setup-otel.sh --rotate           # replace existing tokens
```

For each environment (`nonprod-train-with-joe`, `train-with-joe`) the script:

1. Creates or updates the dataset (`dash0 -X datasets create`, which upserts by slug).
2. Ensures the token `<slug>-flutter-ingest` (`ingest:*`, restricted to that dataset). Dash0 returns a token secret only
   at creation. If the token exists, the script stops with a message unless you pass `--rotate`. With `--rotate` it
   deletes the old token (the old one stops working at once) and creates a new one.
3. Sets `NONPROD_FLUTTER_OTLP_ENDPOINT`, `NONPROD_FLUTTER_OTLP_HEADERS`, `PROD_FLUTTER_OTLP_ENDPOINT` and
   `PROD_FLUTTER_OTLP_HEADERS` with `gh secret set` (value on stdin).

The token secret is written with `--secret-file` into a private temporary directory that an exit trap removes, and is
passed to `gh` on stdin. It is never printed, put on a command line, or written into the repository.

Rotation: run `scripts/setup-otel.sh --rotate` (add `--only` to limit it), for example after a token is abused. Then
rerun the deployments so builds pick up the new secrets.

Troubleshooting a 403 from `gh`: the script checks `gh api repos/Lock128/train-with-joe/actions/secrets/public-key`
first. If that fails, your login lacks secrets permission. Create a token as described above and run `gh auth login`
again. A `GH_TOKEN` or `GITHUB_TOKEN` variable overrides the stored login, so unset it if it holds an old token.
Dash0 errors usually mean `DASH0_AUTH_TOKEN` is not an admin token or `DASH0_API_URL` is the wrong region.

Setting the secrets does not lift the privacy release gate in section 7: do not ship production telemetry before it
is complete.

## 2. GitHub Actions secrets

Add these in the repository secrets (Settings, Secrets and variables, Actions). The workflows `ci-cd.yml` (sandbox),
`promotion-pipeline.yml` (beta, GitHub environment `beta`) and `production-deployment.yml` (production, GitHub
environment `production`) read them in the step "Generate OTLP config for Flutter". The secrets can be repository
secrets or secrets of those GitHub environments.

| Secret | Used by | Value |
| --- | --- | --- |
| `NONPROD_FLUTTER_OTLP_ENDPOINT` | sandbox and beta builds | `https://ingress.<region>.aws.dash0.com` |
| `NONPROD_FLUTTER_OTLP_HEADERS` | sandbox and beta builds | `Authorization=Bearer <token>,Dash0-Dataset=<dataset>` |
| `PROD_FLUTTER_OTLP_ENDPOINT` | production builds | `https://ingress.<region>.aws.dash0.com` |
| `PROD_FLUTTER_OTLP_HEADERS` | production builds | `Authorization=Bearer <token>,Dash0-Dataset=<dataset>` |
| `FLUTTER_OTLP_ENDPOINT` | fallback for sandbox and beta only | same format as above |
| `FLUTTER_OTLP_HEADERS` | fallback for sandbox and beta only | same format as above |

The `NONPROD_` secrets win for sandbox and beta. The unprefixed `FLUTTER_OTLP_*` secrets are used there only when the
`NONPROD_` one is empty. Production reads only the `PROD_` secrets and never falls back, so a nonprod token can never
end up in a production build. If `PROD_*` are unset, production builds have telemetry disabled. Header format rules:

- Comma separated `key=value` pairs, no spaces around the comma, no quotes.
- `Authorization=Bearer <token>` is required, `Dash0-Dataset=<dataset>` is required. The workflow fails the build when
  the headers are set but lack `Dash0-Dataset=`.
- Leave a secret empty to disable telemetry for that environment.

The workflow writes `frontend/src/otlp_config.json` (gitignored) and builds with
`--dart-define-from-file=otlp_config.json`. Header values are never printed to the log.

## 3. Mobile builds (Codemagic)

**No iOS or Android build is defined in this repository.** There is no `codemagic.yaml`, fastlane setup or GitHub
workflow that builds an APK or iOS app. Mobile builds run in the Codemagic UI (with the Amplify values from
`scripts/extract-codemagic-env.sh`), so the telemetry configuration must be added to that build as described here.
Without it the app starts with telemetry disabled.

The app reads its OTLP settings from build-time variables. A pre-build script writes them to
`frontend/src/otlp_config.json` (gitignored), and the build passes that file with `--dart-define-from-file`.

### Get the variable values

Dash0 never returns a token secret after creation, so the values come from new, dedicated ingest-only tokens named
`<slug>-codemagic-ingest` (`nonprod-train-with-joe` for beta, `train-with-joe` for production). They are separate
from the GitHub `-flutter-ingest` tokens, which the script never touches. Run this on your own machine in a terminal
with a Dash0 admin token (dash0 CLI >= 1.22 and `jq` installed):

```bash
read -rs DASH0_AUTH_TOKEN && export DASH0_AUTH_TOKEN
./scripts/codemagic-otel-vars.sh --env all            # or beta / production
./scripts/codemagic-otel-vars.sh --dry-run            # validate only, creates nothing
./scripts/codemagic-otel-vars.sh --rotate --env beta  # replace an existing token (old one stops working)
```

It prints ready-to-paste `NAME=value` lines. Paste them into the Codemagic environment variables and tick **Secure**
for the `*_HEADERS` lines. The secret is shown once. If the token already exists, the script prints the other values and
says the secret cannot be retrieved again. Use `--rotate` for a new one. The script refuses to print secrets when stdout
is not a terminal (unless `--print-secrets-to-pipe`) or when `CI` or `CM_BUILD_ID` is set, and never writes them to a
file. Without `DASH0_AUTH_TOKEN` it prints placeholders only.

### Pre-build step and build commands

Add this as the Codemagic pre-build script (works from any directory, needs `jq`, bash 3.2 compatible):

```bash
bash scripts/codemagic-otel-prebuild.sh
```

It selects the `PROD_` pair when `DASH0_ENVIRONMENT=production` (no `NONPROD_` fallback) and the `NONPROD_` pair
otherwise. It exits with an error if the headers lack `Authorization=Bearer` or `Dash0-Dataset=`, and prints a warning
and writes `{}` if endpoint or headers are unset, so the build still works with telemetry off. It never prints header
values, writes `otlp_config.json` with mode 600, and sets the deployment name, deployment id (`BUILD_NUMBER`) and VCS
fields (`FCI_*`, credentials removed from the repository URL).

Then build from `frontend/src`:

```bash
flutter build apk --release \
  --dart-define=COMMIT_ID="$FCI_COMMIT" \
  --dart-define=GITHUB_RUN_NUMBER="$BUILD_NUMBER" \
  --dart-define-from-file=otlp_config.json
  # + your existing Amplify --dart-define flags

flutter build ipa --release \
  --dart-define=COMMIT_ID="$FCI_COMMIT" \
  --dart-define=GITHUB_RUN_NUMBER="$BUILD_NUMBER" \
  --dart-define-from-file=otlp_config.json
  # + your existing Amplify --dart-define flags
```

### Codemagic secrets

Add these as secure environment variables in the Codemagic workflow (`scripts/codemagic-otel-vars.sh` prints them).
Use the `NONPROD_` values for sandbox and beta builds and the `PROD_` values for production. Do not fall back to
unprefixed values for production builds, as the GitHub workflows do not either.

| Variable | Purpose |
| --- | --- |
| `NONPROD_FLUTTER_OTLP_ENDPOINT` | Dash0 ingress URL for non-production builds |
| `NONPROD_FLUTTER_OTLP_HEADERS` | Headers for non-production builds (secure) |
| `PROD_FLUTTER_OTLP_ENDPOINT` | Dash0 ingress URL for production builds |
| `PROD_FLUTTER_OTLP_HEADERS` | Headers for production builds (secure) |
| `DASH0_ENVIRONMENT` | Value of `deployment.environment.name` (for example `beta` or `production`) |

The headers value must contain both `Authorization=Bearer <token>` and `Dash0-Dataset=<dataset>`, for example
`Authorization=Bearer auth_xxx,Dash0-Dataset=your-dataset`.

Native apps send `service.version` as `<version>+<build number>` (from `package_info_plus`) and a synthetic user agent
built by the SDK. iPads report `os.name` as `iPadOS`.

Optional: pass `--dart-define=COMMIT_ID=$FCI_COMMIT` and `--dart-define=GITHUB_RUN_NUMBER=$BUILD_NUMBER` so mobile
builds report `app.version` and `app.build_number`. Without them the values are `local` and `0`.

## 4. Build-time defines

All are read with `String.fromEnvironment` in `frontend/src/lib/main.dart`, `lib/utils/dash0_config.dart` and
`lib/models/app_version.dart`.

| Define | Default | Purpose |
| --- | --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | empty (telemetry off) | OTLP base URL |
| `OTEL_EXPORTER_OTLP_HEADERS` | empty (telemetry off) | `Authorization=Bearer ...,Dash0-Dataset=...` |
| `DASH0_ENVIRONMENT` | `development` in debug, unset in release | `deployment.environment.name`; also suffixes the service name |
| `DASH0_DEPLOYMENT_NAME` | unset | Deployment name (CI sets `train-with-joe-<env>`) |
| `DASH0_DEPLOYMENT_ID` | unset | Deployment id (CI sets run id and attempt) |
| `DASH0_VCS_REF_HEAD_REVISION` | unset | Git commit |
| `DASH0_VCS_REF_HEAD_NAME` | unset | Git ref name |
| `DASH0_VCS_REPOSITORY_URL_FULL` | unset | Repository URL |
| `DASH0_SESSION_REPLAY_SAMPLING_RATE` | `0` (off) | Percent of sessions to record, 0 to 100 |
| `DASH0_SDK_DEBUG` | `false` | `true` enables SDK logging (`[dash0]` prefix) in release builds. Debug builds always log |
| `DASH0_PROFILING_ENABLED` | `false` | Enable profiling |
| `DASH0_HTTP_OVERRIDES_ENABLED` | `true` on native, ignored on web | Trace `dart:io` HTTP calls |
| `DASH0_PROPAGATE_TRACE_HEADERS` | `true` on native, `false` on web | Send `traceparent` to AppSync |
| `DASH0_METRIC_EXPORT_INTERVAL_SECONDS` | `30` | Metric export interval |
| `COMMIT_ID` | `local` | Reported as `app.version` |
| `GITHUB_RUN_NUMBER` | `0` | Reported as `app.build_number` |

Service names: `train-with-joe-flutter` for production, `train-with-joe-flutter-sandbox` and
`train-with-joe-flutter-beta` otherwise.

## 5. Local development

Run with a file that is not committed (`otlp_config.json` is gitignored):

```bash
cd frontend/src
cat > otlp_config.json <<'EOF'
{
  "OTEL_EXPORTER_OTLP_ENDPOINT": "https://ingress.<region>.aws.dash0.com",
  "OTEL_EXPORTER_OTLP_HEADERS": "Authorization=Bearer <dev-token>,Dash0-Dataset=<dev-dataset>",
  "DASH0_ENVIRONMENT": "development"
}
EOF
flutter run -d chrome --dart-define-from-file=otlp_config.json
```

Use a separate dev token and dataset. Without the file the app runs with telemetry off.

To work on the SDK itself, replace the git dependency in `frontend/src/pubspec.yaml` with a path dependency
(see the comment next to `dash0_flutter_sdk`), for example `path: ../../../flutter-dash0-sdk`. Do not commit that change.

## 6. Web and CORS

On web, `traceparent` propagation is off by default because the AppSync endpoint is cross-origin. Without the header,
HTTP spans are still recorded but are not linked to backend traces.

Findings from `backend/lib/`: the CDK code configures CORS only for the assets S3 bucket (`base-stack.ts`,
`allowedHeaders: ['*']`, used for uploads). It does not configure CORS for AppSync, and AppSync answers browser
preflight requests itself with a fixed list of allowed headers. `traceparent` and `tracestate` are not in that list,
so enabling propagation on web (`DASH0_PROPAGATE_TRACE_HEADERS=true`) can make the browser block every API request.
The CDK stack has no setting to change this.

Therefore: leave it off on web. If you want it later, put CloudFront (or API Gateway) in front of the AppSync custom
domain and add a response headers policy with `Access-Control-Allow-Headers` including `traceparent,tracestate` plus the
headers the app already sends. Test in sandbox first. Native apps are not affected by CORS and send the header by
default.

## 7. Privacy

Train with Joe is used by children, so the integration is deliberately minimal:

- The identity sent is the Cognito user id plus a user name (set after sign-in, cleared on sign-out). The name is the
  profile display name once it loads. If the user has no display name, the login email is sent as `name` only (and in
  `fullName` as `<name> (<id>)`), never as the Dash0 `email` field. Roles are never sent.
- Session replay is off (`DASH0_SESSION_REPLAY_SAMPLING_RATE=0`). Do not enable it without a legal review, since replays
  can capture vocabulary content and on-screen text.
- Native apps send a synthetic user agent built by the SDK from the platform and app version. It contains no device
  name or identifiers. Since SDK v0.11.0 the iOS and iPadOS user agent is parseable, so Dash0 shows the OS of iOS
  sessions. Web builds keep the browser user agent.
- Screen names are fixed route templates (for example `vocabulary-detail`), never ids or user text.

Privacy release gate:

- The privacy policy (`join_page/src/app/pages/privacy.component.ts`, English and German) now discloses telemetry:
  data categories, Dash0 as processor (EU, eu-west-1), retention (30 days, 13 months metrics), purpose, no advertising.
  Deploy the policy (join_page) before or together with the first production build that uses the `PROD_` secrets.
  The app only links to the hosted policy, so no app text needs to change.
- Maintainers still need to update manually: App Store Connect "App Privacy" (kids category), and the Google Play
  Data safety form and Families declarations. `documentation/store-listing.md` has the review note wording.
- The privacy policy, `documentation/store-listing.md` and `documentation/app-store-review-response.md` now state that
  the user name/display name (or the login email when it is the only identifier) is linked to the pseudonymous id for
  support and diagnostics, with no advertising. App Store Connect "App Privacy" must list Name (and Email Address for
  the fallback) as linked to the user (Kids category), and the Google Play Data safety form and Families declarations
  must be updated by hand.
- Sending a child's name or login to a third-party processor raises the COPPA and GDPR-K question further than a
  pseudonymous id alone. Keep this flagged for legal review before production.
- OPEN QUESTION for human and legal review (not decided here): the policy says children under 13 are not knowingly
  covered without parental consent, and telemetry is linked to a pseudonymous user ID. Whether telemetry needs explicit
  parental consent or an opt-in (COPPA, GDPR-K, ePrivacy), or whether it can run as legitimate interest or a
  strictly necessary diagnostic, has not been decided. Resolve this before enabling production telemetry.
- URLs are scrubbed in the app (`urlScrubber`): query strings and fragments, such as `?email=` on `/signin`, are replaced
  with `?REDACTED` in page views, HTTP spans, errors and logs.
- Follow the Dash0 sensitive data guidance: do not put emails, names, tokens, vocabulary text or free text in span
  names, attributes, error messages or log messages. Scrub such data in the Dash0 pipeline if it can appear anyway.

## 8. Sampling

Keep SDK-side sampling at defaults and sample in Dash0 or the pipeline if volume or cost becomes a problem, because
dropping data at the source loses errors too. The only SDK-side knob is `DASH0_SESSION_REPLAY_SAMPLING_RATE`, which
defaults to `0`. If you enable replay, start at a low rate such as `1` to `5`.

## 9. Verify in Dash0

After the first deploy with the secrets set, open the app and check, per environment dataset:

- Services show `train-with-joe-flutter` (production), `train-with-joe-flutter-beta` and
  `train-with-joe-flutter-sandbox`.
- Resource attribute `deployment.environment.name` is `production`, `beta` or `sandbox`, and `app.version` equals the
  deployed commit.
- Page view events appear when you navigate between screens, with route template names.
- HTTP spans appear for AppSync calls.
- Trigger an error in a sandbox build and confirm it shows up as an error event.
- After sign-in, the user id attribute is the Cognito `sub`; the user name shows the display name (or the login email if none is set).
- Dash0 shows no data from builds without secrets (expected). In the build log, the step prints `set` or
  `EMPTY (telemetry disabled)` for endpoint and headers.

If nothing arrives: check that the headers include `Dash0-Dataset=`, that the token is valid for that dataset, that the
endpoint region matches the token, and (on web) the browser network tab for blocked OTLP requests.

## 9a. Troubleshooting on a device

Release builds hide SDK failures, and the SDK drops failed deliveries silently. A hidden diagnostics screen shows what
the app was built with and can test delivery from the device. It contains no user data and never shows the full token.

**Open it:** Info screen, long-press the `Build Number` row, solve the parental gate, and the "Dash0 diagnostics" screen
opens. It is not part of the normal navigation and works when telemetry is not configured (it then shows
`Init branch: no endpoint or token`).

**Buttons:**

- `Send test event` sends `dash0.diagnostics.test` through the SDK and flushes. It confirms the SDK accepted the event,
  not that Dash0 received it.
- `Test connection` posts one log record (service `<service name>-diagnostics`, body `diagnostics connection test`)
  from the device to `<endpoint>/v1/logs` with the built-in token and dataset, with a 10 second timeout. It shows the
  HTTP status and the first 200 characters of the body, or the exception. 2xx means endpoint, token and dataset work.
  401 or 403 means the token is wrong or may not ingest. 404 means a wrong endpoint. An exception means the network or
  TLS failed.
- `Copy report` copies the fields and last results as plain text. The token is masked (first 7 characters and length).

**SDK logs in release builds:** build with `DASH0_SDK_DEBUG=true` (a Codemagic variable, written to `otlp_config.json`
by `scripts/codemagic-otel-prebuild.sh`, or `--dart-define=DASH0_SDK_DEBUG=true`). Then read the console for lines with
`[dash0]`: Xcode (Window, Devices and Simulators, Open Console) or Console.app with the filter `[dash0]` on iOS, and
`adb logcat | grep dash0` on Android. Turn it off again for store releases.

**DASH0_ENVIRONMENT must be set in Codemagic.** Without it the release build has no `deployment.environment.name` and
the prebuild script picks the `NONPROD_` pair. Set `production` for the `PROD_` pair, or `beta` for non-production.

## 10. Optional follow-ups (not part of this change)

- Backend telemetry for the Lambda functions and AppSync resolvers with OpenTelemetry. Not added here because it changes
  every function and needs account-level decisions.
- CloudWatch logs and metrics to Dash0 through Kinesis Data Firehose, as done in the `nexus-share` repository
  (`backend/src/dash0-cdk` and `backend/DASH0_INTEGRATION.md`). If you do this, store the Dash0 API key in AWS Secrets
  Manager as `dash0/api-key` with the format `{"api_key":"Bearer auth_xxx"}`. This secret is not needed for the Flutter
  integration.

## OTLP secret fallback chain

Builds that need the Dash0 endpoint and headers (Angular `join_page` / `profile_cards` web SDK,
Flutter, CDK deploy steps) pick them from the first complete pair in a chain. A pair is used only
when both its endpoint and its headers are set, so endpoint and headers always come from the same
Dash0 dataset.

- Non-production: `NONPROD_FLUTTER_OTLP_*`, then legacy `FLUTTER_OTLP_*`
- Production: `PROD_FLUTTER_OTLP_*`

In GitHub workflows this is written as
`${{ (secrets.A_ENDPOINT && secrets.A_HEADERS) && secrets.A_ENDPOINT || secrets.B_ENDPOINT }}` for the
endpoint and the same condition returning the `_HEADERS` secret for the headers. The Angular generator
(`scripts/generate-dash0-config.mjs`) applies the same rule to the environment: when `OTLP_*`,
`FLUTTER_OTLP_*` and `OTEL_EXPORTER_OTLP_*` are all empty it reads `PROD_FLUTTER_OTLP_*` (for
`DASH0_ENVIRONMENT` production, prod or teamcorner) or `NONPROD_FLUTTER_OTLP_*` (any other value). If
`DASH0_ENVIRONMENT` is unset it tries the PROD_ pair, then the NONPROD_ pair.


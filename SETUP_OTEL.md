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
do not enable telemetry in production before the consent and privacy policy decisions listed there.

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

The app reads its OTLP settings from build-time variables. Generate `otlp_config.json` with the same `jq` step as
`Generate OTLP config for Flutter` in `.github/workflows/ci-cd.yml`, then pass it with `--dart-define-from-file`:

```bash
cd frontend/src
jq -n \
  --arg endpoint "$FLUTTER_OTLP_ENDPOINT" \
  --arg headers "$FLUTTER_OTLP_HEADERS" \
  --arg environment "$DASH0_ENVIRONMENT" \
  --arg deployment_name "train-with-joe-$DASH0_ENVIRONMENT" \
  '{
    OTEL_EXPORTER_OTLP_ENDPOINT: $endpoint,
    OTEL_EXPORTER_OTLP_HEADERS: $headers,
    DASH0_ENVIRONMENT: $environment,
    DASH0_DEPLOYMENT_NAME: $deployment_name
  }' > otlp_config.json

flutter build apk --release \
  --dart-define-from-file=otlp_config.json

flutter build ipa --release \
  --dart-define-from-file=otlp_config.json
```

Add the existing Amplify defines of the Codemagic build next to `--dart-define-from-file`. The CI step also sets
`DASH0_DEPLOYMENT_ID`, `DASH0_VCS_REF_HEAD_REVISION`, `DASH0_VCS_REF_HEAD_NAME` and `DASH0_VCS_REPOSITORY_URL_FULL`. Add
them to the Codemagic step if you want deployment and commit data on mobile telemetry.

### Codemagic secrets

Add these as secure environment variables in the Codemagic workflow. In the script above, map the endpoint and headers
of the target environment to `FLUTTER_OTLP_ENDPOINT` and `FLUTTER_OTLP_HEADERS`. Use the `NONPROD_` values for sandbox
and beta builds and the `PROD_` values for production. Do not fall back to unprefixed values for production builds,
as the GitHub workflows do not either.

| Variable | Purpose |
| --- | --- |
| `NONPROD_FLUTTER_OTLP_ENDPOINT` | Dash0 ingress URL for non-production builds |
| `NONPROD_FLUTTER_OTLP_HEADERS` | Headers for non-production builds (secure) |
| `PROD_FLUTTER_OTLP_ENDPOINT` | Dash0 ingress URL for production builds |
| `PROD_FLUTTER_OTLP_HEADERS` | Headers for production builds (secure) |
| `FLUTTER_OTLP_ENDPOINT` / `FLUTTER_OTLP_HEADERS` | Optional fallback for non-production builds only |
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

- The only identity sent is the Cognito user id (set after sign-in, cleared on sign-out). Email and names are never
  sent.
- Session replay is off (`DASH0_SESSION_REPLAY_SAMPLING_RATE=0`). Do not enable it without a legal review, since replays
  can capture vocabulary content and on-screen text.
- Native apps send a synthetic user agent built by the SDK from the platform and app version. It contains no device
  name or identifiers. Web builds keep the browser user agent.
- Screen names are fixed route templates (for example `vocabulary-detail`), never ids or user text.

Before enabling telemetry in production:

- Decide whether consent is required (GDPR, ePrivacy, children's data rules, App Store and Google Play data safety
  forms). The Cognito user id is a pseudonymous identifier and counts as personal data.
- Update the privacy policy and the Impressum screen (`frontend/src/lib/screens/impressum_screen.dart`) and the store
  declarations in `documentation/store-listing.md`. Dash0 should be listed as a processor, with the data region you chose.
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
- After sign-in, the user id attribute is the Cognito `sub`, not an email.
- Dash0 shows no data from builds without secrets (expected). In the build log, the step prints `set` or
  `EMPTY (telemetry disabled)` for endpoint and headers.

If nothing arrives: check that the headers include `Dash0-Dataset=`, that the token is valid for that dataset, that the
endpoint region matches the token, and (on web) the browser network tab for blocked OTLP requests.

## 10. Optional follow-ups (not part of this change)

- Backend telemetry for the Lambda functions and AppSync resolvers with OpenTelemetry. Not added here because it changes
  every function and needs account-level decisions.
- CloudWatch logs and metrics to Dash0 through Kinesis Data Firehose, as done in the `nexus-share` repository
  (`backend/src/dash0-cdk` and `backend/DASH0_INTEGRATION.md`). If you do this, store the Dash0 API key in AWS Secrets
  Manager as `dash0/api-key` with the format `{"api_key":"Bearer auth_xxx"}`. This secret is not needed for the Flutter
  integration.

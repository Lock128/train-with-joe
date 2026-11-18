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
| `FLUTTER_OTLP_ENDPOINT` | fallback for all environments | same format as above |
| `FLUTTER_OTLP_HEADERS` | fallback for all environments | same format as above |

The `NONPROD_`/`PROD_` secrets win. The unprefixed `FLUTTER_OTLP_*` secrets are used only when the prefixed one is
empty. Header format rules:

- Comma separated `key=value` pairs, no spaces around the comma, no quotes.
- `Authorization=Bearer <token>` is required, `Dash0-Dataset=<dataset>` is required. The workflow fails the build when
  the headers are set but lack `Dash0-Dataset=`.
- Leave a secret empty to disable telemetry for that environment.

The workflow writes `frontend/src/otlp_config.json` (gitignored) and builds with
`--dart-define-from-file=otlp_config.json`. Header values are never printed to the log.

## 3. Mobile builds (Codemagic)

There is no `codemagic.yaml` in this repository. Mobile builds are configured in the Codemagic UI, with the Amplify
values from `scripts/extract-codemagic-env.sh`. Add these environment variables to the Codemagic group of each
environment (mark the headers as secure):

| Variable | Value |
| --- | --- |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `https://ingress.<region>.aws.dash0.com` |
| `OTEL_EXPORTER_OTLP_HEADERS` | `Authorization=Bearer <token>,Dash0-Dataset=<dataset>` (secure) |
| `DASH0_ENVIRONMENT` | `beta` or `production` (becomes `deployment.environment.name`) |

Then append the defines to the existing build commands in the Codemagic workflow, next to the Amplify defines:

```bash
cd frontend/src
flutter build apk --release \
  --dart-define=OTEL_EXPORTER_OTLP_ENDPOINT="$OTEL_EXPORTER_OTLP_ENDPOINT" \
  --dart-define=OTEL_EXPORTER_OTLP_HEADERS="$OTEL_EXPORTER_OTLP_HEADERS" \
  --dart-define=DASH0_ENVIRONMENT="$DASH0_ENVIRONMENT"

flutter build ipa --release \
  --dart-define=OTEL_EXPORTER_OTLP_ENDPOINT="$OTEL_EXPORTER_OTLP_ENDPOINT" \
  --dart-define=OTEL_EXPORTER_OTLP_HEADERS="$OTEL_EXPORTER_OTLP_HEADERS" \
  --dart-define=DASH0_ENVIRONMENT="$DASH0_ENVIRONMENT"
```

Alternatively write a JSON file in a script step and use `--dart-define-from-file=otlp_config.json`, like the GitHub
workflows do:

```bash
jq -n --arg e "$OTEL_EXPORTER_OTLP_ENDPOINT" --arg h "$OTEL_EXPORTER_OTLP_HEADERS" --arg env "$DASH0_ENVIRONMENT" \
  '{OTEL_EXPORTER_OTLP_ENDPOINT: $e, OTEL_EXPORTER_OTLP_HEADERS: $h, DASH0_ENVIRONMENT: $env}' \
  > frontend/src/otlp_config.json
```

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

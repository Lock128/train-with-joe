# Join Page - Angular Landing Page

This is the landing page for Train with Joe, built with Angular 20+ standalone components.

## Features

- **Hero Section**: Eye-catching header with value proposition and call-to-action
- **Features Section**: Showcase of key platform capabilities
- **Technology Stack Section**: Overview of technologies used
- **CTA/Register Section**: Email registration form
- **Responsive Design**: Mobile-first design that works on all devices

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Structure

- `src/app/pages/home.component.ts` - Main landing page component
- `src/app/pages/home.component.html` - Landing page template
- `src/app/pages/home.component.css` - Landing page styles
- `src/app/shell.component.ts` - Root shell component
- `src/app/app.routes.ts` - Application routes

## Customization

1. Update the `registerUrl` in `home.component.ts` to point to your Flutter app
2. Customize colors in the CSS files to match your brand
3. Update meta tags in `src/index.html` for SEO
4. Replace placeholder content with your actual product information

## Deployment

The built application can be deployed to:
- AWS S3 + CloudFront
- Netlify
- Vercel
- Any static hosting service

Build output is in the `dist/` directory after running `npm run build`

!!
## Dash0 web SDK

The app reports browser telemetry (page views, navigation, errors, web vitals) with [`@dash0/sdk-web`](https://github.com/dash0hq/dash0-sdk-web). `initDash0()` in `src/dash0.ts` runs before Angular bootstraps (`src/main.ts`).

Before every build or dev server start, `scripts/generate-dash0-config.mjs` writes the gitignored `src/dash0-config.generated.ts` from these environment variables (the same ones the Flutter build uses):

| Variable | Purpose |
| --- | --- |
| `OTLP_ENDPOINT` | Dash0 OTLP endpoint |
| `OTLP_HEADERS` | `Authorization=Bearer <token>,Dash0-Dataset=<dataset>` (the dataset is required) |
| `DASH0_ENVIRONMENT`, `DASH0_DEPLOYMENT_ID` | Deployment resource attributes |
| `DASH0_VCS_REVISION`, `DASH0_VCS_REF_NAME`, `DASH0_VCS_REPOSITORY_URL` | VCS resource attributes |

Without `OTLP_ENDPOINT` and a bearer token the SDK stays disabled, so local development and builds without secrets are unaffected. The token is shipped in the browser bundle, so use a Dash0 token that can only ingest telemetry, never an admin token.

## OTLP secret fallback chain

CI passes the first complete endpoint and headers pair (never mixed across pairs):

- Non-production: `NONPROD_FLUTTER_OTLP_*`, then legacy `FLUTTER_OTLP_*`
- Production: `PROD_FLUTTER_OTLP_*`

Locally, `scripts/generate-dash0-config.mjs` also reads `PROD_FLUTTER_OTLP_*` (`DASH0_ENVIRONMENT` production, prod or teamcorner) or `NONPROD_FLUTTER_OTLP_*` (any other value) when `OTLP_*`, `FLUTTER_OTLP_*` and `OTEL_EXPORTER_OTLP_*` are empty. With `DASH0_ENVIRONMENT` unset it tries PROD_ first, then NONPROD_.

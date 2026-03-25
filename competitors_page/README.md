# Competitor Comparison Pages

This Angular application provides competitor comparison pages for the SaaS template, showcasing advantages over competing tools.

## Development

### Prerequisites
- Node.js 18+
- Angular CLI 20+

### Setup
```bash
cd competitors_page
npm install
```

### Development Server
```bash
npm start
```
Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

### Build
```bash
npm run build
```
The build artifacts will be stored in the `dist/` directory.

### Testing
```bash
npm test
```

## Project Structure

```
src/
├── app/
│   ├── components/
│   │   ├── comparison-overview/     # Main comparison page
│   │   ├── competitor-detail/       # Individual competitor pages
│   │   ├── comparison-table/        # Comparison table component
│   │   └── header/                  # Page header component
│   ├── services/                    # Data services
│   ├── models/                      # TypeScript interfaces
│   ├── app.component.ts            # Root component
│   ├── app.config.ts               # App configuration
│   └── app.routes.ts               # Routing configuration
├── assets/
│   ├── config/                     # Competitor data configuration
│   ├── images/                     # Images and logos
│   └── styles/                     # Additional stylesheets
├── index.html                      # Main HTML file
├── main.ts                         # Bootstrap file
└── styles.scss                     # Global styles
```

## Routing

- `/` - Overview comparison page
- `/:competitor` - Individual competitor comparison

## Features

- Feature comparison matrix
- Pricing comparison tables
- Responsive design (320px-2560px viewports)
- SEO optimization
- Analytics integration
- Accessibility compliance

## Deployment

This application will be deployed as part of the CDK infrastructure!
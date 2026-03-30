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

!!!

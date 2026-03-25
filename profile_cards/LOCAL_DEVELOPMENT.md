# Local Development Setup

This document describes how to set up and run the profile cards application locally for development.

## Prerequisites

- Node.js (v18 or higher)
- npm (v9 or higher)

## Installation

1. Install dependencies:
```bash
cd profile-cards
npm install
```

## Running the Development Server

Start the development server with mock data:

```bash
npm start
```

Or alternatively:

```bash
npm run dev
```

The application will be available at `http://localhost:4300`

## Mock Data

The application uses mock data for local development, located in `src/assets/mock-data/`:

### User Profile Data
- `users/test-user-1.json` - Sarah Johnson (247 posts, rank #3 in posts)
- `users/test-user-2.json` - Michael Chen (412 posts, rank #1 in posts)
- `users/test-user-3.json` - Emma Rodriguez (156 posts, rank #12 in posts)

### Leaderboard Data
- `leaderboard/posts.json` - Top 25 users by total posts
- `leaderboard/ai-usage.json` - Top 25 users by AI usage

## Proxy Configuration

The development server uses a proxy configuration (`proxy.conf.json`) to simulate the production API structure:

- `/users/*` → `/assets/mock-data/users/*`
- `/leaderboard/*` → `/assets/mock-data/leaderboard/*`

This allows the application to fetch data using production-like URLs (e.g., `/users/test-user-1.json`) while serving static mock files during development.

## Testing the Setup

You can test the proxy and mock data using curl:

```bash
# Test user profile
curl http://localhost:4300/users/test-user-1.json

# Test leaderboard
curl http://localhost:4300/leaderboard/posts.json
curl http://localhost:4300/leaderboard/ai-usage.json
```

## Available Routes

- `/` - Landing page
- `/:userId` - User profile card (e.g., `/test-user-1`)
- `/leaderboard` - Leaderboard page

## Development Workflow

1. Start the development server: `npm start`
2. Make changes to the code
3. The browser will automatically reload with your changes
4. Test with the mock data to verify functionality

## Adding More Mock Data

To add more mock users:

1. Create a new JSON file in `src/assets/mock-data/users/` following the `ProfileCardData` interface
2. Update the leaderboard files to include the new user
3. The new user will be accessible at `/users/<userId>.json`

## Building for Production

To build the application for production:

```bash
npm run build:production
```

The build artifacts will be stored in the `dist/` directory.

## Troubleshooting

### Port Already in Use

If port 4300 is already in use, you can specify a different port:

```bash
ng serve --port 4301
```

### Proxy Not Working

If the proxy isn't working correctly:

1. Verify `proxy.conf.json` exists in the project root
2. Check that the Angular dev server is using the proxy config (should see it in the console output)
3. Restart the development server

### Mock Data Not Loading

If mock data isn't loading:

1. Verify the files exist in `src/assets/mock-data/`
2. Check the browser console for 404 errors
3. Verify the file paths match the expected structure
4. Try accessing the files directly at `http://localhost:4300/assets/mock-data/users/test-user-1.json`

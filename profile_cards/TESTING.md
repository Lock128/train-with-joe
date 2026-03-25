# Profile Cards Testing Guide

## Overview

This document describes the testing setup and test files for the Train with Joe Profile Cards Angular application.

## Test Files

The following test files have been created:

### Component Tests
- `src/app/components/profile-card/profile-card.component.spec.ts` - Tests for ProfileCardComponent
- `src/app/components/leaderboard/leaderboard.component.spec.ts` - Tests for LeaderboardComponent

### Service Tests
- `src/app/services/profile-card.service.spec.ts` - Tests for ProfileCardService
- `src/app/services/leaderboard.service.spec.ts` - Tests for LeaderboardService

## Setting Up Testing Infrastructure

The Angular project currently does not have testing infrastructure configured. To run the tests, you need to set up either Karma/Jasmine or Jest.

### Option 1: Karma/Jasmine (Angular Default)

1. **Install dependencies:**
```bash
npm install --save-dev @angular-devkit/build-angular @angular/core/testing karma karma-jasmine karma-chrome-launcher karma-coverage jasmine-core
```

2. **Create `karma.conf.js` in the profile-cards directory:**
```javascript
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // Jasmine configuration
      },
      clearContext: false
    },
    jasmineHtmlReporter: {
      suppressAll: true
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'text-summary' }
      ]
    },
    reporters: ['progress', 'coverage'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    singleRun: false,
    restartOnFileChange: true
  });
};
```

3. **Add test configuration to `angular.json`:**
```json
{
  "projects": {
    "train-with-joe-profile-cards": {
      "architect": {
        "test": {
          "builder": "@angular-devkit/build-angular:karma",
          "options": {
            "polyfills": ["zone.js", "zone.js/testing"],
            "tsConfig": "tsconfig.spec.json",
            "assets": ["src/assets"],
            "styles": ["src/styles.css"],
            "scripts": []
          }
        }
      }
    }
  }
}
```

4. **Create `tsconfig.spec.json`:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jasmine"]
  },
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

5. **Add test script to `package.json`:**
```json
{
  "scripts": {
    "test": "ng test",
    "test:ci": "ng test --watch=false --browsers=ChromeHeadless"
  }
}
```

6. **Run tests:**
```bash
npm test
```

### Option 2: Jest (Alternative)

1. **Install dependencies:**
```bash
npm install --save-dev jest @types/jest jest-preset-angular
```

2. **Create `jest.config.js`:**
```javascript
module.exports = {
  preset: 'jest-preset-angular',
  setupFilesAfterEnv: ['<rootDir>/setup-jest.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.spec.ts',
    '!src/main.ts',
    '!src/environments/**'
  ]
};
```

3. **Create `setup-jest.ts`:**
```typescript
import 'jest-preset-angular/setup-jest';
```

4. **Update `tsconfig.spec.json`:**
```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./out-tsc/spec",
    "types": ["jest"]
  },
  "include": ["src/**/*.spec.ts", "src/**/*.d.ts"]
}
```

5. **Add test script to `package.json`:**
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

6. **Run tests:**
```bash
npm test
```

## Test Coverage

The test files cover the following functionality:

### ProfileCardComponent Tests
- Component creation
- Loading profile card data on initialization
- Displaying user metrics correctly
- Handling loading states
- Handling error states
- Displaying error messages
- Displaying recent posts
- Displaying leaderboard rankings
- Handling profile cards without rankings

### LeaderboardComponent Tests
- Component creation
- Loading posts leaderboard by default
- Switching between leaderboard tabs
- Displaying leaderboard entries
- Displaying rank numbers
- Handling loading states
- Handling error states
- Filtering leaderboard entries
- Case-insensitive filtering
- Handling empty leaderboards

### ProfileCardService Tests
- Service creation
- Fetching profile card data
- Handling HTTP errors (404, network errors)
- Making multiple requests for different users
- Handling malformed JSON responses

### LeaderboardService Tests
- Service creation
- Fetching posts leaderboard
- Fetching AI usage leaderboard
- Handling HTTP errors
- Handling network errors
- Making separate requests for different leaderboard types
- Handling empty leaderboards
- Handling malformed JSON responses

## Running Tests

Once the testing infrastructure is set up:

### Run all tests
```bash
npm test
```

### Run tests in watch mode
```bash
npm test -- --watch
```

### Run tests with coverage
```bash
npm test -- --coverage
```

### Run specific test file
```bash
npm test -- profile-card.component.spec.ts
```

## CI/CD Integration

To integrate tests into CI/CD pipeline, add the following to your GitHub Actions workflow:

```yaml
- name: Run Angular tests
  working-directory: profile-cards
  run: |
    npm install
    npm test -- --watch=false --browsers=ChromeHeadless
```

## Troubleshooting

### Chrome not found
If you get "Chrome not found" errors, install Chrome or use ChromeHeadless:
```bash
npm test -- --browsers=ChromeHeadless
```

### Module not found errors
Ensure all dependencies are installed:
```bash
npm install
```

### TypeScript errors
Check that `tsconfig.spec.json` is properly configured and includes all test files.

### Test timeout errors
Increase the timeout in your test configuration:
```javascript
// In karma.conf.js
browserNoActivityTimeout: 60000
```

## Best Practices

1. **Keep tests focused**: Each test should test one specific behavior
2. **Use descriptive test names**: Test names should clearly describe what is being tested
3. **Mock external dependencies**: Use spies and mocks for services and HTTP calls
4. **Test error cases**: Always test both success and error scenarios
5. **Maintain test coverage**: Aim for at least 80% code coverage
6. **Run tests before committing**: Ensure all tests pass before pushing code

## Future Enhancements

- Add E2E tests using Cypress or Playwright
- Add visual regression tests
- Add performance tests
- Add accessibility tests
- Integrate with code coverage tools (Codecov, Coveralls)

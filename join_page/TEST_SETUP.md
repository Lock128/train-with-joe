# Test Setup Instructions

The join_page has test files created but requires additional setup to run tests.

## Installing Test Dependencies

To enable testing, run:

```bash
npm install --save-dev @angular/testing @types/jasmine jasmine-core karma karma-chrome-launcher karma-coverage karma-jasmine karma-jasmine-html-reporter
```

## Test Configuration

After installing dependencies, create `karma.conf.js`:

```javascript
module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {},
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
    reporters: ['progress', 'kjhtml'],
    browsers: ['Chrome'],
    restartOnFileChange: true
  });
};
```

## Running Tests

Once configured:

```bash
# Run tests
npm test

# Run tests with coverage
npm test -- --code-coverage

# Run tests in headless mode (CI)
npm test -- --browsers=ChromeHeadless --watch=false
```

## Test Files

- `src/app/pages/home.component.spec.ts` - Unit tests for home component
  - Includes Property 9: Landing Page Responsiveness test
  - Tests hero, features, and CTA sections
  - Tests form validation and submission
  - Tests responsive behavior across viewport widths

## Property-Based Test

The responsiveness test (Property 9) validates that the landing page renders correctly across viewport widths from 320px to 2560px without horizontal scrolling. This is implemented as a parameterized test that checks multiple viewport widths.

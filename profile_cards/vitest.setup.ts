import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';

// Initialize the Angular testing environment only if not already initialized
try {
  const testBed = getTestBed();
  if (!testBed.platform) {
    testBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
  }
} catch (error) {
  // Already initialized, ignore
}

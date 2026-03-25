import 'zone.js';
import 'zone.js/testing';
import { getTestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { beforeEach, afterEach, describe, it, expect, vi, test } from 'vitest';

// Declare globals with proper typing
declare global {
  var beforeEach: typeof beforeEach;
  var afterEach: typeof afterEach;
  var describe: typeof describe;
  var it: typeof it;
  var expect: typeof expect;
  var vi: typeof vi;
  var test: typeof test;
}

// Define the extended global type
type GlobalWithVitest = typeof globalThis & {
  beforeEach: typeof beforeEach;
  afterEach: typeof afterEach;
  describe: typeof describe;
  it: typeof it;
  expect: typeof expect;
  vi: typeof vi;
  test: typeof test;
};

// Make Vitest globals available
const globalWithVitest = globalThis as GlobalWithVitest;
globalWithVitest.beforeEach = beforeEach;
globalWithVitest.afterEach = afterEach;
globalWithVitest.describe = describe;
globalWithVitest.it = it;
globalWithVitest.expect = expect;
globalWithVitest.vi = vi;
globalWithVitest.test = test;

// Initialize TestBed once for the entire test suite
let testBedInitialized = false;

function initializeTestBed() {
  if (testBedInitialized) {
    return;
  }

  try {
    const testBed = getTestBed();

    // Check if TestBed is already initialized
    if (!testBed.platform) {
      testBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
      testBedInitialized = true;
      console.log('[Competitor Comparison] TestBed initialized successfully');
    } else {
      testBedInitialized = true;
      console.log('[Competitor Comparison] TestBed already initialized, reusing existing platform');
    }
  } catch (error) {
    // If TestBed initialization fails, log but continue
    console.warn('[Competitor Comparison] TestBed initialization warning:', error);
    testBedInitialized = true;
  }
}

// Initialize TestBed immediately
initializeTestBed();

// Clean up after each test
afterEach(() => {
  try {
    const testBed = getTestBed();
    if (testBed.platform) {
      testBed.resetTestingModule();
    }
  } catch (error) {
    // Ignore cleanup errors
  }
});

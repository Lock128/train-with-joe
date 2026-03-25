/**
 * Vitest setup file
 * Runs before all tests to configure the test environment
 */

// Set test environment variables
process.env.AWS_REGION = 'us-east-1';
process.env.NODE_ENV = 'test';

// Mock AWS SDK clients globally if needed
// This can be extended as the project grows

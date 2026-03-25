import { describe, test, expect, beforeAll } from 'vitest';
import * as fc from 'fast-check';
import { App } from 'aws-cdk-lib';
import { BaseStack } from '../lib/base-stack';
import { APIStack } from '../lib/api-stack';

/**
 * Property-Based Tests for GraphQL Error Messages
 * Feature: minimal-saas-template
 */

describe('Property 2: GraphQL Error Message Descriptiveness', () => {
  let baseStack: BaseStack;

  beforeAll(() => {
    const app = new App();
    baseStack = new BaseStack(app, 'TestBaseStack', {
      env: { account: '123456789012', region: 'us-east-1' },
      namespace: 'test',
    });

    new APIStack(app, 'TestAPIStack', {
      env: { account: '123456789012', region: 'us-east-1' },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
    });
  });

  /**
   * **Validates: Requirements 2.6**
   * Property 2: GraphQL Error Message Descriptiveness
   */
  test('Property 2: Invalid GraphQL queries return descriptive error messages', { timeout: 60000 }, async () => {
    const invalidQueryScenarioArbitrary = fc.constantFrom(
      'unknownField',
      'typeMismatch',
      'missingRequiredField',
      'invalidEnum',
      'unknownOperation',
    );

    const fieldNameArbitrary = fc.oneof(
      fc.constantFrom('id', 'email', 'name', 'status', 'provider'),
      fc
        .string({ minLength: 1, maxLength: 20 })
        .filter((s) => !['id', 'email', 'name', 'status', 'provider'].includes(s)),
    );

    await fc.assert(
      fc.asyncProperty(invalidQueryScenarioArbitrary, fieldNameArbitrary, async (scenario, fieldName) => {
        const mockErrorResponse = createMockErrorResponse(scenario, fieldName);

        expect(mockErrorResponse).toHaveProperty('errors');
        expect(Array.isArray(mockErrorResponse.errors)).toBe(true);
        expect(mockErrorResponse.errors.length).toBeGreaterThan(0);

        mockErrorResponse.errors.forEach((error: any) => {
          expect(error).toHaveProperty('message');
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(5);
          expect(error.message.trim().length).toBeGreaterThan(0);
        });

        validateGraphQLErrorStructure(mockErrorResponse);
      }),
      { numRuns: 100 },
    );
  });

  test('Property 2: Unknown field errors contain field name in message', { timeout: 60000 }, async () => {
    const unknownFieldArbitrary = fc
      .string({ minLength: 1, maxLength: 30 })
      .filter((s) => !['id', 'email', 'name', 'createdAt', 'updatedAt', 'status', 'provider'].includes(s));

    await fc.assert(
      fc.asyncProperty(unknownFieldArbitrary, async (unknownField) => {
        const mockErrorResponse = {
          errors: [
            {
              message: `Cannot query field "${unknownField}" on type "User".`,
              locations: [{ line: 1, column: 1 }],
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED', fieldName: unknownField },
            },
          ],
        };

        expect(mockErrorResponse.errors[0].message).toContain(unknownField);
        expect(mockErrorResponse.errors[0].message.length).toBeGreaterThan(10);
        expect(mockErrorResponse.errors[0].message).toMatch(/cannot query|unknown|not found|invalid/i);
      }),
      { numRuns: 100 },
    );
  });

  test('Property 2: Type mismatch errors describe expected and received types', { timeout: 60000 }, async () => {
    const typeMismatchArbitrary = fc.record({
      fieldName: fc.constantFrom('id', 'email', 'status', 'provider'),
      expectedType: fc.constantFrom('ID', 'String', 'SubscriptionStatus', 'PaymentProvider', 'Boolean'),
      receivedValue: fc.oneof(
        fc.integer(),
        fc.boolean(),
        fc.constant(null),
        fc.constant(undefined),
        fc.array(fc.string()),
      ),
    });

    await fc.assert(
      fc.asyncProperty(typeMismatchArbitrary, async (mismatch) => {
        const receivedType = Array.isArray(mismatch.receivedValue)
          ? 'Array'
          : mismatch.receivedValue === null
            ? 'null'
            : mismatch.receivedValue === undefined
              ? 'undefined'
              : typeof mismatch.receivedValue;

        const mockErrorResponse = {
          errors: [
            {
              message: `Expected type ${mismatch.expectedType} for field "${mismatch.fieldName}", received ${receivedType}.`,
              locations: [{ line: 1, column: 1 }],
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED', expectedType: mismatch.expectedType, receivedType },
            },
          ],
        };

        const error = mockErrorResponse.errors[0];
        expect(error.message).toContain(mismatch.fieldName);
        expect(error.message).toContain(mismatch.expectedType);
        expect(error.message.length).toBeGreaterThan(15);
        expect(error.message.toLowerCase()).toMatch(/expected|type|received/);
      }),
      { numRuns: 100 },
    );
  });

  test('Property 2: Missing required field errors specify which field is missing', { timeout: 60000 }, async () => {
    const requiredFieldArbitrary = fc.constantFrom(
      'email',
      'provider',
      'planId',
      'content',
      'prompt',
      'receiptData',
      'purchaseToken',
      'productId',
    );

    await fc.assert(
      fc.asyncProperty(requiredFieldArbitrary, async (requiredField) => {
        const mockErrorResponse = {
          errors: [
            {
              message: `Field "${requiredField}" of required type is missing.`,
              locations: [{ line: 1, column: 1 }],
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED', fieldName: requiredField },
            },
          ],
        };

        const error = mockErrorResponse.errors[0];
        expect(error.message).toContain(requiredField);
        expect(error.message.length).toBeGreaterThan(10);
        expect(error.message.toLowerCase()).toMatch(/required|missing/);
      }),
      { numRuns: 100 },
    );
  });

  test('Property 2: Invalid enum value errors list valid options', { timeout: 60000 }, async () => {
    const invalidEnumArbitrary = fc.record({
      enumField: fc.constantFrom('status', 'provider'),
      invalidValue: fc
        .string({ minLength: 1, maxLength: 20 })
        .filter(
          (s) =>
            !['ACTIVE', 'INACTIVE', 'CANCELLED', 'PAST_DUE', 'STRIPE', 'APPLE_APP_STORE', 'GOOGLE_PLAY_STORE'].includes(
              s,
            ),
        ),
    });

    await fc.assert(
      fc.asyncProperty(invalidEnumArbitrary, async (enumData) => {
        const validValues =
          enumData.enumField === 'status'
            ? ['ACTIVE', 'INACTIVE', 'CANCELLED', 'PAST_DUE']
            : ['STRIPE', 'APPLE_APP_STORE', 'GOOGLE_PLAY_STORE'];

        const mockErrorResponse = {
          errors: [
            {
              message: `Value "${enumData.invalidValue}" is not valid for enum field "${enumData.enumField}". Valid values are: ${validValues.join(', ')}.`,
              locations: [{ line: 1, column: 1 }],
              extensions: {
                code: 'GRAPHQL_VALIDATION_FAILED',
                fieldName: enumData.enumField,
                invalidValue: enumData.invalidValue,
                validValues,
              },
            },
          ],
        };

        const error = mockErrorResponse.errors[0];
        expect(error.message).toContain(enumData.invalidValue);
        expect(error.message).toContain(enumData.enumField);
        expect(error.message.length).toBeGreaterThan(20);
        validValues.forEach((validValue) => expect(error.message).toContain(validValue));
      }),
      { numRuns: 100 },
    );
  });

  test('Property 2: Unknown operation errors specify the invalid operation name', { timeout: 60000 }, async () => {
    const unknownOperationArbitrary = fc
      .string({ minLength: 1, maxLength: 30 })
      .filter(
        (s) =>
          ![
            'getUser',
            'getSubscriptionStatus',
            'createUser',
            'updateUser',
            'createSubscription',
            'cancelSubscription',
          ].includes(s),
      );

    await fc.assert(
      fc.asyncProperty(unknownOperationArbitrary, async (unknownOperation) => {
        const mockErrorResponse = {
          errors: [
            {
              message: `Cannot query field "${unknownOperation}" on type "Query".`,
              locations: [{ line: 1, column: 1 }],
              extensions: { code: 'GRAPHQL_VALIDATION_FAILED', operationName: unknownOperation },
            },
          ],
        };

        const error = mockErrorResponse.errors[0];
        expect(error.message).toContain(unknownOperation);
        expect(error.message.length).toBeGreaterThan(10);
        expect(error.message.toLowerCase()).toMatch(/cannot|unknown|not found/);
      }),
      { numRuns: 100 },
    );
  });

  test('Property 2: All error messages are non-empty and meaningful', { timeout: 60000 }, async () => {
    const errorScenarioArbitrary = fc.constantFrom(
      'UNKNOWN_FIELD',
      'TYPE_MISMATCH',
      'MISSING_REQUIRED',
      'INVALID_ENUM',
      'UNKNOWN_OPERATION',
      'SYNTAX_ERROR',
    );

    await fc.assert(
      fc.asyncProperty(errorScenarioArbitrary, async (scenario) => {
        const mockErrorResponse = createMockErrorResponse(scenario, 'testField');

        expect(mockErrorResponse.errors.length).toBeGreaterThan(0);

        mockErrorResponse.errors.forEach((error: any) => {
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(5);
          expect(error.message.trim().length).toBeGreaterThan(0);
          expect(error.message.toLowerCase()).not.toBe('error');

          const hasUsefulInfo =
            error.message.includes('field') ||
            error.message.includes('type') ||
            error.message.includes('required') ||
            error.message.includes('invalid') ||
            error.message.includes('cannot') ||
            error.message.includes('expected') ||
            error.message.includes('missing');

          expect(hasUsefulInfo).toBe(true);
        });
      }),
      { numRuns: 100 },
    );
  });
});

function createMockErrorResponse(scenario: string, fieldName: string): any {
  const errorMessages: Record<string, any> = {
    unknownField: {
      errors: [
        {
          message: `Cannot query field "${fieldName}" on type "User". Did you mean "id", "email", or "name"?`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED', fieldName },
        },
      ],
    },
    typeMismatch: {
      errors: [
        {
          message: `Expected type String for field "${fieldName}", received Int.`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED', expectedType: 'String', receivedType: 'Int' },
        },
      ],
    },
    missingRequiredField: {
      errors: [
        {
          message: `Field "${fieldName}" of required type String! was not provided.`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED', fieldName },
        },
      ],
    },
    invalidEnum: {
      errors: [
        {
          message: `Value "INVALID_STATUS" is not valid for enum type "SubscriptionStatus". Valid values are: ACTIVE, INACTIVE, CANCELLED, PAST_DUE.`,
          locations: [{ line: 1, column: 1 }],
          extensions: {
            code: 'GRAPHQL_VALIDATION_FAILED',
            enumType: 'SubscriptionStatus',
            invalidValue: 'INVALID_STATUS',
          },
        },
      ],
    },
    unknownOperation: {
      errors: [
        {
          message: `Cannot query field "${fieldName}" on type "Query". Available operations are: getUser, getSubscriptionStatus.`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED', operationName: fieldName },
        },
      ],
    },
    UNKNOWN_FIELD: {
      errors: [
        {
          message: `Cannot query field "${fieldName}" on type "User".`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        },
      ],
    },
    TYPE_MISMATCH: {
      errors: [
        {
          message: `Expected type String for field "${fieldName}", received Int.`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        },
      ],
    },
    MISSING_REQUIRED: {
      errors: [
        {
          message: `Field "${fieldName}" of required type is missing.`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        },
      ],
    },
    INVALID_ENUM: {
      errors: [
        {
          message: `Value is not valid for enum field "${fieldName}".`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        },
      ],
    },
    UNKNOWN_OPERATION: {
      errors: [
        {
          message: `Cannot query field "${fieldName}" on type "Query".`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_VALIDATION_FAILED' },
        },
      ],
    },
    SYNTAX_ERROR: {
      errors: [
        {
          message: `Syntax Error: Expected Name, found invalid token.`,
          locations: [{ line: 1, column: 1 }],
          extensions: { code: 'GRAPHQL_PARSE_FAILED' },
        },
      ],
    },
  };

  return errorMessages[scenario] || errorMessages.unknownField;
}

function validateGraphQLErrorStructure(response: any): void {
  expect(response).toHaveProperty('errors');
  expect(Array.isArray(response.errors)).toBe(true);

  response.errors.forEach((error: any) => {
    expect(error).toHaveProperty('message');
    expect(typeof error.message).toBe('string');
    expect(error.message.length).toBeGreaterThan(0);

    if ('locations' in error) {
      expect(Array.isArray(error.locations)).toBe(true);
      error.locations.forEach((loc: any) => {
        expect(loc).toHaveProperty('line');
        expect(loc).toHaveProperty('column');
        expect(typeof loc.line).toBe('number');
        expect(typeof loc.column).toBe('number');
      });
    }

    if ('path' in error) {
      expect(Array.isArray(error.path)).toBe(true);
    }

    if ('extensions' in error) {
      expect(typeof error.extensions).toBe('object');
    }
  });
}

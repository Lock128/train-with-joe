import { describe, test, expect, beforeEach, vi } from 'vitest';
import { mockClient } from 'aws-sdk-client-mock';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { PostConfirmationConfirmSignUpTriggerEvent } from 'aws-lambda';

const ddbMock = mockClient(DynamoDBDocumentClient);
const sesMock = mockClient(SESClient);

describe('Mutation.createUser - PostConfirmation Lambda', () => {
  beforeEach(() => {
    ddbMock.reset();
    sesMock.reset();
    vi.stubEnv('USERS_TABLE_NAME', 'test-users-table');
    vi.stubEnv('ADMIN_NOTIFICATION_EMAIL', 'admin@trainwithjoe.app');
    vi.stubEnv('SES_FROM_EMAIL', 'noreply@trainwithjoe.app');
  });

  function buildPostConfirmationEvent(
    overrides: Partial<PostConfirmationConfirmSignUpTriggerEvent> = {},
  ): PostConfirmationConfirmSignUpTriggerEvent {
    return {
      version: '1',
      region: 'eu-central-1',
      userPoolId: 'eu-central-1_abc123',
      userName: 'testuser',
      callerContext: {
        awsSdkVersion: '3.0.0',
        clientId: 'client-id',
      },
      triggerSource: 'PostConfirmation_ConfirmSignUp',
      request: {
        userAttributes: {
          sub: 'user-uuid-123',
          email: 'user@example.com',
          name: 'Test User',
          email_verified: 'true',
        },
      },
      response: {},
      ...overrides,
    } as PostConfirmationConfirmSignUpTriggerEvent;
  }

  test('creates a DynamoDB user record with correct fields', async () => {
    ddbMock.on(PutCommand).resolves({});
    sesMock.on(SendEmailCommand).resolves({});

    const { handler } = await import('../src/gql-lambda-functions/Mutation.createUser');
    const event = buildPostConfirmationEvent();

    await handler(event);

    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(1);

    const item = putCalls[0].args[0].input.Item;
    expect(item).toBeDefined();
    expect(item!.id).toBe('user-uuid-123');
    expect(item!.email).toBe('user@example.com');
    expect(item!.name).toBe('Test User');
    expect(item!.subscriptionStatus).toBe('INACTIVE');
    expect(item!.subscriptionProvider).toBeNull();
    expect(item!.tier).toBe('FREE');
    expect(item!.tierSource).toBe('SUBSCRIPTION');
    expect(item!.createdAt).toBeDefined();
    expect(item!.updatedAt).toBeDefined();
  });

  test('sends email with subject "New User Signup - Train with Joe"', async () => {
    ddbMock.on(PutCommand).resolves({});
    sesMock.on(SendEmailCommand).resolves({});

    const { handler } = await import('../src/gql-lambda-functions/Mutation.createUser');
    const event = buildPostConfirmationEvent();

    await handler(event);

    const sesCalls = sesMock.commandCalls(SendEmailCommand);
    expect(sesCalls).toHaveLength(1);

    const input = sesCalls[0].args[0].input;
    expect(input.Message?.Subject?.Data).toBe('New User Signup - Train with Joe');
  });

  test('returns event unchanged for non-PostConfirmation_ConfirmSignUp triggerSource', async () => {
    const { handler } = await import('../src/gql-lambda-functions/Mutation.createUser');
    const event = buildPostConfirmationEvent({
      triggerSource: 'PostConfirmation_ConfirmForgotPassword' as never,
    });

    const result = await handler(event);

    expect(result).toEqual(event);
    const putCalls = ddbMock.commandCalls(PutCommand);
    expect(putCalls).toHaveLength(0);
    const sesCalls = sesMock.commandCalls(SendEmailCommand);
    expect(sesCalls).toHaveLength(0);
  });

  test('SES email failure is caught and logged, not thrown', async () => {
    ddbMock.on(PutCommand).resolves({});
    sesMock.on(SendEmailCommand).rejects(new Error('SES rate limit exceeded'));

    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const { handler } = await import('../src/gql-lambda-functions/Mutation.createUser');
    const event = buildPostConfirmationEvent();

    const result = await handler(event);

    // Should not throw - handler completes successfully
    expect(result).toEqual(event);
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to send admin notification email:', expect.any(Error));

    consoleErrorSpy.mockRestore();
  });
});

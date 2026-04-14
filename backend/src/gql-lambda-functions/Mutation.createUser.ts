import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import type { PostConfirmationConfirmSignUpTriggerEvent } from 'aws-lambda';
import { Tier, TierSource } from '../model/domain/User';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sesClient = new SESClient({ region: 'eu-central-1' });

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || '';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@trainwithjoe.app';

/**
 * Cognito Post Confirmation trigger — creates a DynamoDB user record
 * and sends an admin notification email after a user confirms their email.
 */
export const handler = async (event: PostConfirmationConfirmSignUpTriggerEvent) => {
  // Only act on sign-up confirmation, not forgot-password confirmation
  if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
    return event;
  }

  const userId = event.request.userAttributes.sub;
  const email = event.request.userAttributes.email;
  const name = event.request.userAttributes.name || null;
  const now = new Date().toISOString();

  const user = {
    id: userId,
    email,
    name,
    subscriptionStatus: 'INACTIVE',
    subscriptionProvider: null,
    tier: Tier.FREE,
    tierSource: TierSource.SUBSCRIPTION,
    createdAt: now,
    updatedAt: now,
  };

  try {
    await dynamoClient.send(
      new PutCommand({
        TableName: USERS_TABLE_NAME,
        Item: user,
        ConditionExpression: 'attribute_not_exists(id)',
      }),
    );
  } catch (error) {
    const err = error as Error & { name?: string };
    if (err.name === 'ConditionalCheckFailedException') {
      console.log('User already exists in DynamoDB, skipping creation:', userId);
    } else {
      console.error('Error creating user:', error);
      throw error; // Let Cognito know the trigger failed
    }
  }

  // Send admin notification email (fire-and-forget — don't fail the signup)
  if (ADMIN_EMAIL) {
    try {
      await sesClient.send(
        new SendEmailCommand({
          Source: SES_FROM_EMAIL,
          Destination: { ToAddresses: [ADMIN_EMAIL] },
          Message: {
            Subject: { Data: `New User Signup: ${email}` },
            Body: {
              Html: {
                Data: `
                  <h2>New User Signup — Train with Joe</h2>
                  <table style="border-collapse:collapse;font-family:Arial,sans-serif;">
                    <tr><td style="padding:8px;font-weight:bold;">User ID</td><td style="padding:8px;">${userId}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;">${email}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${name || '—'}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;">Signed up at</td><td style="padding:8px;">${now}</td></tr>
                  </table>
                `,
              },
              Text: {
                Data: `New user signup on Train with Joe:\n\nUser ID: ${userId}\nEmail: ${email}\nName: ${name || '—'}\nSigned up at: ${now}`,
              },
            },
          },
        }),
      );
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
    }
  }

  // Cognito requires the event to be returned
  return event;
};

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const sesClient = new SESClient({ region: 'eu-central-1' });

const USERS_TABLE_NAME = process.env.USERS_TABLE_NAME || '';
const ADMIN_EMAIL = process.env.ADMIN_NOTIFICATION_EMAIL || '';
const SES_FROM_EMAIL = process.env.SES_FROM_EMAIL || 'noreply@trainwithjoe.app';

interface CreateUserEvent {
  arguments: {
    input: {
      email: string;
      name?: string;
    };
  };
  identity: {
    sub: string;
    claims: Record<string, string>;
  };
}

export const handler = async (event: CreateUserEvent) => {
  const { input } = event.arguments;
  const identity = event.identity;

  if (!identity?.sub) {
    return { success: false, user: null, error: 'Authentication required' };
  }

  if (!input?.email) {
    return { success: false, user: null, error: 'Email is required' };
  }

  const now = new Date().toISOString();
  const userId = identity.sub;

  const user = {
    id: userId,
    email: input.email,
    name: input.name || null,
    subscriptionStatus: 'INACTIVE',
    subscriptionProvider: null,
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
      return { success: false, user: null, error: 'User already exists' };
    }
    console.error('Error creating user:', error);
    return { success: false, user: null, error: `Failed to create user: ${err.message}` };
  }

  // Send admin notification email (fire-and-forget — don't fail the signup)
  if (ADMIN_EMAIL) {
    try {
      await sesClient.send(
        new SendEmailCommand({
          Source: SES_FROM_EMAIL,
          Destination: { ToAddresses: [ADMIN_EMAIL] },
          Message: {
            Subject: { Data: `New User Signup: ${input.email}` },
            Body: {
              Html: {
                Data: `
                  <h2>New User Signup — Train with Joe</h2>
                  <table style="border-collapse:collapse;font-family:Arial,sans-serif;">
                    <tr><td style="padding:8px;font-weight:bold;">User ID</td><td style="padding:8px;">${userId}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;">Email</td><td style="padding:8px;">${input.email}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;">Name</td><td style="padding:8px;">${input.name || '—'}</td></tr>
                    <tr><td style="padding:8px;font-weight:bold;">Signed up at</td><td style="padding:8px;">${now}</td></tr>
                  </table>
                `,
              },
              Text: {
                Data: `New user signup on Train with Joe:\n\nUser ID: ${userId}\nEmail: ${input.email}\nName: ${input.name || '—'}\nSigned up at: ${now}`,
              },
            },
          },
        }),
      );
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
    }
  }

  return { success: true, user, error: null };
};

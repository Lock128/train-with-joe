import { describe, expect, test } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { BaseStack } from '../lib/base-stack';

describe('BaseStack CDK Integration Tests', () => {
  test('should synthesize stack without errors', { timeout: 60000 }, () => {
    const app = new App();

    // Create the stack
    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    // Synthesize the stack to CloudFormation template
    const template = Template.fromStack(baseStack);

    // Verify the template can be created without errors
    expect(template).toBeDefined();

    // Verify basic structure exists
    const templateJson = template.toJSON();
    expect(templateJson.Resources).toBeDefined();
  });

  test('should create Cognito user pool with correct configuration', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const template = Template.fromStack(baseStack);

    // Verify Cognito user pool exists
    template.hasResourceProperties('AWS::Cognito::UserPool', {
      UserPoolName: 'TrainWithJoe-test',
      AutoVerifiedAttributes: ['email'],
      Policies: {
        PasswordPolicy: {
          MinimumLength: 8,
          RequireLowercase: true,
          RequireNumbers: true,
          RequireSymbols: true,
          RequireUppercase: true,
        },
      },
    });

    // Verify user pool client exists
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
  });

  test('should create DynamoDB users table with correct schema', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const template = Template.fromStack(baseStack);

    // Verify users table exists with correct configuration
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'train-with-joe-users-test',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      StreamSpecification: {
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
    });

    // Verify email GSI exists
    const templateJson = template.toJSON();
    const usersTables = Object.values(templateJson.Resources).filter(
      (resource: any) =>
        resource.Type === 'AWS::DynamoDB::Table' && resource.Properties.TableName === 'train-with-joe-users-test',
    );

    expect(usersTables.length).toBe(1);
    const usersTable = usersTables[0] as any;
    expect(usersTable.Properties.GlobalSecondaryIndexes).toBeDefined();
    expect(usersTable.Properties.GlobalSecondaryIndexes.length).toBeGreaterThanOrEqual(1);

    const emailIndex = usersTable.Properties.GlobalSecondaryIndexes.find((idx: any) => idx.IndexName === 'email-index');
    expect(emailIndex).toBeDefined();
    expect(emailIndex.KeySchema[0].AttributeName).toBe('email');
  });

  test('should create DynamoDB subscriptions table with correct schema', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const template = Template.fromStack(baseStack);

    // Verify subscriptions table exists with correct configuration
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'train-with-joe-subscriptions-test',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      StreamSpecification: {
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
    });

    // Verify userId GSI exists
    const templateJson = template.toJSON();
    const subscriptionsTables = Object.values(templateJson.Resources).filter(
      (resource: any) =>
        resource.Type === 'AWS::DynamoDB::Table' &&
        resource.Properties.TableName === 'train-with-joe-subscriptions-test',
    );

    expect(subscriptionsTables.length).toBe(1);
    const subscriptionsTable = subscriptionsTables[0] as any;
    expect(subscriptionsTable.Properties.GlobalSecondaryIndexes).toBeDefined();
    expect(subscriptionsTable.Properties.GlobalSecondaryIndexes.length).toBeGreaterThanOrEqual(1);

    const userIdIndex = subscriptionsTable.Properties.GlobalSecondaryIndexes.find(
      (idx: any) => idx.IndexName === 'userId-index',
    );
    expect(userIdIndex).toBeDefined();
    expect(userIdIndex.KeySchema[0].AttributeName).toBe('userId');
  });

  test('should create S3 assets bucket', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const template = Template.fromStack(baseStack);

    // Verify S3 bucket exists
    template.resourceCountIs('AWS::S3::Bucket', 1);

    // Verify bucket has versioning enabled
    const templateJson = template.toJSON();
    const buckets = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::S3::Bucket',
    );

    expect(buckets.length).toBe(1);
    const bucket = buckets[0] as any;
    expect(bucket.Properties.VersioningConfiguration).toBeDefined();
    expect(bucket.Properties.VersioningConfiguration.Status).toBe('Enabled');
  });

  test('should create SSM parameters for resource names', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const template = Template.fromStack(baseStack);

    // Verify SSM parameters exist
    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test/config/users-table-name',
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test/config/subscriptions-table-name',
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test/config/cognito-user-pool-id',
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test/config/cognito-frontend-client-id',
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test/config/assets-bucket-name',
    });

    template.hasResourceProperties('AWS::SSM::Parameter', {
      Name: '/test/config/vocabulary-lists-table-name',
    });
  });

  test('should have correct resource counts', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const template = Template.fromStack(baseStack);

    // Verify expected resource counts
    template.resourceCountIs('AWS::Cognito::UserPool', 1);
    template.resourceCountIs('AWS::Cognito::UserPoolClient', 1);
    template.resourceCountIs('AWS::DynamoDB::Table', 3); // users, subscriptions, and vocabulary-lists
    template.resourceCountIs('AWS::S3::Bucket', 1); // assets bucket
  });

  test('should create DynamoDB vocabulary-lists table with correct schema', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const template = Template.fromStack(baseStack);

    // Verify vocabulary-lists table exists with correct configuration
    template.hasResourceProperties('AWS::DynamoDB::Table', {
      TableName: 'train-with-joe-vocabulary-lists-test',
      BillingMode: 'PAY_PER_REQUEST',
      KeySchema: [
        {
          AttributeName: 'id',
          KeyType: 'HASH',
        },
      ],
      StreamSpecification: {
        StreamViewType: 'NEW_AND_OLD_IMAGES',
      },
    });

    // Verify userId GSI exists
    const templateJson = template.toJSON();
    const vocabularyTables = Object.values(templateJson.Resources).filter(
      (resource: any) =>
        resource.Type === 'AWS::DynamoDB::Table' &&
        resource.Properties.TableName === 'train-with-joe-vocabulary-lists-test',
    );

    expect(vocabularyTables.length).toBe(1);
    const vocabularyTable = vocabularyTables[0] as any;
    expect(vocabularyTable.Properties.GlobalSecondaryIndexes).toBeDefined();
    expect(vocabularyTable.Properties.GlobalSecondaryIndexes.length).toBeGreaterThanOrEqual(1);

    const userIdIndex = vocabularyTable.Properties.GlobalSecondaryIndexes.find(
      (idx: any) => idx.IndexName === 'userId-index',
    );
    expect(userIdIndex).toBeDefined();
    expect(userIdIndex.KeySchema[0].AttributeName).toBe('userId');
  });

  test('should configure CORS for assets bucket', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const template = Template.fromStack(baseStack);

    // Verify CORS configuration exists
    const templateJson = template.toJSON();
    const buckets = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::S3::Bucket',
    );

    expect(buckets.length).toBe(1);
    const bucket = buckets[0] as any;
    expect(bucket.Properties.CorsConfiguration).toBeDefined();
    expect(bucket.Properties.CorsConfiguration.CorsRules).toBeDefined();
    expect(bucket.Properties.CorsConfiguration.CorsRules.length).toBeGreaterThan(0);
  });
});

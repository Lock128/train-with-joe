import { describe, expect, test } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { BaseStack } from '../lib/base-stack';
import { APIStack } from '../lib/api-stack';

describe('APIStack CDK Integration Tests', () => {
  test('should synthesize stack without errors', { timeout: 60000 }, () => {
    const app = new App();

    // Create base stack first to get dependencies
    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    // Create API stack
    const apiStack = new APIStack(app, 'TestAPIStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
      vocabularyListsTable: baseStack.vocabularyListsTable,
    });

    // Synthesize the stack to CloudFormation template
    const template = Template.fromStack(apiStack);

    // Verify the template can be created without errors
    expect(template).toBeDefined();

    // Verify basic structure exists
    const templateJson = template.toJSON();
    expect(templateJson.Resources).toBeDefined();
  });

  test('should create AppSync GraphQL API with correct configuration', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const apiStack = new APIStack(app, 'TestAPIStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
      vocabularyListsTable: baseStack.vocabularyListsTable,
    });

    const template = Template.fromStack(apiStack);

    // Verify AppSync API exists
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'train-with-joe-api-test',
      XrayEnabled: true,
      AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
    });
  });

  test('should configure Cognito authentication', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const apiStack = new APIStack(app, 'TestAPIStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
      vocabularyListsTable: baseStack.vocabularyListsTable,
    });

    const template = Template.fromStack(apiStack);

    // Verify Cognito user pool configuration exists
    const templateJson = template.toJSON();
    const apis = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::AppSync::GraphQLApi',
    );

    expect(apis.length).toBe(1);
    const api = apis[0] as any;
    expect(api.Properties.AuthenticationType).toBe('AMAZON_COGNITO_USER_POOLS');
    expect(api.Properties.UserPoolConfig).toBeDefined();
  });

  test('should configure IAM as additional authorization mode', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const apiStack = new APIStack(app, 'TestAPIStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
      vocabularyListsTable: baseStack.vocabularyListsTable,
    });

    const template = Template.fromStack(apiStack);

    // Verify IAM authorization mode exists
    const templateJson = template.toJSON();
    const apis = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::AppSync::GraphQLApi',
    );

    expect(apis.length).toBe(1);
    const api = apis[0] as any;
    expect(api.Properties.AdditionalAuthenticationProviders).toBeDefined();
    expect(api.Properties.AdditionalAuthenticationProviders.length).toBeGreaterThan(0);

    const iamAuth = api.Properties.AdditionalAuthenticationProviders.find(
      (provider: any) => provider.AuthenticationType === 'AWS_IAM',
    );
    expect(iamAuth).toBeDefined();
  });

  test('should enable CloudWatch logging', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const apiStack = new APIStack(app, 'TestAPIStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
      vocabularyListsTable: baseStack.vocabularyListsTable,
    });

    const template = Template.fromStack(apiStack);

    // Verify CloudWatch Logs role exists
    template.hasResourceProperties('AWS::IAM::Role', {
      AssumeRolePolicyDocument: {
        Statement: [
          {
            Action: 'sts:AssumeRole',
            Effect: 'Allow',
            Principal: {
              Service: 'appsync.amazonaws.com',
            },
          },
        ],
      },
    });

    // Verify log configuration exists
    const templateJson = template.toJSON();
    const apis = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::AppSync::GraphQLApi',
    );

    expect(apis.length).toBe(1);
    const api = apis[0] as any;
    expect(api.Properties.LogConfig).toBeDefined();
    expect(api.Properties.LogConfig.FieldLogLevel).toBe('ALL');
  });

  test('should create DynamoDB data sources', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const apiStack = new APIStack(app, 'TestAPIStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
      vocabularyListsTable: baseStack.vocabularyListsTable,
    });

    const template = Template.fromStack(apiStack);

    // Verify data sources exist (2 DynamoDB + 4 Lambda)
    template.resourceCountIs('AWS::AppSync::DataSource', 6);

    // Verify DynamoDB data sources have correct type
    const templateJson = template.toJSON();
    const dataSources = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::AppSync::DataSource',
    );

    expect(dataSources.length).toBe(6);

    // Count data source types
    const dynamoDbSources = dataSources.filter((ds: any) => ds.Properties.Type === 'AMAZON_DYNAMODB');
    const lambdaSources = dataSources.filter((ds: any) => ds.Properties.Type === 'AWS_LAMBDA');

    expect(dynamoDbSources.length).toBe(2); // Users and Subscriptions tables
    expect(lambdaSources.length).toBe(4); // Stripe Checkout + 3 Vocabulary Lambdas
  });

  test('should export API endpoint URL and ID', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const apiStack = new APIStack(app, 'TestAPIStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
      vocabularyListsTable: baseStack.vocabularyListsTable,
    });

    const template = Template.fromStack(apiStack);

    // Verify outputs exist
    const templateJson = template.toJSON();
    expect(templateJson.Outputs).toBeDefined();
    expect(templateJson.Outputs.ApiUrl).toBeDefined();
    expect(templateJson.Outputs.ApiId).toBeDefined();
    expect(templateJson.Outputs.ApiArn).toBeDefined();

    // Verify export names
    expect(templateJson.Outputs.ApiUrl.Export).toBeDefined();
    expect(templateJson.Outputs.ApiUrl.Export.Name).toBe('test-api-url');
    expect(templateJson.Outputs.ApiId.Export).toBeDefined();
    expect(templateJson.Outputs.ApiId.Export.Name).toBe('test-api-id');
    expect(templateJson.Outputs.ApiArn.Export).toBeDefined();
    expect(templateJson.Outputs.ApiArn.Export.Name).toBe('test-api-arn');
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

    const apiStack = new APIStack(app, 'TestAPIStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
      vocabularyListsTable: baseStack.vocabularyListsTable,
    });

    const template = Template.fromStack(apiStack);

    // Verify expected resource counts
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.resourceCountIs('AWS::AppSync::DataSource', 6); // users, subscriptions, and 4 Lambdas

    // Verify at least 3 IAM roles exist (CloudWatch role + 2 data source roles, CDK may create additional service roles)
    const templateJson = template.toJSON();
    const roles = Object.values(templateJson.Resources).filter((resource: any) => resource.Type === 'AWS::IAM::Role');
    expect(roles.length).toBeGreaterThanOrEqual(3);
  });

  test('should enable X-Ray tracing', { timeout: 60000 }, () => {
    const app = new App();

    const baseStack = new BaseStack(app, 'TestBaseStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
    });

    const apiStack = new APIStack(app, 'TestAPIStack', {
      env: {
        account: '123456789012',
        region: 'us-east-1',
      },
      namespace: 'test',
      userPool: baseStack.userPool,
      usersTable: baseStack.usersTable,
      subscriptionsTable: baseStack.subscriptionsTable,
      vocabularyListsTable: baseStack.vocabularyListsTable,
    });

    const template = Template.fromStack(apiStack);

    // Verify X-Ray is enabled
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      XrayEnabled: true,
    });
  });
});

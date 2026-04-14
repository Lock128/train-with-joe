import { beforeAll, describe, expect, test } from 'vitest';
import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';

import { BaseStack } from '../lib/base-stack';
import { APIStack } from '../lib/api-stack';

describe('APIStack CDK Integration Tests', () => {
  let template: Template;
  let templateJson: Record<string, any>;

  // Synthesize the stack ONCE and reuse across all tests
  beforeAll(() => {
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
      trainingsTable: baseStack.trainingsTable,
      usageCountersTable: baseStack.usageCountersTable,
      assetsBucket: baseStack.assetsBucket,
    });

    template = Template.fromStack(apiStack);
    templateJson = template.toJSON();
  }, 120_000); // generous timeout for the single synth

  test('should synthesize stack without errors', () => {
    expect(template).toBeDefined();
    expect(templateJson.Resources).toBeDefined();
  });

  test('should create AppSync GraphQL API with correct configuration', () => {
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      Name: 'train-with-joe-api-test',
      XrayEnabled: true,
      AuthenticationType: 'AMAZON_COGNITO_USER_POOLS',
    });
  });

  test('should configure Cognito authentication', () => {
    const apis = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::AppSync::GraphQLApi',
    );

    expect(apis.length).toBe(1);
    const api = apis[0] as any;
    expect(api.Properties.AuthenticationType).toBe('AMAZON_COGNITO_USER_POOLS');
    expect(api.Properties.UserPoolConfig).toBeDefined();
  });

  test('should configure IAM as additional authorization mode', () => {
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

  test('should enable CloudWatch logging', () => {
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

    const apis = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::AppSync::GraphQLApi',
    );

    expect(apis.length).toBe(1);
    const api = apis[0] as any;
    expect(api.Properties.LogConfig).toBeDefined();
    expect(api.Properties.LogConfig.FieldLogLevel).toBe('ALL');
  });

  test('should create DynamoDB data sources', () => {
    // Verify data sources exist (2 DynamoDB + 30 Lambda)
    template.resourceCountIs('AWS::AppSync::DataSource', 32);

    const dataSources = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::AppSync::DataSource',
    );

    expect(dataSources.length).toBe(32);

    const dynamoDbSources = dataSources.filter((ds: any) => ds.Properties.Type === 'AMAZON_DYNAMODB');
    const lambdaSources = dataSources.filter((ds: any) => ds.Properties.Type === 'AWS_LAMBDA');

    expect(dynamoDbSources.length).toBe(2); // Users and Subscriptions tables
    expect(lambdaSources.length).toBe(30); // 30 Lambda data sources
  });

  test('should export API endpoint URL and ID', () => {
    expect(templateJson.Outputs).toBeDefined();
    expect(templateJson.Outputs.ApiUrl).toBeDefined();
    expect(templateJson.Outputs.ApiId).toBeDefined();
    expect(templateJson.Outputs.ApiArn).toBeDefined();

    expect(templateJson.Outputs.ApiUrl.Export).toBeDefined();
    expect(templateJson.Outputs.ApiUrl.Export.Name).toBe('test-api-url');
    expect(templateJson.Outputs.ApiId.Export).toBeDefined();
    expect(templateJson.Outputs.ApiId.Export.Name).toBe('test-api-id');
    expect(templateJson.Outputs.ApiArn.Export).toBeDefined();
    expect(templateJson.Outputs.ApiArn.Export.Name).toBe('test-api-arn');
  });

  test('should have correct resource counts', () => {
    template.resourceCountIs('AWS::AppSync::GraphQLApi', 1);
    template.resourceCountIs('AWS::AppSync::DataSource', 32);

    // Verify at least 3 IAM roles exist (CloudWatch role + 2 data source roles, CDK may create additional service roles)
    const roles = Object.values(templateJson.Resources).filter((resource: any) => resource.Type === 'AWS::IAM::Role');
    expect(roles.length).toBeGreaterThanOrEqual(3);
  });

  test('should create vocabulary analysis Lambda functions with Bedrock permissions', () => {
    template.hasResourceProperties('AWS::Lambda::Function', {
      Runtime: 'nodejs20.x',
      MemorySize: 256,
      Timeout: 30,
    });

    const policies = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::IAM::Policy',
    );

    const bedrockPolicy = policies.find((policy: any) => {
      const statements = policy.Properties?.PolicyDocument?.Statement || [];
      return statements.some((stmt: any) => {
        if (stmt.Effect !== 'Allow') return false;
        const actions = Array.isArray(stmt.Action) ? stmt.Action : [stmt.Action];
        return actions.includes('bedrock:InvokeModel');
      });
    });

    expect(bedrockPolicy).toBeDefined();
  });

  test('should enable X-Ray tracing', () => {
    template.hasResourceProperties('AWS::AppSync::GraphQLApi', {
      XrayEnabled: true,
    });
  });

  test('should pass USAGE_COUNTERS_TABLE_NAME env var to pricing Lambda functions', () => {
    const lambdas = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::Lambda::Function',
    );

    const lambdasWithUsageCounters = lambdas.filter((lambda: any) => {
      const envVars = lambda.Properties?.Environment?.Variables ?? {};
      return envVars.USAGE_COUNTERS_TABLE_NAME !== undefined;
    });

    // At minimum: analyzeImageVocabulary, createTraining, deleteVocabularyList, getUsageLimits, adminSetUserTier, getTierStatistics
    expect(lambdasWithUsageCounters.length).toBeGreaterThanOrEqual(6);
  });

  test('should create Lambda functions for getUsageLimits, adminSetUserTier, and getTierStatistics', () => {
    const resolvers = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::AppSync::Resolver',
    );

    const resolverFieldNames = resolvers.map((r: any) => r.Properties.FieldName);

    expect(resolverFieldNames).toContain('getUsageLimits');
    expect(resolverFieldNames).toContain('adminSetUserTier');
    expect(resolverFieldNames).toContain('getTierStatistics');
  });

  test('should create getPlanIds resolver', () => {
    const resolvers = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::AppSync::Resolver',
    );

    const resolverFieldNames = resolvers.map((r: any) => r.Properties.FieldName);

    expect(resolverFieldNames).toContain('getPlanIds');
  });

  test('should pass PLAN_IDS_SSM_PATH env var to Lambda functions', () => {
    const lambdas = Object.values(templateJson.Resources).filter(
      (resource: any) => resource.Type === 'AWS::Lambda::Function',
    );

    const lambdasWithPlanIdsSsmPath = lambdas.filter((lambda: any) => {
      const envVars = lambda.Properties?.Environment?.Variables ?? {};
      return envVars.PLAN_IDS_SSM_PATH !== undefined;
    });

    // pricing lambdas (getUsageLimits, adminSetUserTier, getTierStatistics, getPlanIds) + createStripeCheckout
    expect(lambdasWithPlanIdsSsmPath.length).toBeGreaterThanOrEqual(5);

    // Verify the value is correct
    for (const lambda of lambdasWithPlanIdsSsmPath) {
      expect(lambda.Properties.Environment.Variables.PLAN_IDS_SSM_PATH).toBe('/test/config/plan-ids');
    }
  });
});

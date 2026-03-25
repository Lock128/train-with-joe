import * as cdk from 'aws-cdk-lib';
import { type Construct } from 'constructs';
import { GraphqlApi, SchemaFile, FieldLogLevel, AuthorizationType } from 'aws-cdk-lib/aws-appsync';
import { type UserPool } from 'aws-cdk-lib/aws-cognito';
import { PolicyStatement, Role, ServicePrincipal, Effect } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { type Table } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

interface APIStackProps extends cdk.StackProps {
  namespace: string;
  userPool: UserPool;
  usersTable: Table;
  subscriptionsTable: Table;
}

export class APIStack extends cdk.Stack {
  public readonly graphqlApi: GraphqlApi;

  constructor(scope: Construct, id: string, props: APIStackProps) {
    super(scope, id, props);

    const { namespace, userPool, usersTable, subscriptionsTable } = props;

    // Create CloudWatch Logs role for AppSync
    const cwRole = new Role(this, 'APICWRole', {
      assumedBy: new ServicePrincipal('appsync.amazonaws.com'),
    });

    cwRole.addToPolicy(
      new PolicyStatement({
        actions: ['logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
        resources: [`arn:aws:logs:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:*`],
      }),
    );

    // Create AppSync GraphQL API
    const api = new GraphqlApi(this, `api-${namespace}`, {
      name: `train-with-joe-api-${namespace}`,
      schema: SchemaFile.fromAsset(path.join(__dirname, '../src/gql-schemas/schema.graphql')),
      xrayEnabled: true,
      logConfig: {
        fieldLogLevel: FieldLogLevel.ALL,
        retention: RetentionDays.ONE_WEEK,
        role: cwRole,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: userPool,
          },
        },
        additionalAuthorizationModes: [
          {
            authorizationType: AuthorizationType.IAM,
          },
        ],
      },
    });

    this.graphqlApi = api;

    // Add DynamoDB data sources
    const usersDataSource = api.addDynamoDbDataSource('UsersDataSource', usersTable);
    const subscriptionsDataSource = api.addDynamoDbDataSource('SubscriptionsDataSource', subscriptionsTable);

    // Grant permissions to data sources
    usersTable.grantReadWriteData(usersDataSource);
    subscriptionsTable.grantReadWriteData(subscriptionsDataSource);

    // Create Lambda functions for resolvers
    const lambdaProps = {
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        NAMESPACE: namespace,
        SUBSCRIPTIONS_TABLE_NAME: subscriptionsTable.tableName,
      },
    };

    // Create Stripe Checkout Lambda function
    const createStripeCheckoutFunction = new NodejsFunction(this, 'CreateStripeCheckoutFunction', {
      ...lambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.createStripeCheckout.ts'),
      handler: 'handler',
    });

    // Grant DynamoDB permissions
    subscriptionsTable.grantReadWriteData(createStripeCheckoutFunction);

    // Grant SSM permissions for Stripe API key
    createStripeCheckoutFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameter', 'ssm:GetParameters'],
        resources: [
          `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/${namespace}/stripe/*`,
        ],
      }),
    );

    // Add Lambda data source for Stripe Checkout
    const createStripeCheckoutDataSource = api.addLambdaDataSource(
      'CreateStripeCheckoutDataSource',
      createStripeCheckoutFunction,
    );

    // Create resolver for createStripeCheckout mutation
    createStripeCheckoutDataSource.createResolver('CreateStripeCheckoutResolver', {
      typeName: 'Mutation',
      fieldName: 'createStripeCheckout',
    });

    // Export API endpoint URL and API ID
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.graphqlUrl,
      description: 'GraphQL API endpoint URL',
      exportName: `${namespace}-api-url`,
    });

    new cdk.CfnOutput(this, 'ApiId', {
      value: api.apiId,
      description: 'GraphQL API ID',
      exportName: `${namespace}-api-id`,
    });

    new cdk.CfnOutput(this, 'ApiArn', {
      value: api.arn,
      description: 'GraphQL API ARN',
      exportName: `${namespace}-api-arn`,
    });
  }
}

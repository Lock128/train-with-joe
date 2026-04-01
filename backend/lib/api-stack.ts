import * as cdk from 'aws-cdk-lib';
import { type Construct } from 'constructs';
import { GraphqlApi, SchemaFile, FieldLogLevel, AuthorizationType } from 'aws-cdk-lib/aws-appsync';
import { type UserPool } from 'aws-cdk-lib/aws-cognito';
import { PolicyStatement, Role, ServicePrincipal, Effect } from 'aws-cdk-lib/aws-iam';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { type Table } from 'aws-cdk-lib/aws-dynamodb';
import { type Bucket } from 'aws-cdk-lib/aws-s3';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import * as path from 'path';

interface APIStackProps extends cdk.StackProps {
  namespace: string;
  userPool: UserPool;
  usersTable: Table;
  subscriptionsTable: Table;
  vocabularyListsTable: Table;
  assetsBucket: Bucket;
}

export class APIStack extends cdk.Stack {
  public readonly graphqlApi: GraphqlApi;

  constructor(scope: Construct, id: string, props: APIStackProps) {
    super(scope, id, props);

    const { namespace, userPool, usersTable, subscriptionsTable, vocabularyListsTable, assetsBucket } = props;

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

    // Create vocabulary Lambda functions
    const vocabularyLambdaProps = {
      runtime: Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: cdk.Duration.seconds(60),
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        NAMESPACE: namespace,
        VOCABULARY_LISTS_TABLE_NAME: vocabularyListsTable.tableName,
        BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'eu.amazon.nova-2-lite-v1:0',
        ASSETS_BUCKET_NAME: assetsBucket.bucketName,
      },
    };

    // Create async processing Lambda for image vocabulary analysis (long-running Bedrock calls)
    const processImageVocabularyFunction = new NodejsFunction(this, 'ProcessImageVocabularyFunction', {
      ...vocabularyLambdaProps,
      timeout: cdk.Duration.minutes(5),
      memorySize: 512,
      entry: path.join(__dirname, '../src/gql-lambda-functions/process-image-vocabulary.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadWriteData(processImageVocabularyFunction);
    assetsBucket.grantRead(processImageVocabularyFunction);
    processImageVocabularyFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      }),
    );

    // Create analyzeImageVocabulary mutation Lambda (fast — creates PENDING record, invokes processor async)
    const analyzeImageVocabularyFunction = new NodejsFunction(this, 'AnalyzeImageVocabularyFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.analyzeImageVocabulary.ts'),
      handler: 'handler',
      environment: {
        ...vocabularyLambdaProps.environment,
        PROCESS_IMAGE_VOCABULARY_FUNCTION_NAME: processImageVocabularyFunction.functionName,
      },
    });

    vocabularyListsTable.grantReadWriteData(analyzeImageVocabularyFunction);
    processImageVocabularyFunction.grantInvoke(analyzeImageVocabularyFunction);

    // Add Lambda data source and resolver for analyzeImageVocabulary
    const analyzeImageVocabularyDataSource = api.addLambdaDataSource(
      'AnalyzeImageVocabularyDataSource',
      analyzeImageVocabularyFunction,
    );

    analyzeImageVocabularyDataSource.createResolver('AnalyzeImageVocabularyResolver', {
      typeName: 'Mutation',
      fieldName: 'analyzeImageVocabulary',
    });

    // Create getImageUploadUrls Lambda function
    const getImageUploadUrlsFunction = new NodejsFunction(this, 'GetImageUploadUrlsFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getImageUploadUrls.ts'),
      handler: 'handler',
    });

    // Grant S3 write permissions for generating presigned PUT URLs
    assetsBucket.grantPut(getImageUploadUrlsFunction);

    const getImageUploadUrlsDataSource = api.addLambdaDataSource(
      'GetImageUploadUrlsDataSource',
      getImageUploadUrlsFunction,
    );

    getImageUploadUrlsDataSource.createResolver('GetImageUploadUrlsResolver', {
      typeName: 'Query',
      fieldName: 'getImageUploadUrls',
    });

    // Create getVocabularyLists Lambda function
    const getVocabularyListsFunction = new NodejsFunction(this, 'GetVocabularyListsFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getVocabularyLists.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadData(getVocabularyListsFunction);

    const getVocabularyListsDataSource = api.addLambdaDataSource(
      'GetVocabularyListsDataSource',
      getVocabularyListsFunction,
    );

    getVocabularyListsDataSource.createResolver('GetVocabularyListsResolver', {
      typeName: 'Query',
      fieldName: 'getVocabularyLists',
    });

    // Create getVocabularyList Lambda function
    const getVocabularyListFunction = new NodejsFunction(this, 'GetVocabularyListFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getVocabularyList.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadData(getVocabularyListFunction);

    const getVocabularyListDataSource = api.addLambdaDataSource(
      'GetVocabularyListDataSource',
      getVocabularyListFunction,
    );

    getVocabularyListDataSource.createResolver('GetVocabularyListResolver', {
      typeName: 'Query',
      fieldName: 'getVocabularyList',
    });

    // Create deleteVocabularyList Lambda function
    const deleteVocabularyListFunction = new NodejsFunction(this, 'DeleteVocabularyListFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.deleteVocabularyList.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadWriteData(deleteVocabularyListFunction);

    const deleteVocabularyListDataSource = api.addLambdaDataSource(
      'DeleteVocabularyListDataSource',
      deleteVocabularyListFunction,
    );

    deleteVocabularyListDataSource.createResolver('DeleteVocabularyListResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteVocabularyList',
    });

    // Create renameVocabularyList Lambda function
    const renameVocabularyListFunction = new NodejsFunction(this, 'RenameVocabularyListFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.renameVocabularyList.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadWriteData(renameVocabularyListFunction);

    const renameVocabularyListDataSource = api.addLambdaDataSource(
      'RenameVocabularyListDataSource',
      renameVocabularyListFunction,
    );

    renameVocabularyListDataSource.createResolver('RenameVocabularyListResolver', {
      typeName: 'Mutation',
      fieldName: 'renameVocabularyList',
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

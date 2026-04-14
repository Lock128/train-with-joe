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
  trainingsTable: Table;
  usageCountersTable: Table;
  assetsBucket: Bucket;
}

export class APIStack extends cdk.Stack {
  public readonly graphqlApi: GraphqlApi;

  constructor(scope: Construct, id: string, props: APIStackProps) {
    super(scope, id, props);

    const {
      namespace,
      userPool,
      usersTable,
      subscriptionsTable,
      vocabularyListsTable,
      trainingsTable,
      usageCountersTable,
      assetsBucket,
    } = props;

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
        PLAN_IDS_SSM_PATH: `/${namespace}/config/plan-ids`,
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

    // Grant SSM permissions for plan IDs parameter
    createStripeCheckoutFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [
          `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/${namespace}/config/plan-ids`,
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
        BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'amazon.nova-2-lite-v1:0',
        ASSETS_BUCKET_NAME: assetsBucket.bucketName,
      },
    };

    // Create async processing Lambda for image vocabulary analysis (long-running Bedrock calls)
    const processImageVocabularyFunction = new NodejsFunction(this, 'ProcessImageVocabularyFunction', {
      ...vocabularyLambdaProps,
      timeout: cdk.Duration.minutes(10),
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
        USAGE_COUNTERS_TABLE_NAME: usageCountersTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
      },
    });

    vocabularyListsTable.grantReadWriteData(analyzeImageVocabularyFunction);
    processImageVocabularyFunction.grantInvoke(analyzeImageVocabularyFunction);
    usageCountersTable.grantReadWriteData(analyzeImageVocabularyFunction);
    usersTable.grantReadData(analyzeImageVocabularyFunction);

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

    // Create getImageDownloadUrl Lambda function
    const getImageDownloadUrlFunction = new NodejsFunction(this, 'GetImageDownloadUrlFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getImageDownloadUrl.ts'),
      handler: 'handler',
    });

    // Grant S3 read permissions for generating presigned GET URLs
    assetsBucket.grantRead(getImageDownloadUrlFunction);

    const getImageDownloadUrlDataSource = api.addLambdaDataSource(
      'GetImageDownloadUrlDataSource',
      getImageDownloadUrlFunction,
    );

    getImageDownloadUrlDataSource.createResolver('GetImageDownloadUrlResolver', {
      typeName: 'Query',
      fieldName: 'getImageDownloadUrl',
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
      environment: {
        ...vocabularyLambdaProps.environment,
        USAGE_COUNTERS_TABLE_NAME: usageCountersTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
      },
    });

    vocabularyListsTable.grantReadWriteData(deleteVocabularyListFunction);
    usageCountersTable.grantReadWriteData(deleteVocabularyListFunction);
    usersTable.grantReadData(deleteVocabularyListFunction);

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

    // Create setVocabularyListPublic Lambda function
    const setVocabularyListPublicFunction = new NodejsFunction(this, 'SetVocabularyListPublicFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.setVocabularyListPublic.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadWriteData(setVocabularyListPublicFunction);

    const setVocabularyListPublicDataSource = api.addLambdaDataSource(
      'SetVocabularyListPublicDataSource',
      setVocabularyListPublicFunction,
    );

    setVocabularyListPublicDataSource.createResolver('SetVocabularyListPublicResolver', {
      typeName: 'Mutation',
      fieldName: 'setVocabularyListPublic',
    });

    // Create updateVocabularyList Lambda function
    const updateVocabularyListFunction = new NodejsFunction(this, 'UpdateVocabularyListFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.updateVocabularyList.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadWriteData(updateVocabularyListFunction);

    const updateVocabularyListDataSource = api.addLambdaDataSource(
      'UpdateVocabularyListDataSource',
      updateVocabularyListFunction,
    );

    updateVocabularyListDataSource.createResolver('UpdateVocabularyListResolver', {
      typeName: 'Mutation',
      fieldName: 'updateVocabularyList',
    });

    // Create flagWord Lambda function
    const flagWordFunction = new NodejsFunction(this, 'FlagWordFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.flagWord.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadWriteData(flagWordFunction);

    const flagWordDataSource = api.addLambdaDataSource('FlagWordDataSource', flagWordFunction);

    flagWordDataSource.createResolver('FlagWordResolver', {
      typeName: 'Mutation',
      fieldName: 'flagWord',
    });

    // Create getPublicVocabularyLists Lambda function
    const getPublicVocabularyListsFunction = new NodejsFunction(this, 'GetPublicVocabularyListsFunction', {
      ...vocabularyLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getPublicVocabularyLists.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadData(getPublicVocabularyListsFunction);

    const getPublicVocabularyListsDataSource = api.addLambdaDataSource(
      'GetPublicVocabularyListsDataSource',
      getPublicVocabularyListsFunction,
    );

    getPublicVocabularyListsDataSource.createResolver('GetPublicVocabularyListsResolver', {
      typeName: 'Query',
      fieldName: 'getPublicVocabularyLists',
    });

    // Create getAppInfo Lambda function
    const getAppInfoFunction = new NodejsFunction(this, 'GetAppInfoFunction', {
      runtime: Runtime.NODEJS_20_X,
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getAppInfo.ts'),
      handler: 'handler',
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
      environment: {
        COMMIT_ID: process.env.COMMIT_ID ?? 'local',
        BUILD_NUMBER: process.env.BUILD_NUMBER ?? '0',
      },
    });

    const getAppInfoDataSource = api.addLambdaDataSource('GetAppInfoDataSource', getAppInfoFunction);

    getAppInfoDataSource.createResolver('GetAppInfoResolver', {
      typeName: 'Query',
      fieldName: 'getAppInfo',
    });

    // Create training Lambda functions
    const trainingLambdaProps = {
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
        TRAININGS_TABLE_NAME: trainingsTable.tableName,
        VOCABULARY_LISTS_TABLE_NAME: vocabularyListsTable.tableName,
        USERS_TABLE_NAME: usersTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
      },
    };

    // Create createTraining Lambda function
    const createTrainingFunction = new NodejsFunction(this, 'CreateTrainingFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.createTraining.ts'),
      handler: 'handler',
      environment: {
        ...trainingLambdaProps.environment,
        USAGE_COUNTERS_TABLE_NAME: usageCountersTable.tableName,
      },
    });

    trainingsTable.grantReadWriteData(createTrainingFunction);
    vocabularyListsTable.grantReadData(createTrainingFunction);
    usageCountersTable.grantReadWriteData(createTrainingFunction);
    usersTable.grantReadData(createTrainingFunction);

    const createTrainingDataSource = api.addLambdaDataSource('CreateTrainingDataSource', createTrainingFunction);

    createTrainingDataSource.createResolver('CreateTrainingResolver', {
      typeName: 'Mutation',
      fieldName: 'createTraining',
    });

    // Create updateTraining Lambda function
    const updateTrainingFunction = new NodejsFunction(this, 'UpdateTrainingFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.updateTraining.ts'),
      handler: 'handler',
    });

    trainingsTable.grantReadWriteData(updateTrainingFunction);

    const updateTrainingDataSource = api.addLambdaDataSource('UpdateTrainingDataSource', updateTrainingFunction);

    updateTrainingDataSource.createResolver('UpdateTrainingResolver', {
      typeName: 'Mutation',
      fieldName: 'updateTraining',
    });

    // Create deleteTraining Lambda function
    const deleteTrainingFunction = new NodejsFunction(this, 'DeleteTrainingFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.deleteTraining.ts'),
      handler: 'handler',
    });

    trainingsTable.grantReadWriteData(deleteTrainingFunction);

    const deleteTrainingDataSource = api.addLambdaDataSource('DeleteTrainingDataSource', deleteTrainingFunction);

    deleteTrainingDataSource.createResolver('DeleteTrainingResolver', {
      typeName: 'Mutation',
      fieldName: 'deleteTraining',
    });

    // Create startTraining Lambda function
    const startTrainingFunction = new NodejsFunction(this, 'StartTrainingFunction', {
      ...trainingLambdaProps,
      timeout: cdk.Duration.minutes(5),
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.startTraining.ts'),
      handler: 'handler',
      environment: {
        ...trainingLambdaProps.environment,
        BEDROCK_MODEL_ID: process.env.BEDROCK_MODEL_ID || 'amazon.nova-2-lite-v1:0',
      },
    });

    trainingsTable.grantReadWriteData(startTrainingFunction);
    vocabularyListsTable.grantReadData(startTrainingFunction);

    // Grant Bedrock access for AI training mode
    startTrainingFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['bedrock:InvokeModel'],
        resources: ['*'],
      }),
    );

    const startTrainingDataSource = api.addLambdaDataSource('StartTrainingDataSource', startTrainingFunction);

    startTrainingDataSource.createResolver('StartTrainingResolver', {
      typeName: 'Mutation',
      fieldName: 'startTraining',
    });

    // Create submitAnswer Lambda function
    const submitAnswerFunction = new NodejsFunction(this, 'SubmitAnswerFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.submitAnswer.ts'),
      handler: 'handler',
    });

    trainingsTable.grantReadWriteData(submitAnswerFunction);

    const submitAnswerDataSource = api.addLambdaDataSource('SubmitAnswerDataSource', submitAnswerFunction);

    submitAnswerDataSource.createResolver('SubmitAnswerResolver', {
      typeName: 'Mutation',
      fieldName: 'submitAnswer',
    });

    // Create abortTraining Lambda function
    const abortTrainingFunction = new NodejsFunction(this, 'AbortTrainingFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.abortTraining.ts'),
      handler: 'handler',
    });

    trainingsTable.grantReadWriteData(abortTrainingFunction);

    const abortTrainingDataSource = api.addLambdaDataSource('AbortTrainingDataSource', abortTrainingFunction);

    abortTrainingDataSource.createResolver('AbortTrainingResolver', {
      typeName: 'Mutation',
      fieldName: 'abortTraining',
    });

    // Create getTraining Lambda function
    const getTrainingFunction = new NodejsFunction(this, 'GetTrainingFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getTraining.ts'),
      handler: 'handler',
    });

    trainingsTable.grantReadWriteData(getTrainingFunction);

    const getTrainingDataSource = api.addLambdaDataSource('GetTrainingDataSource', getTrainingFunction);

    getTrainingDataSource.createResolver('GetTrainingResolver', {
      typeName: 'Query',
      fieldName: 'getTraining',
    });

    // Create getTrainings Lambda function
    const getTrainingsFunction = new NodejsFunction(this, 'GetTrainingsFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getTrainings.ts'),
      handler: 'handler',
    });

    trainingsTable.grantReadWriteData(getTrainingsFunction);

    const getTrainingsDataSource = api.addLambdaDataSource('GetTrainingsDataSource', getTrainingsFunction);

    getTrainingsDataSource.createResolver('GetTrainingsResolver', {
      typeName: 'Query',
      fieldName: 'getTrainings',
    });

    // Create getTrainingStatistics Lambda function
    const getTrainingStatisticsFunction = new NodejsFunction(this, 'GetTrainingStatisticsFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getTrainingStatistics.ts'),
      handler: 'handler',
    });

    trainingsTable.grantReadWriteData(getTrainingStatisticsFunction);
    usersTable.grantReadData(getTrainingStatisticsFunction);
    getTrainingStatisticsFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cognito-idp:ListUsers'],
        resources: [userPool.userPoolArn],
      }),
    );

    const getTrainingStatisticsDataSource = api.addLambdaDataSource(
      'GetTrainingStatisticsDataSource',
      getTrainingStatisticsFunction,
    );

    getTrainingStatisticsDataSource.createResolver('GetTrainingStatisticsResolver', {
      typeName: 'Query',
      fieldName: 'getTrainingStatistics',
    });

    // Create getTrainingDayStatistics Lambda function
    const getTrainingDayStatisticsFunction = new NodejsFunction(this, 'GetTrainingDayStatisticsFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getTrainingDayStatistics.ts'),
      handler: 'handler',
    });

    trainingsTable.grantReadWriteData(getTrainingDayStatisticsFunction);
    usersTable.grantReadData(getTrainingDayStatisticsFunction);
    getTrainingDayStatisticsFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cognito-idp:ListUsers'],
        resources: [userPool.userPoolArn],
      }),
    );

    const getTrainingDayStatisticsDataSource = api.addLambdaDataSource(
      'GetTrainingDayStatisticsDataSource',
      getTrainingDayStatisticsFunction,
    );

    getTrainingDayStatisticsDataSource.createResolver('GetTrainingDayStatisticsResolver', {
      typeName: 'Query',
      fieldName: 'getTrainingDayStatistics',
    });

    // Create getTrainingOverviewStatistics Lambda function
    const getTrainingOverviewStatisticsFunction = new NodejsFunction(this, 'GetTrainingOverviewStatisticsFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getTrainingOverviewStatistics.ts'),
      handler: 'handler',
    });

    trainingsTable.grantReadWriteData(getTrainingOverviewStatisticsFunction);
    usersTable.grantReadData(getTrainingOverviewStatisticsFunction);
    getTrainingOverviewStatisticsFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cognito-idp:ListUsers'],
        resources: [userPool.userPoolArn],
      }),
    );

    const getTrainingOverviewStatisticsDataSource = api.addLambdaDataSource(
      'GetTrainingOverviewStatisticsDataSource',
      getTrainingOverviewStatisticsFunction,
    );

    getTrainingOverviewStatisticsDataSource.createResolver('GetTrainingOverviewStatisticsResolver', {
      typeName: 'Query',
      fieldName: 'getTrainingOverviewStatistics',
    });

    // Create migrateUserData Lambda function (admin only)
    const migrateUserDataFunction = new NodejsFunction(this, 'MigrateUserDataFunction', {
      ...trainingLambdaProps,
      timeout: cdk.Duration.minutes(5),
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.migrateUserData.ts'),
      handler: 'handler',
    });

    vocabularyListsTable.grantReadWriteData(migrateUserDataFunction);
    trainingsTable.grantReadWriteData(migrateUserDataFunction);

    const migrateUserDataDataSource = api.addLambdaDataSource('MigrateUserDataDataSource', migrateUserDataFunction);

    migrateUserDataDataSource.createResolver('MigrateUserDataResolver', {
      typeName: 'Mutation',
      fieldName: 'migrateUserData',
    });

    // Create getUsers Lambda function (admin only)
    const getUsersFunction = new NodejsFunction(this, 'GetUsersFunction', {
      ...trainingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getUsers.ts'),
      handler: 'handler',
    });

    usersTable.grantReadData(getUsersFunction);
    getUsersFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cognito-idp:ListUsers'],
        resources: [userPool.userPoolArn],
      }),
    );

    const getUsersDataSource = api.addLambdaDataSource('GetUsersDataSource', getUsersFunction);

    getUsersDataSource.createResolver('GetUsersResolver', {
      typeName: 'Query',
      fieldName: 'getUsers',
    });

    // Create pricing Lambda functions
    const pricingLambdaProps = {
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
        USERS_TABLE_NAME: usersTable.tableName,
        USAGE_COUNTERS_TABLE_NAME: usageCountersTable.tableName,
        SUBSCRIPTIONS_TABLE_NAME: subscriptionsTable.tableName,
        USER_POOL_ID: userPool.userPoolId,
        PLAN_IDS_SSM_PATH: `/${namespace}/config/plan-ids`,
      },
    };

    // Create getUsageLimits Lambda function
    const getUsageLimitsFunction = new NodejsFunction(this, 'GetUsageLimitsFunction', {
      ...pricingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getUsageLimits.ts'),
      handler: 'handler',
    });

    usersTable.grantReadData(getUsageLimitsFunction);
    usageCountersTable.grantReadWriteData(getUsageLimitsFunction);
    subscriptionsTable.grantReadData(getUsageLimitsFunction);

    const getUsageLimitsDataSource = api.addLambdaDataSource('GetUsageLimitsDataSource', getUsageLimitsFunction);

    getUsageLimitsDataSource.createResolver('GetUsageLimitsResolver', {
      typeName: 'Query',
      fieldName: 'getUsageLimits',
    });

    // Create adminSetUserTier Lambda function (admin only)
    const adminSetUserTierFunction = new NodejsFunction(this, 'AdminSetUserTierFunction', {
      ...pricingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Mutation.adminSetUserTier.ts'),
      handler: 'handler',
    });

    usersTable.grantReadWriteData(adminSetUserTierFunction);
    usageCountersTable.grantReadWriteData(adminSetUserTierFunction);
    subscriptionsTable.grantReadData(adminSetUserTierFunction);
    adminSetUserTierFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cognito-idp:ListUsers'],
        resources: [userPool.userPoolArn],
      }),
    );

    const adminSetUserTierDataSource = api.addLambdaDataSource('AdminSetUserTierDataSource', adminSetUserTierFunction);

    adminSetUserTierDataSource.createResolver('AdminSetUserTierResolver', {
      typeName: 'Mutation',
      fieldName: 'adminSetUserTier',
    });

    // Create getTierStatistics Lambda function (admin only)
    const getTierStatisticsFunction = new NodejsFunction(this, 'GetTierStatisticsFunction', {
      ...pricingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getTierStatistics.ts'),
      handler: 'handler',
    });

    usersTable.grantReadData(getTierStatisticsFunction);
    usageCountersTable.grantReadData(getTierStatisticsFunction);
    getTierStatisticsFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['cognito-idp:ListUsers'],
        resources: [userPool.userPoolArn],
      }),
    );

    const getTierStatisticsDataSource = api.addLambdaDataSource(
      'GetTierStatisticsDataSource',
      getTierStatisticsFunction,
    );

    getTierStatisticsDataSource.createResolver('GetTierStatisticsResolver', {
      typeName: 'Query',
      fieldName: 'getTierStatistics',
    });

    // Grant SSM permissions for plan IDs parameter to pricing Lambda functions
    const planIdsSsmArn = `arn:aws:ssm:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:parameter/${namespace}/config/plan-ids`;
    const pricingFunctionsNeedingSsm = [getUsageLimitsFunction, adminSetUserTierFunction, getTierStatisticsFunction];
    for (const fn of pricingFunctionsNeedingSsm) {
      fn.addToRolePolicy(
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['ssm:GetParameter'],
          resources: [planIdsSsmArn],
        }),
      );
    }

    // Create getPlanIds Lambda function
    const getPlanIdsFunction = new NodejsFunction(this, 'GetPlanIdsFunction', {
      ...pricingLambdaProps,
      entry: path.join(__dirname, '../src/gql-lambda-functions/Query.getPlanIds.ts'),
      handler: 'handler',
    });

    usersTable.grantReadData(getPlanIdsFunction);
    usageCountersTable.grantReadData(getPlanIdsFunction);
    subscriptionsTable.grantReadData(getPlanIdsFunction);
    getPlanIdsFunction.addToRolePolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ['ssm:GetParameter'],
        resources: [planIdsSsmArn],
      }),
    );

    const getPlanIdsDataSource = api.addLambdaDataSource('GetPlanIdsDataSource', getPlanIdsFunction);

    getPlanIdsDataSource.createResolver('GetPlanIdsResolver', {
      typeName: 'Query',
      fieldName: 'getPlanIds',
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

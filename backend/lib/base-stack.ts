import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy, Stack, type Environment } from 'aws-cdk-lib';
import {
  AccountRecovery,
  CfnIdentityPool,
  CfnIdentityPoolRoleAttachment,
  UserPool,
  UserPoolEmail,
  type UserPoolClient,
  type CfnUserPool,
} from 'aws-cdk-lib/aws-cognito';
import { FederatedPrincipal, PolicyStatement, Role } from 'aws-cdk-lib/aws-iam';
import { AttributeType, BillingMode, StreamViewType, Table } from 'aws-cdk-lib/aws-dynamodb';
import { BlockPublicAccess, Bucket, HttpMethods } from 'aws-cdk-lib/aws-s3';
import { EmailIdentity, Identity } from 'aws-cdk-lib/aws-ses';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';
import type { Construct } from 'constructs';
import type { StackProps } from 'aws-cdk-lib';

interface BaseStackProps extends StackProps {
  env: Environment;
  namespace: string;
}

export class BaseStack extends Stack {
  public readonly userPool: UserPool;
  public readonly userPoolIdParameterName: string;
  public readonly userPoolFrontendClientIdParameterName: string;
  public readonly userPoolFrontendClientId: string;
  public readonly usersTable: Table;
  public readonly subscriptionsTable: Table;
  public readonly vocabularyListsTable: Table;
  public readonly trainingsTable: Table;
  public readonly assetsBucket: Bucket;
  public readonly assetsBucketNameParameterName: string;
  public readonly identityPoolId: string;
  private readonly namespace: string;

  constructor(scope: Construct, id: string, props: BaseStackProps) {
    super(scope, id, props);
    const { namespace } = props;
    this.namespace = namespace;

    // Create DynamoDB tables
    this.usersTable = this.createUsersTable(namespace);
    this.subscriptionsTable = this.createSubscriptionsTable(namespace);
    this.vocabularyListsTable = this.createVocabularyListsTable(namespace);
    this.trainingsTable = this.createTrainingsTable(namespace);

    // Create S3 bucket for application assets
    this.assetsBucket = this.createAssetsBucket(namespace);
    this.assetsBucketNameParameterName = `/${namespace}/config/assets-bucket-name`;
    new StringParameter(this, 'AssetsBucketNameParameter', {
      stringValue: this.assetsBucket.bucketName,
      parameterName: this.assetsBucketNameParameterName,
      simpleName: false,
    });

    // Export table names
    new StringParameter(this, 'UsersTableNameParameter', {
      stringValue: this.usersTable.tableName,
      parameterName: `/${namespace}/config/users-table-name`,
      simpleName: false,
    });

    new StringParameter(this, 'SubscriptionsTableNameParameter', {
      stringValue: this.subscriptionsTable.tableName,
      parameterName: `/${namespace}/config/subscriptions-table-name`,
      simpleName: false,
    });

    new StringParameter(this, 'VocabularyListsTableNameParameter', {
      stringValue: this.vocabularyListsTable.tableName,
      parameterName: `/${namespace}/config/vocabulary-lists-table-name`,
      simpleName: false,
    });

    new StringParameter(this, 'TrainingsTableNameParameter', {
      stringValue: this.trainingsTable.tableName,
      parameterName: `/${namespace}/config/trainings-table-name`,
      simpleName: false,
    });

    // Verify SES email identity for Cognito verification emails
    const sesFromEmail = `lockhead+joe${namespace}@lockhead.info`;
    new EmailIdentity(this, 'SesEmailIdentity', {
      identity: Identity.email(sesFromEmail),
    });

    const userPoolSetup = this.createUserPool(namespace);
    this.userPool = userPoolSetup.userPool;
    this.userPoolFrontendClientIdParameterName = `/${namespace}/config/cognito-frontend-client-id`;
    this.userPoolFrontendClientId = userPoolSetup.frontendClient.userPoolClientId;

    // Export user pool client ID parameter
    new StringParameter(this, 'UserPoolFrontendClientIdParameter', {
      stringValue: userPoolSetup.frontendClient.userPoolClientId,
      parameterName: this.userPoolFrontendClientIdParameterName,
    });

    // Export user pool ID parameter
    this.userPoolIdParameterName = `/${namespace}/config/cognito-user-pool-id`;
    new StringParameter(this, 'UserPoolIdParameter', {
      stringValue: this.userPool.userPoolId,
      parameterName: this.userPoolIdParameterName,
      simpleName: false,
    });

    // Create Cognito Identity Pool for IAM-based auth (used by image uploads)
    const identityPool = new CfnIdentityPool(this, 'IdentityPool', {
      identityPoolName: `TrainWithJoe_${namespace}`,
      allowUnauthenticatedIdentities: false,
      cognitoIdentityProviders: [
        {
          clientId: userPoolSetup.frontendClient.userPoolClientId,
          providerName: this.userPool.userPoolProviderName,
        },
      ],
    });
    this.identityPoolId = identityPool.ref;

    // Authenticated role for Identity Pool users
    const authenticatedRole = new Role(this, 'CognitoAuthenticatedRole', {
      assumedBy: new FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': identityPool.ref,
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated',
          },
        },
        'sts:AssumeRoleWithWebIdentity',
      ),
    });

    // Grant authenticated users access to the assets bucket
    authenticatedRole.addToPolicy(
      new PolicyStatement({
        actions: ['s3:GetObject', 's3:PutObject'],
        resources: [`${this.assetsBucket.bucketArn}/*`],
      }),
    );

    new CfnIdentityPoolRoleAttachment(this, 'IdentityPoolRoleAttachment', {
      identityPoolId: identityPool.ref,
      roles: {
        authenticated: authenticatedRole.roleArn,
      },
    });

    // Export Identity Pool ID parameter
    new StringParameter(this, 'IdentityPoolIdParameter', {
      stringValue: identityPool.ref,
      parameterName: `/${namespace}/config/cognito-identity-pool-id`,
      simpleName: false,
    });
  }

  createUserPool(namespace: string): {
    userPool: UserPool;
    frontendClient: UserPoolClient;
  } {
    const userPool = new UserPool(this, 'UserPool', {
      userPoolName: `TrainWithJoe-${namespace}`,
      selfSignUpEnabled: true,
      removalPolicy: RemovalPolicy.DESTROY, // for development only
      standardAttributes: {
        email: {
          required: true,
        },
      },
      autoVerify: {
        email: true,
      },
      keepOriginal: {
        email: true,
      },
      // Email-only account recovery
      accountRecovery: AccountRecovery.EMAIL_ONLY,
      email: UserPoolEmail.withSES({
        fromEmail: `lockhead+joe${namespace}@lockhead.info`,
        fromName: 'Train with Joe',
        sesRegion: 'eu-central-1',
      }),
      passwordPolicy: {
        minLength: 8,
        requireLowercase: true,
        requireUppercase: true,
        requireDigits: true,
        requireSymbols: true,
      },
    });

    // Create frontend client with basic auth flows (no OAuth2)
    const frontendClient = userPool.addClient('UserPoolClientFrontend', {
      authFlows: {
        userPassword: true,
        userSrp: true,
        custom: true,
      },
    });

    // Configure email verification template
    const cfnUserPool = userPool.node.defaultChild as CfnUserPool;

    // Email verification template
    cfnUserPool.verificationMessageTemplate = {
      defaultEmailOption: 'CONFIRM_WITH_CODE',
      emailMessage: `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #1976d2; margin-bottom: 10px;">Train with Joe</h1>
                <p style="font-size: 18px; color: #666;">Verification Code</p>
              </div>
              
              <div style="background-color: #f8f9fa; padding: 25px; border-radius: 8px; text-align: center; margin: 30px 0;">
                <h2 style="color: #1976d2; margin-bottom: 15px;">Your Verification Code</h2>
                <div style="background-color: #fff; padding: 15px; border-radius: 5px; border: 2px solid #1976d2; display: inline-block;">
                  <span style="font-size: 24px; font-weight: bold; color: #1976d2; letter-spacing: 2px;">{####}</span>
                </div>
              </div>
              
              <p>Enter this code in the app to verify your email address.</p>
              <p style="text-align: center; margin: 20px 0;">
                <a href="https://trainwithjoe.com/verify-email" 
                   style="background-color: #1976d2; color: #fff; padding: 12px 30px; border-radius: 5px; text-decoration: none; font-size: 16px;">
                  Open Verification Screen
                </a>
              </p>
              <p>If you did not request this code, please ignore this email.</p>
              
              <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
              <p style="font-size: 12px; color: #666; text-align: center;">
                This is an automated message from Train with Joe.<br>
                Please do not reply to this email.
              </p>
            </div>
          </body>
        </html>
      `,
      emailSubject: 'Your Train with Joe verification code',
    };

    // Configure password policy
    cfnUserPool.policies = {
      passwordPolicy: {
        minimumLength: 8,
        requireLowercase: true,
        requireNumbers: true,
        requireSymbols: true,
        requireUppercase: true,
        temporaryPasswordValidityDays: 7,
      },
    };

    return { userPool, frontendClient };
  }

  createUsersTable(namespace: string): Table {
    const table = new Table(this, `UsersTable-${namespace}`, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: `train-with-joe-users-${namespace}`,
    });

    // Add GSI for email lookup
    table.addGlobalSecondaryIndex({
      indexName: 'email-index',
      partitionKey: {
        name: 'email',
        type: AttributeType.STRING,
      },
    });

    return table;
  }

  createSubscriptionsTable(namespace: string): Table {
    const table = new Table(this, `SubscriptionsTable-${namespace}`, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: `train-with-joe-subscriptions-${namespace}`,
    });

    // Add GSI for userId lookup
    table.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING,
      },
    });

    return table;
  }

  createVocabularyListsTable(namespace: string): Table {
    const table = new Table(this, `VocabularyListsTable-${namespace}`, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      stream: StreamViewType.NEW_AND_OLD_IMAGES,
      tableName: `train-with-joe-vocabulary-lists-${namespace}`,
    });

    // Add GSI for userId lookup
    table.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING,
      },
    });

    // Add GSI for querying public vocabulary lists
    table.addGlobalSecondaryIndex({
      indexName: 'isPublic-createdAt-index',
      partitionKey: {
        name: 'isPublic',
        type: AttributeType.STRING,
      },
      sortKey: {
        name: 'createdAt',
        type: AttributeType.STRING,
      },
    });

    return table;
  }

  createTrainingsTable(namespace: string): Table {
    const table = new Table(this, `TrainingsTable-${namespace}`, {
      billingMode: BillingMode.PAY_PER_REQUEST,
      partitionKey: {
        name: 'id',
        type: AttributeType.STRING,
      },
      removalPolicy: RemovalPolicy.DESTROY,
      tableName: `train-with-joe-trainings-${namespace}`,
    });

    // Add GSI for userId lookup
    table.addGlobalSecondaryIndex({
      indexName: 'userId-index',
      partitionKey: {
        name: 'userId',
        type: AttributeType.STRING,
      },
    });

    // Add GSI for trainingId lookup (for execution queries)
    table.addGlobalSecondaryIndex({
      indexName: 'trainingId-index',
      partitionKey: {
        name: 'trainingId',
        type: AttributeType.STRING,
      },
    });

    return table;
  }

  createAssetsBucket(namespace: string): Bucket {
    const domainName = namespace === 'prod' ? 'trainwithjoe.com' : `${namespace}.trainwithjoe.com`;
    const allowedOrigins = [`https://${domainName}`, 'https://*.cloudfront.net'];
    if (namespace !== 'prod') {
      allowedOrigins.push('http://localhost:*');
    }

    return new Bucket(this, 'AssetsBucket', {
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      versioned: true,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [HttpMethods.PUT, HttpMethods.GET],
          allowedOrigins,
          exposedHeaders: ['x-amz-server-side-encryption', 'x-amz-request-id', 'x-amz-id-2', 'ETag', 'x-amz-meta-foo'],
          maxAge: 3000,
        },
      ],
      lifecycleRules: [
        {
          enabled: true,
          noncurrentVersionExpiration: cdk.Duration.days(30),
        },
      ],
    });
  }
}

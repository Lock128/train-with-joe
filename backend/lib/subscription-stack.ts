import * as cdk from 'aws-cdk-lib';
import * as path from 'path';
import type { Construct } from 'constructs';
import type { Table } from 'aws-cdk-lib/aws-dynamodb';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import { PolicyStatement, Effect } from 'aws-cdk-lib/aws-iam';
import { RestApi, LambdaIntegration } from 'aws-cdk-lib/aws-apigateway';
import { Runtime } from 'aws-cdk-lib/aws-lambda';

interface SubscriptionStackProps extends cdk.StackProps {
  namespace: string;
  table: Table;
}

/**
 * CDK Stack for subscription and payment processing
 * Handles Stripe webhooks and payment events
 */
export class SubscriptionStack extends cdk.Stack {
  public readonly webhookApi: RestApi;
  public readonly stripeWebhookUrl: string;

  constructor(scope: Construct, id: string, props: SubscriptionStackProps) {
    super(scope, id, props);

    const { namespace, table } = props;

    // Create Lambda function for Stripe webhooks
    const stripeWebhookLambda = new NodejsFunction(this, 'StripeWebhookLambda', {
      runtime: Runtime.NODEJS_20_X,
      entry: path.join(__dirname, '../src/webhooks/stripe-webhook-handler.ts'),
      handler: 'handler',
      memorySize: 256,
      timeout: cdk.Duration.seconds(30),
      environment: {
        NAMESPACE: namespace,
        TABLE_NAME: table.tableName,
        SUBSCRIPTIONS_TABLE_NAME: table.tableName,
      },
      bundling: {
        minify: true,
        sourceMap: true,
        externalModules: ['aws-sdk'],
      },
    });

    // Grant DynamoDB permissions
    const dynamoPermissions = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['dynamodb:GetItem', 'dynamodb:PutItem', 'dynamodb:UpdateItem', 'dynamodb:Query'],
      resources: [table.tableArn, `${table.tableArn}/index/*`],
    });

    stripeWebhookLambda.addToRolePolicy(dynamoPermissions);

    // Grant CloudWatch permissions for metrics
    const cloudWatchPermissions = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ['cloudwatch:PutMetricData'],
      resources: ['*'],
    });

    stripeWebhookLambda.addToRolePolicy(cloudWatchPermissions);

    // Create API Gateway for webhook endpoint
    this.webhookApi = new RestApi(this, 'WebhookApi', {
      restApiName: `webhook-api-${namespace}`,
      description: 'API Gateway for Stripe webhook endpoints',
      deployOptions: {
        stageName: 'prod',
      },
    });

    const stripeWebhookIntegration = new LambdaIntegration(stripeWebhookLambda);

    const webhooksResource = this.webhookApi.root.addResource('webhooks');
    const stripeResource = webhooksResource.addResource('stripe');
    stripeResource.addMethod('POST', stripeWebhookIntegration);

    // Store webhook URL for output
    this.stripeWebhookUrl = `${this.webhookApi.url}webhooks/stripe`;

    // Output webhook endpoint URL
    new cdk.CfnOutput(this, 'StripeWebhookEndpointUrl', {
      value: this.stripeWebhookUrl,
      description: 'Stripe webhook endpoint URL - configure this in Stripe Dashboard',
    });

    // Output webhook Lambda function ARN for reference
    new cdk.CfnOutput(this, 'StripeWebhookLambdaArn', {
      value: stripeWebhookLambda.functionArn,
      description: 'ARN of the Stripe webhook Lambda function',
    });
  }
}

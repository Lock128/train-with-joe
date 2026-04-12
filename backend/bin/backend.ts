#!/usr/bin/env node
import 'source-map-support/register';

import * as cdk from 'aws-cdk-lib';
import * as os from 'os';

import { BaseStack } from '../lib/base-stack';
import { APIStack } from '../lib/api-stack';
import { BedrockStack } from '../lib/bedrock-stack';
import { SubscriptionStack } from '../lib/subscription-stack';
import { DistributionStack } from '../lib/distribution-stack';
import { CertificateStack } from '../lib/certificate-stack';

const app = new cdk.App();

const namespace = process.env.NODE_ENV ?? `sandbox-${os.userInfo().username.replace('_', '-').toLowerCase()}`;

console.log('CDK Default Account:');
console.log(process.env.CDK_DEFAULT_ACCOUNT);
console.log('CDK Default Region: ');
console.log(process.env.CDK_DEFAULT_REGION);

let env: cdk.Environment | undefined;
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'sandbox') {
  env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  };
} else if (process.env.NODE_ENV === 'beta') {
  env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  };
} else if (process.env.NODE_ENV === 'prod') {
  env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  };
} else {
  env = {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  };
}

console.log('CDK env Account:');
console.log(env.account);
console.log('CDK env Region: ');
console.log(env.region);

// Create base infrastructure stack
const baseStack = new BaseStack(app, `BaseStack-${namespace}`, {
  env,
  namespace,
});

// Create API stack with GraphQL API
const apiStack = new APIStack(app, `APIStack-${namespace}`, {
  env,
  namespace,
  userPool: baseStack.userPool,
  usersTable: baseStack.usersTable,
  subscriptionsTable: baseStack.subscriptionsTable,
  vocabularyListsTable: baseStack.vocabularyListsTable,
  trainingsTable: baseStack.trainingsTable,
  assetsBucket: baseStack.assetsBucket,
});
apiStack.addDependency(baseStack);

// Create Bedrock stack for AI content enhancement
const bedrockStack = new BedrockStack(app, `BedrockStack-${namespace}`, {
  env,
  namespace,
});
bedrockStack.addDependency(baseStack);

// Create subscription stack for Stripe integration
const subscriptionStack = new SubscriptionStack(app, `SubscriptionStack-${namespace}`, {
  env,
  namespace,
  table: baseStack.subscriptionsTable,
});
subscriptionStack.addDependency(baseStack);

// Create ACM certificate in us-east-1 (required for CloudFront)
// Deploy this stack first: cdk deploy CertificateStack-<namespace>
new CertificateStack(app, `CertificateStack-${namespace}`, {
  env: { account: env.account, region: 'us-east-1' },
  namespace,
});

// Create CloudFront distributions for frontend and join page
// Imports the certificate ARN from SSM (written by CertificateStack)
new DistributionStack(app, `DistributionStack-${namespace}`, {
  env,
  namespace,
});

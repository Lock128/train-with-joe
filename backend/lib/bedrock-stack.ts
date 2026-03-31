import { Stack, CfnOutput } from 'aws-cdk-lib';
import type { StackProps } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { StringParameter } from 'aws-cdk-lib/aws-ssm';

interface BedrockStackProps extends StackProps {
  namespace: string;
}

/**
 * CDK Stack for Amazon Bedrock AI integration
 * Configures IAM permissions and model parameters
 */
export class BedrockStack extends Stack {
  public readonly bedrockModelArn: string;
  public readonly bedrockRoleArn: string;

  constructor(scope: Construct, id: string, props: BedrockStackProps) {
    super(scope, id, props);

    const { namespace } = props;

    // Create SSM parameter for Bedrock model ID
    const modelIdParameter = new StringParameter(this, 'BedrockModelIdParam', {
      stringValue: 'eu.amazon.nova-2-lite-v1:0',
      parameterName: `/${namespace}/bedrock/model-id`,
      description: 'Bedrock model ID for AI content generation (multimodal, supports image analysis)',
      simpleName: false,
    });

    // Store model ARN (for reference, though we use model ID in practice)
    this.bedrockModelArn = `arn:aws:bedrock:${this.region}::foundation-model/amazon.nova-lite-v1:0`;

    // Create IAM policy statement for Bedrock access
    // This will be attached to Lambda functions that need Bedrock access
    // Note: This policy statement is available via getBedrockPolicyStatement() method
    new PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
        'bedrock:GetFoundationModel',
        'bedrock:ListFoundationModels',
      ],
      resources: ['*'], // Bedrock models don't support resource-level permissions
    });

    // Export policy statement ARN (conceptual - we'll attach this to Lambda roles)
    this.bedrockRoleArn = `arn:aws:iam::${this.account}:policy/bedrock-access-${namespace}`;

    // Output model ID parameter name
    new CfnOutput(this, 'BedrockModelIdParameter', {
      value: modelIdParameter.parameterName,
      description: 'SSM parameter name for Bedrock model ID',
    });

    // Output model ARN
    new CfnOutput(this, 'BedrockModelArn', {
      value: this.bedrockModelArn,
      description: 'ARN of the Bedrock foundation model',
    });

    // Output instructions
    new CfnOutput(this, 'BedrockSetupInstructions', {
      value: 'Lambda functions using Bedrock need IAM permissions for bedrock:InvokeModel',
      description: 'Setup instructions for Bedrock integration',
    });
  }

  /**
   * Get the IAM policy statement for Bedrock access
   * This can be attached to Lambda function roles
   */
  public getBedrockPolicyStatement(): PolicyStatement {
    return new PolicyStatement({
      actions: [
        'bedrock:InvokeModel',
        'bedrock:InvokeModelWithResponseStream',
        'bedrock:GetFoundationModel',
        'bedrock:ListFoundationModels',
      ],
      resources: ['*'],
    });
  }
}

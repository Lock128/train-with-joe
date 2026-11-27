import { Function as LambdaFunction } from 'aws-cdk-lib/aws-lambda';
import { Token, type IAspect } from 'aws-cdk-lib';
import type { IConstruct } from 'constructs';

/**
 * Sets OTEL_SERVICE_NAME on every Lambda function so telemetry forwarded to Dash0 carries a
 * service.name instead of an empty one. The value is the explicit function name when one is
 * set, otherwise `<stack name>-<construct id>`. (A function cannot reference its own generated
 * name in its environment because that creates a CloudFormation cycle.) Values already set on a
 * function are not overwritten.
 */
export class LambdaServiceNameAspect implements IAspect {
  public visit(node: IConstruct): void {
    if (!(node instanceof LambdaFunction)) {
      return;
    }
    const cfn = node.node.defaultChild as { environment?: { variables?: Record<string, string> } } | undefined;
    const existing = cfn?.environment?.variables || {};
    if (!('OTEL_SERVICE_NAME' in existing)) {
      const explicitName = cfn && (node.node.defaultChild as { functionName?: string }).functionName;
      const serviceName =
        explicitName && !Token.isUnresolved(explicitName) ? explicitName : `${node.stack.stackName}-${node.node.id}`;
      node.addEnvironment('OTEL_SERVICE_NAME', serviceName);
    }
  }
}

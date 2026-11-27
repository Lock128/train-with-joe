import { App, Aspects, Stack } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { Code, Function as LambdaFunction, Runtime } from 'aws-cdk-lib/aws-lambda';
import { describe, it } from 'vitest';

import { LambdaServiceNameAspect } from '../lib/util/lambda-service-name-aspect';

describe('LambdaServiceNameAspect', () => {
  it('sets OTEL_SERVICE_NAME to the function name and keeps existing variables', () => {
    const stack = new Stack(new App(), 'TestStack');
    new LambdaFunction(stack, 'Fn', {
      functionName: 'my-function',
      runtime: Runtime.NODEJS_20_X,
      handler: 'index.handler',
      code: Code.fromInline('exports.handler = async () => {}'),
      environment: { FOO: 'bar' },
    });
    Aspects.of(stack).add(new LambdaServiceNameAspect());

    Template.fromStack(stack).hasResourceProperties('AWS::Lambda::Function', {
      FunctionName: 'my-function',
      Environment: { Variables: { FOO: 'bar', OTEL_SERVICE_NAME: 'my-function' } },
    });
  });
});

import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import type { Bucket } from 'aws-cdk-lib/aws-s3';
import type { S3Origin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Distribution, ViewerProtocolPolicy, CachePolicy } from 'aws-cdk-lib/aws-cloudfront';

interface DistributionStackProps extends cdk.StackProps {
  namespace: string;
  frontendBucket: Bucket;
  frontendOrigin: S3Origin;
}

/**
 * CDK Stack for CloudFront distribution
 * Serves frontend application with CDN caching
 */
export class DistributionStack extends cdk.Stack {
  public readonly distribution: Distribution;
  public readonly distributionDomainName: string;

  constructor(scope: Construct, id: string, props: DistributionStackProps) {
    super(scope, id, props);

    const { namespace, frontendBucket, frontendOrigin } = props;

    // Create CloudFront distribution
    this.distribution = new Distribution(this, `Distribution-${namespace}`, {
      comment: `Minimal SaaS Template ${namespace} - Frontend Distribution`,
      defaultBehavior: {
        origin: frontendOrigin,
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      // SPA error handling - serve index.html for 404/403 to support client-side routing
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
        },
      ],
    });

    this.distributionDomainName = this.distribution.distributionDomainName;

    // Output distribution information
    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID',
    });

    new cdk.CfnOutput(this, 'DistributionDomainName', {
      value: this.distributionDomainName,
      description: 'CloudFront distribution domain name',
    });

    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'S3 bucket name for frontend hosting',
    });
  }
}

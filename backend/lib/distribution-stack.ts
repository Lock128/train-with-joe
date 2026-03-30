import * as cdk from 'aws-cdk-lib';
import { RemovalPolicy } from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { BlockPublicAccess, Bucket } from 'aws-cdk-lib/aws-s3';
import { S3BucketOrigin } from 'aws-cdk-lib/aws-cloudfront-origins';
import { Distribution, ViewerProtocolPolicy, CachePolicy } from 'aws-cdk-lib/aws-cloudfront';

interface DistributionStackProps extends cdk.StackProps {
  namespace: string;
}

/**
 * CDK Stack for CloudFront distributions
 * Creates S3 buckets and CloudFront distributions for frontend (Flutter) and join page (Angular).
 * Buckets live in this stack to avoid cross-stack dependency cycles with OAC.
 */
export class DistributionStack extends cdk.Stack {
  public readonly frontendDistribution: Distribution;
  public readonly joinPageDistribution: Distribution;
  public readonly frontendBucket: Bucket;
  public readonly joinPageBucket: Bucket;

  constructor(scope: Construct, id: string, props: DistributionStackProps) {
    super(scope, id, props);

    const { namespace } = props;

    // Create hosting buckets
    this.frontendBucket = new Bucket(this, 'FrontendBucket', {
      bucketName: `train-with-joe-frontend-${namespace}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.joinPageBucket = new Bucket(this, 'JoinPageBucket', {
      bucketName: `train-with-joe-join-page-${namespace}`,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    // Frontend distribution (Flutter web app)
    this.frontendDistribution = this.createSpaDistribution(
      'FrontendDistribution',
      `Train with Joe ${namespace} - Frontend`,
      this.frontendBucket,
    );

    // Join page distribution (Angular landing page)
    this.joinPageDistribution = this.createSpaDistribution(
      'JoinPageDistribution',
      `Train with Joe ${namespace} - Join Page`,
      this.joinPageBucket,
    );

    // Outputs
    new cdk.CfnOutput(this, 'FrontendDistributionId', {
      value: this.frontendDistribution.distributionId,
      description: 'Frontend CloudFront distribution ID',
    });
    new cdk.CfnOutput(this, 'FrontendDistributionDomainName', {
      value: this.frontendDistribution.distributionDomainName,
      description: 'Frontend CloudFront domain name',
    });
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: this.frontendBucket.bucketName,
      description: 'S3 bucket for frontend hosting',
    });
    new cdk.CfnOutput(this, 'JoinPageDistributionId', {
      value: this.joinPageDistribution.distributionId,
      description: 'Join page CloudFront distribution ID',
    });
    new cdk.CfnOutput(this, 'JoinPageDistributionDomainName', {
      value: this.joinPageDistribution.distributionDomainName,
      description: 'Join page CloudFront domain name',
    });
    new cdk.CfnOutput(this, 'JoinPageBucketName', {
      value: this.joinPageBucket.bucketName,
      description: 'S3 bucket for join page hosting',
    });
  }

  private createSpaDistribution(id: string, comment: string, bucket: Bucket): Distribution {
    return new Distribution(this, id, {
      comment,
      defaultBehavior: {
        origin: S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
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
  }
}

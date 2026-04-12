import * as cdk from 'aws-cdk-lib';
import type { Construct } from 'constructs';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';

interface CertificateStackProps extends cdk.StackProps {
  namespace: string;
}

/**
 * ACM certificate in us-east-1 (required for CloudFront).
 * Uses email validation. After deploying, pass the certificate ARN output
 * to the DistributionStack via the CERTIFICATE_ARN environment variable.
 */
export class CertificateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: CertificateStackProps) {
    super(scope, id, props);

    const { namespace } = props;

    const baseDomain = 'trainwithjoe.app';
    const isProduction = namespace === 'prod' || namespace === 'production';
    const joinPageDomain = isProduction ? baseDomain : `${namespace}.${baseDomain}`;
    const frontendDomain = isProduction ? `app.${baseDomain}` : `app.${namespace}.${baseDomain}`;

    const certificate = new Certificate(this, 'CloudFrontCertificate', {
      domainName: joinPageDomain,
      subjectAlternativeNames: [frontendDomain],
      validation: CertificateValidation.fromEmail(),
    });

    new cdk.CfnOutput(this, 'CertificateArn', {
      value: certificate.certificateArn,
      description: 'CloudFront ACM certificate ARN (us-east-1)',
      exportName: `${namespace}-cloudfront-certificate-arn`,
    });
  }
}

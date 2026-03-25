# GitHub Actions Workflows

This directory contains GitHub Actions workflows for CI/CD automation.

## Workflows

### CI/CD Pipeline (`ci-cd.yml`)
Main continuous integration and deployment pipeline that:
- Detects changes in backend, frontend, and landing pages
- Runs tests for changed components
- Deploys to AWS sandbox environment on main branch
- Creates deployment tags for tracking

**Triggers:**
- Push to main branch (with path filters)
- Manual workflow dispatch

**Jobs:**
- `changes`: Detects which components changed
- `backend-test`: Runs backend linting and tests
- `frontend-test`: Runs Flutter tests
- `join-page-test`: Runs Angular join page tests
- `deploy`: Deploys all components to AWS

### Promotion Pipeline - Beta (`promotion-pipeline.yml`)
Promotes a tagged release to the beta environment with full testing and validation.

**Triggers:**
- Manual workflow dispatch only

**Inputs:**
- `ref`: Git tag to deploy (tags only)
- `skip_tests`: Skip integration tests (default: false)

**Jobs:**
- `validate-inputs`: Validates deployment inputs
- `pre-deployment-tests`: Runs backend and frontend tests
- `deploy-to-beta`: Deploys to beta environment
- `create-github-release`: Creates or updates GitHub release
- `deployment-notification`: Sends deployment notifications

**Usage:**
Use this workflow to promote a sandbox deployment to beta for staging validation.

### Production Deployment (`production-deployment.yml`)
Deploys a validated release to the production environment with approval gates and smoke tests.

**Triggers:**
- Manual workflow dispatch only

**Inputs:**
- `ref`: Git tag or branch to deploy (use "main" for urgent deployments)
- `beta_url`: Beta environment URL for reference (optional)
- `release_url`: GitHub release URL (optional)
- `skip_smoke_tests`: Skip production smoke tests (default: false)
- `urgent_deployment`: Urgent deployment from main branch (default: false)

**Jobs:**
- `create-deployment-tag`: Creates deployment tag for urgent deployments
- `validate-production-deployment`: Validates deployment inputs
- `production-deployment-approval`: Requires manual approval (uses GitHub environment protection)
- `deploy-to-production`: Deploys to production environment
- `production-smoke-tests`: Runs basic smoke tests
- `update-github-release`: Updates GitHub release with production info
- `create-urgent-deployment-issue`: Creates tracking issue for urgent deployments
- `deployment-notification`: Sends deployment notifications

**Usage:**
Use this workflow to deploy validated releases to production. Normal flow: sandbox → beta → production. For emergencies, use urgent_deployment=true with ref=main.

### Bootstrap CDK (`bootstrap.yml`)
Bootstraps AWS CDK environment for a specific AWS account and region.

**Triggers:**
- Manual workflow dispatch only

**Inputs:**
- `environment`: sandbox, beta, or prod
- `region`: AWS region to bootstrap

**Usage:**
Run this once per AWS account/region combination before deploying CDK stacks.

## Required Secrets

Configure these secrets in your GitHub repository settings:

### AWS Credentials
- `AWS_ROLE_ARN`: IAM role ARN for sandbox deployments
- `AWS_ROLE_ARN_BETA`: IAM role ARN for beta deployments
- `AWS_ROLE_ARN_PROD`: IAM role ARN for production deployments

### Example IAM Role Trust Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:<OWNER>/<REPO>:*"
        }
      }
    }
  ]
}
```

## Dependabot

Dependabot is configured to automatically check for dependency updates weekly:
- npm packages (root and join_page)
- Flutter/Dart packages
- GitHub Actions versions

Updates are grouped by minor/patch versions to reduce PR noise.

## Deployment Flow

The recommended deployment flow is:

1. **Development**: Push to main branch → CI/CD pipeline runs tests and deploys to sandbox
2. **Staging**: Use promotion-pipeline.yml to deploy a sandbox tag to beta environment
3. **Production**: Use production-deployment.yml to deploy a beta tag to production (requires approval)

### Urgent Production Deployments

For critical hotfixes, you can deploy directly from main to production:
1. Set `urgent_deployment=true` and `ref=main` in production-deployment.yml
2. A deployment tag will be created automatically
3. Approval is still required
4. A tracking issue will be created for post-deployment review

## GitHub Environments

Configure these environments in your repository settings for deployment protection:

- `beta`: Optional reviewers for beta deployments
- `production-approval`: Required reviewers for production approval gate
- `production`: Production environment (deployment happens here after approval)

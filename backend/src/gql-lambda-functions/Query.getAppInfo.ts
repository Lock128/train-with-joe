import type { AppSyncResolverHandler } from 'aws-lambda';

interface AppInfo {
  commitId: string;
  buildNumber: string;
}

export const handler: AppSyncResolverHandler<Record<string, never>, AppInfo> = async () => {
  return {
    commitId: process.env.COMMIT_ID ?? 'unknown',
    buildNumber: process.env.BUILD_NUMBER ?? '0',
  };
};

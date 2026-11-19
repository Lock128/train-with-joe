import { init } from '@dash0/sdk-web';
import { dash0BuildConfig } from './dash0-config.generated';

/** Build-time Dash0 settings written by scripts/generate-dash0-config.mjs. */
export interface Dash0BuildConfig {
  endpointUrl: string;
  authToken: string;
  dataset?: string;
  environment?: string;
  deploymentName?: string;
  deploymentId?: string;
  vcsRevision?: string;
  vcsRefName?: string;
  vcsRepositoryUrl?: string;
}

let initialized = false;

/**
 * Starts the Dash0 Web SDK. Does nothing when the build has no Dash0 config
 * (local development, builds without secrets) and never throws.
 */
export function initDash0(config: Dash0BuildConfig | null = dash0BuildConfig): void {
  if (initialized || !config || typeof window === 'undefined') return;
  try {
    init({
      serviceName: 'train-with-joe-profile-cards',
      environment: config.environment,
      deploymentName: config.deploymentName,
      deploymentId: config.deploymentId,
      vcs:
        config.vcsRepositoryUrl || config.vcsRevision || config.vcsRefName
          ? {
              providerName: 'github',
              repositoryUrlFull: config.vcsRepositoryUrl,
              refHeadRevision: config.vcsRevision,
              refHeadName: config.vcsRefName,
            }
          : undefined,
      endpoint: {
        url: config.endpointUrl,
        authToken: config.authToken,
        dataset: config.dataset,
      },
    });
    initialized = true;
  } catch (err) {
    console.warn('Dash0 web SDK failed to initialise', err);
  }
}

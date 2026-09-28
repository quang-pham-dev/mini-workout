interface ImportMetaEnv {
  readonly LANDING_INDEXABLE: boolean;
  readonly LANDING_PREVIEW: boolean;
  readonly MEMBER_APP_URL: string;
  readonly SANITY_PROJECT_ID: string | undefined;
  readonly SANITY_STUDIO_URL: string;
  readonly LANDING_ANALYTICS_ENABLED: boolean;
  readonly LANDING_EXPERIMENTS_ENABLED: boolean;
  readonly LANDING_POSTHOG_KEY: string | undefined;
  readonly LANDING_POSTHOG_HOST: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

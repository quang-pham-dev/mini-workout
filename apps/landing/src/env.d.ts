interface ImportMetaEnv {
  readonly LANDING_INDEXABLE: boolean;
  readonly LANDING_PREVIEW: boolean;
  readonly MEMBER_APP_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

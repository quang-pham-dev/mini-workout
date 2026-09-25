interface ImportMetaEnv {
  readonly LANDING_INDEXABLE: boolean;
  readonly LANDING_PREVIEW: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

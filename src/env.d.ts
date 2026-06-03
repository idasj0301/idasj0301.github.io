/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_WECOM_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

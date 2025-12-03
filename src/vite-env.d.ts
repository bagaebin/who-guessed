/// <reference types="react" />
/// <reference types="react-dom" />

declare interface ImportMetaEnv {
  readonly VITE_LLM_ENDPOINT?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'vite/client' {}

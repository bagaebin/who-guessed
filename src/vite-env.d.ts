/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_LLM_ENDPOINT?: string;
  readonly VITE_IMAGE_ENDPOINT?: string;
  readonly VITE_CAMERA_TILE_Z_ADJUST?: string;
  readonly VITE_TILE_ROW_STEP?: string;
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv;
}

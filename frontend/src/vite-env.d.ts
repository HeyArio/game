/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  // Optional. Base URL for challenge links. Leave unset to use the Supabase
  // `challenge` edge function directly (zero web-server config); set to
  // "https://quorumdaily.com/c" for pretty links once nginx proxies /c/.
  readonly VITE_CHALLENGE_LINK_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

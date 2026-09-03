/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 내장 연결 모드 — 배포 시 Vercel 환경변수로 넣으면 사용자가 Supabase 설정 없이 방 코드만으로 연결해요 */
  readonly VITE_SYNC_URL?: string;
  readonly VITE_SYNC_ANON_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

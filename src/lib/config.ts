import { STORE } from "@/lib/store";

export function isSupabaseEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

export function assertOrderStorageReady(): string | null {
  if (isSupabaseEnabled()) return null;
  if (process.env.VERCEL) {
    return "Pedidos indisponíveis: configure o Supabase nas variáveis da Vercel (veja DEPLOY.md).";
  }
  return null;
}

export const STORE_NAME = STORE.name;

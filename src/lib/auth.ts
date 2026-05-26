import { cookies } from "next/headers";

export const ADMIN_COOKIE = "sdi_admin_session";

export function getAdminPassword(): string {
  return process.env.ADMIN_PASSWORD ?? "admin123";
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_COOKIE)?.value;
  if (!token) return false;
  const expected = await hashToken(getAdminPassword());
  return token === expected;
}

async function hashToken(value: string): Promise<string> {
  const data = new TextEncoder().encode(`sdi:${value}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(hash)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAdminSessionToken(): Promise<string> {
  return hashToken(getAdminPassword());
}

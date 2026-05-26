import { isSupabaseEnabled } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { MenuItem } from "@/types/menu";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function mapRow(row: Record<string, unknown>): MenuItem {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    available: Boolean(row.available),
    fit: Boolean(row.fit),
    position: Number(row.position ?? 0),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

async function list(table: "proteins" | "sides"): Promise<MenuItem[]> {
  if (!isSupabaseEnabled()) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function getPublicMenu() {
  const [proteins, sides] = await Promise.all([list("proteins"), list("sides")]);
  return { proteins, sides };
}

export async function adminListMenuItems(table: "proteins" | "sides") {
  return list(table);
}

export async function adminCreateMenuItem(
  table: "proteins" | "sides",
  input: { name: string; fit?: boolean; position?: number },
) {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase não configurado." };
  }
  const supabase = getSupabaseAdmin();
  const row = {
    slug: slugify(input.name),
    name: input.name.trim(),
    fit: Boolean(input.fit),
    position: input.position ?? 0,
    available: true,
  };
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) return { error: error.message };
  return { item: mapRow(data) };
}

export async function adminUpdateMenuItem(
  table: "proteins" | "sides",
  id: string,
  patch: Partial<Pick<MenuItem, "name" | "available" | "fit" | "position">>,
) {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase não configurado." };
  }
  const supabase = getSupabaseAdmin();
  const toUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof patch.available === "boolean") toUpdate.available = patch.available;
  if (typeof patch.fit === "boolean") toUpdate.fit = patch.fit;
  if (typeof patch.position === "number") toUpdate.position = patch.position;
  if (typeof patch.name === "string") {
    toUpdate.name = patch.name.trim();
    toUpdate.slug = slugify(patch.name);
  }

  const { data, error } = await supabase
    .from(table)
    .update(toUpdate)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return { item: mapRow(data) };
}

export async function adminDeleteMenuItem(
  table: "proteins" | "sides",
  id: string,
) {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase não configurado." };
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from(table).delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}


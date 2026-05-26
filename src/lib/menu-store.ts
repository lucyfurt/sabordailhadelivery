import { isSupabaseEnabled } from "@/lib/config";
import {
  FALLBACK_MEAL_TYPES,
  PROTEINS,
  SIDES,
} from "@/lib/menu";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { MealTypeItem, MenuItem } from "@/types/menu";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function mapMenuItem(row: Record<string, unknown>): MenuItem {
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

function mapMealType(row: Record<string, unknown>): MealTypeItem {
  return {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    description: (row.description as string) ?? "",
    price_cents: Number(row.price_cents),
    emoji: (row.emoji as string) ?? "🍱",
    required_proteins: Number(row.required_proteins ?? 1),
    required_sides: Number(row.required_sides ?? 4),
    available: Boolean(row.available),
    position: Number(row.position ?? 0),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

async function listItems(table: "proteins" | "sides"): Promise<MenuItem[]> {
  if (!isSupabaseEnabled()) {
    const items = table === "proteins" ? PROTEINS : SIDES;
    const now = new Date().toISOString();
    return items.map((it, idx) => ({
      id: it.id,
      slug: it.id,
      name: it.name,
      available: it.available,
      fit: false,
      position: idx,
      created_at: now,
      updated_at: now,
    }));
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMenuItem);
}

async function listMealTypes(includeUnavailable = false): Promise<MealTypeItem[]> {
  if (!isSupabaseEnabled()) {
    const now = new Date().toISOString();
    return FALLBACK_MEAL_TYPES.map((m) => ({
      ...m,
      created_at: now,
      updated_at: now,
    }));
  }
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("meal_types")
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (!includeUnavailable) {
    query = query.eq("available", true);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapMealType);
}

export async function getMealTypeById(
  id: string,
): Promise<MealTypeItem | null> {
  const types = await listMealTypes(true);
  return types.find((m) => m.id === id) ?? null;
}

export async function getPublicMenu() {
  const [mealTypes, proteins, sides] = await Promise.all([
    listMealTypes(false),
    listItems("proteins"),
    listItems("sides"),
  ]);
  return { mealTypes, proteins, sides };
}

export async function adminListMenuItems(table: "proteins" | "sides") {
  return listItems(table);
}

export async function adminListMealTypes() {
  return listMealTypes(true);
}

export async function adminCreateMenuItem(
  table: "proteins" | "sides",
  input: { name: string; position?: number },
) {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase não configurado." };
  }
  const supabase = getSupabaseAdmin();
  const row = {
    slug: slugify(input.name),
    name: input.name.trim(),
    fit: false,
    position: input.position ?? 0,
    available: true,
  };
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) return { error: error.message };
  return { item: mapMenuItem(data) };
}

export async function adminUpdateMenuItem(
  table: "proteins" | "sides",
  id: string,
  patch: Partial<Pick<MenuItem, "name" | "available" | "position">>,
) {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase não configurado." };
  }
  const supabase = getSupabaseAdmin();
  const toUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof patch.available === "boolean") toUpdate.available = patch.available;
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
  return { item: mapMenuItem(data) };
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

export async function adminCreateMealType(input: {
  name: string;
  description?: string;
  price_cents: number;
  emoji?: string;
  required_proteins?: number;
  required_sides?: number;
  position?: number;
}) {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase não configurado." };
  }
  const supabase = getSupabaseAdmin();
  const row = {
    slug: slugify(input.name),
    name: input.name.trim(),
    description: input.description?.trim() ?? "",
    price_cents: input.price_cents,
    emoji: input.emoji?.trim() || "🍱",
    required_proteins: Math.max(0, input.required_proteins ?? 1),
    required_sides: Math.max(0, input.required_sides ?? 4),
    position: input.position ?? 0,
    available: true,
  };
  const { data, error } = await supabase
    .from("meal_types")
    .insert(row)
    .select()
    .single();
  if (error) return { error: error.message };
  return { item: mapMealType(data) };
}

export async function adminUpdateMealType(
  id: string,
  patch: Partial<
    Pick<
      MealTypeItem,
      | "name"
      | "description"
      | "price_cents"
      | "emoji"
      | "required_proteins"
      | "required_sides"
      | "available"
      | "position"
    >
  >,
) {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase não configurado." };
  }
  const supabase = getSupabaseAdmin();
  const toUpdate: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof patch.name === "string") {
    toUpdate.name = patch.name.trim();
    toUpdate.slug = slugify(patch.name);
  }
  if (typeof patch.description === "string") {
    toUpdate.description = patch.description.trim();
  }
  if (typeof patch.price_cents === "number") {
    toUpdate.price_cents = patch.price_cents;
  }
  if (typeof patch.emoji === "string") toUpdate.emoji = patch.emoji.trim();
  if (typeof patch.required_proteins === "number") {
    toUpdate.required_proteins = Math.max(0, patch.required_proteins);
  }
  if (typeof patch.required_sides === "number") {
    toUpdate.required_sides = Math.max(0, patch.required_sides);
  }
  if (typeof patch.available === "boolean") toUpdate.available = patch.available;
  if (typeof patch.position === "number") toUpdate.position = patch.position;

  const { data, error } = await supabase
    .from("meal_types")
    .update(toUpdate)
    .eq("id", id)
    .select()
    .single();
  if (error) return { error: error.message };
  return { item: mapMealType(data) };
}

export async function adminDeleteMealType(id: string) {
  if (!isSupabaseEnabled()) {
    return { error: "Supabase não configurado." };
  }
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("meal_types").delete().eq("id", id);
  if (error) return { error: error.message };
  return { ok: true };
}

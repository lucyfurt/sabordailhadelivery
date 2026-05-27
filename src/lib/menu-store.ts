import { isSupabaseEnabled } from "@/lib/config";
import {
  ADDITIONALS,
  FALLBACK_MEAL_TYPES,
  PROTEINS,
  SIDES,
} from "@/lib/menu";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { AdditionalItem, MealTypeItem, MenuItem } from "@/types/menu";

function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function mapMenuItem(
  row: Record<string, unknown>,
  includeUnitPrice = false,
): MenuItem | AdditionalItem {
  const base = {
    id: row.id as string,
    slug: row.slug as string,
    name: row.name as string,
    available: Boolean(row.available),
    fit: Boolean(row.fit),
    position: Number(row.position ?? 0),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
  if (!includeUnitPrice) return base;
  return {
    ...base,
    unit_price_cents: Number(row.unit_price_cents ?? 0),
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

async function listItems(
  table: "proteins" | "sides" | "additionals",
): Promise<Array<MenuItem | AdditionalItem>> {
  if (!isSupabaseEnabled()) {
    const items =
      table === "proteins"
        ? PROTEINS
        : table === "sides"
          ? SIDES
          : ADDITIONALS;
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
      ...(table === "additionals"
        ? {
            unit_price_cents: Number(
              (it as { unit_price_cents?: number }).unit_price_cents ?? 0,
            ),
          }
        : {}),
    }));
  }
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(table)
    .select("*")
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row) =>
    mapMenuItem(row as Record<string, unknown>, table === "additionals"),
  );
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
  const [mealTypes, proteins, sides, additionals] = await Promise.all([
    listMealTypes(false),
    listItems("proteins"),
    listItems("sides"),
    listItems("additionals"),
  ]);
  const [mealTypeProteins, mealTypeSides] = await Promise.all([
    listMealTypeItemIds("meal_type_proteins", "protein_id", mealTypes.map((m) => m.id)),
    listMealTypeItemIds("meal_type_sides", "side_id", mealTypes.map((m) => m.id)),
  ]);
  return {
    mealTypes,
    proteins: proteins as MenuItem[],
    sides: sides as MenuItem[],
    additionals: additionals as AdditionalItem[],
    mealTypeProteins,
    mealTypeSides,
  };
}

export async function adminListMenuItems(
  table: "proteins" | "sides" | "additionals",
) {
  return listItems(table);
}

export async function adminListMealTypes() {
  return listMealTypes(true);
}

export async function adminCreateMenuItem(
  table: "proteins" | "sides" | "additionals",
  input: { name: string; position?: number; unit_price_cents?: number },
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
    ...(table === "additionals"
      ? { unit_price_cents: Math.max(0, Number(input.unit_price_cents ?? 0)) }
      : {}),
  };
  const { data, error } = await supabase.from(table).insert(row).select().single();
  if (error) return { error: error.message };
  return {
    item: mapMenuItem(
      data as Record<string, unknown>,
      table === "additionals",
    ),
  };
}

export async function adminUpdateMenuItem(
  table: "proteins" | "sides" | "additionals",
  id: string,
  patch: Partial<
    Pick<MenuItem, "name" | "available" | "position"> & {
      unit_price_cents: number;
    }
  >,
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
  if (table === "additionals" && typeof patch.unit_price_cents === "number") {
    toUpdate.unit_price_cents = Math.max(0, patch.unit_price_cents);
  }

  const { data, error } = await supabase
    .from(table)
    .update(toUpdate)
    .eq("id", id)
    .select()
    .single();

  if (error) return { error: error.message };
  return {
    item: mapMenuItem(
      data as Record<string, unknown>,
      table === "additionals",
    ),
  };
}

export async function adminDeleteMenuItem(
  table: "proteins" | "sides" | "additionals",
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
  const mealTypeId = data.id as string;
  const [proteinIdsRes, sideIdsRes] = await Promise.all([
    supabase.from("proteins").select("id").eq("available", true),
    supabase.from("sides").select("id").eq("available", true),
  ]);
  if (proteinIdsRes.error) return { error: proteinIdsRes.error.message };
  if (sideIdsRes.error) return { error: sideIdsRes.error.message };
  if ((proteinIdsRes.data ?? []).length > 0) {
    const { error: linkError } = await supabase
      .from("meal_type_proteins")
      .upsert(
        (proteinIdsRes.data ?? []).map((p) => ({
          meal_type_id: mealTypeId,
          protein_id: p.id as string,
        })),
        {
          onConflict: "meal_type_id,protein_id",
          ignoreDuplicates: true,
        },
      );
    if (linkError) return { error: linkError.message };
  }
  if ((sideIdsRes.data ?? []).length > 0) {
    const { error: linkError } = await supabase
      .from("meal_type_sides")
      .upsert(
        (sideIdsRes.data ?? []).map((s) => ({
          meal_type_id: mealTypeId,
          side_id: s.id as string,
        })),
        {
          onConflict: "meal_type_id,side_id",
          ignoreDuplicates: true,
        },
      );
    if (linkError) return { error: linkError.message };
  }
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

async function listMealTypeItemIds(
  table: "meal_type_proteins" | "meal_type_sides",
  itemCol: "protein_id" | "side_id",
  mealTypeIds: string[],
): Promise<Record<string, string[]>> {
  if (mealTypeIds.length === 0) return {};
  if (!isSupabaseEnabled()) {
    const allFallback =
      itemCol === "protein_id" ? PROTEINS.map((p) => p.id) : SIDES.map((s) => s.id);
    const map: Record<string, string[]> = {};
    for (const id of mealTypeIds) map[id] = allFallback;
    return map;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from(table)
    .select(`meal_type_id, ${itemCol}`)
    .in("meal_type_id", mealTypeIds);
  if (error) throw new Error(error.message);
  const map: Record<string, string[]> = {};
  for (const id of mealTypeIds) map[id] = [];
  for (const row of data ?? []) {
    const rowAny = row as Record<string, unknown>;
    const mealTypeId = rowAny.meal_type_id as string;
    const itemId = rowAny[itemCol] as string;
    if (!map[mealTypeId]) map[mealTypeId] = [];
    map[mealTypeId].push(itemId);
  }
  return map;
}

export async function adminGetMealTypeItems(mealTypeId: string) {
  const [proteins, sides] = await Promise.all([
    listMealTypeItemIds("meal_type_proteins", "protein_id", [mealTypeId]),
    listMealTypeItemIds("meal_type_sides", "side_id", [mealTypeId]),
  ]);
  return {
    protein_ids: proteins[mealTypeId] ?? [],
    side_ids: sides[mealTypeId] ?? [],
  };
}

export async function getMealTypeAllowedItemIds(mealTypeId: string) {
  return adminGetMealTypeItems(mealTypeId);
}

export async function adminSetMealTypeItems(
  mealTypeId: string,
  input: { protein_ids: string[]; side_ids: string[] },
) {
  if (!isSupabaseEnabled()) return { error: "Supabase não configurado." };
  const supabase = getSupabaseAdmin();

  const uniqueProteins = [...new Set(input.protein_ids)];
  const uniqueSides = [...new Set(input.side_ids)];

  const delP = await supabase.from("meal_type_proteins").delete().eq("meal_type_id", mealTypeId);
  if (delP.error) return { error: delP.error.message };
  const delS = await supabase.from("meal_type_sides").delete().eq("meal_type_id", mealTypeId);
  if (delS.error) return { error: delS.error.message };

  if (uniqueProteins.length > 0) {
    const { error } = await supabase
      .from("meal_type_proteins")
      .upsert(
        uniqueProteins.map((protein_id) => ({
          meal_type_id: mealTypeId,
          protein_id,
        })),
        {
          onConflict: "meal_type_id,protein_id",
          ignoreDuplicates: true,
        },
      );
    if (error) return { error: error.message };
  }
  if (uniqueSides.length > 0) {
    const { error } = await supabase
      .from("meal_type_sides")
      .upsert(
        uniqueSides.map((side_id) => ({ meal_type_id: mealTypeId, side_id })),
        {
          onConflict: "meal_type_id,side_id",
          ignoreDuplicates: true,
        },
      );
    if (error) return { error: error.message };
  }

  return { ok: true };
}

import { ADDITIONALS } from "@/lib/menu";
import { isSupabaseEnabled } from "@/lib/config";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type {
  CreateOrderAdditionalInput,
  OrderAdditionalItem,
} from "@/types/order";

function normalizeAdditionalInputs(
  input: CreateOrderAdditionalInput[] | undefined,
): CreateOrderAdditionalInput[] {
  if (!input?.length) return [];
  const grouped = new Map<string, number>();
  for (const item of input) {
    const id = item.additional_id?.trim();
    const quantity = Number(item.quantity ?? 0);
    if (!id || !Number.isInteger(quantity) || quantity <= 0) continue;
    grouped.set(id, (grouped.get(id) ?? 0) + quantity);
  }
  return [...grouped.entries()].map(([additional_id, quantity]) => ({
    additional_id,
    quantity,
  }));
}

export async function resolveOrderAdditionals(
  input: CreateOrderAdditionalInput[] | undefined,
): Promise<{ items: OrderAdditionalItem[]; error?: string }> {
  const normalized = normalizeAdditionalInputs(input);
  if (normalized.length === 0) return { items: [] };

  if (!isSupabaseEnabled()) {
    const items: OrderAdditionalItem[] = [];
    for (const item of normalized) {
      const additional = ADDITIONALS.find((a) => a.id === item.additional_id);
      if (!additional || !additional.available) {
        return { items: [], error: "Adicional inválido ou indisponível." };
      }
      const total_cents = additional.unit_price_cents * item.quantity;
      items.push({
        id: additional.id,
        name: additional.name,
        unit_price_cents: additional.unit_price_cents,
        quantity: item.quantity,
        total_cents,
      });
    }
    return { items };
  }

  const supabase = getSupabaseAdmin();
  const ids = normalized.map((i) => i.additional_id);
  const { data, error } = await supabase
    .from("additionals")
    .select("id,name,available,unit_price_cents")
    .in("id", ids);

  if (error) return { items: [], error: error.message };

  const rows = data ?? [];
  if (rows.length !== ids.length) {
    return { items: [], error: "Adicional inválido." };
  }
  if (rows.some((r) => !r.available)) {
    return { items: [], error: "Um ou mais adicionais estão indisponíveis." };
  }

  const items: OrderAdditionalItem[] = normalized.map((item) => {
    const row = rows.find((r) => r.id === item.additional_id)!;
    const unitPrice = Number(row.unit_price_cents ?? 0);
    return {
      id: row.id as string,
      name: row.name as string,
      unit_price_cents: unitPrice,
      quantity: item.quantity,
      total_cents: unitPrice * item.quantity,
    };
  });

  return { items };
}

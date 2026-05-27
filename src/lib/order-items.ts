import type { MenuItemRef, Order, OrderLineItem } from "@/types/order";

export function normalizeOrderProteins(
  row: Record<string, unknown>,
): MenuItemRef[] {
  const raw = row.proteins;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as MenuItemRef[];
  }
  const id = row.protein_id as string | undefined;
  const name = row.protein_name as string | undefined;
  if (id && name) return [{ id, name }];
  return [];
}

export function proteinsFromRow(row: Record<string, unknown>): {
  proteins: MenuItemRef[];
  protein_id: string;
  protein_name: string;
} {
  const proteins = normalizeOrderProteins(row);
  const first = proteins[0];
  return {
    proteins,
    protein_id: first?.id ?? (row.protein_id as string) ?? "",
    protein_name: first?.name ?? (row.protein_name as string) ?? "",
  };
}

function normalizeOrderItems(row: Record<string, unknown>): OrderLineItem[] {
  const raw = row.items;
  if (Array.isArray(raw) && raw.length > 0) {
    return raw as OrderLineItem[];
  }
  const { proteins } = proteinsFromRow(row);
  const sides = (row.sides as OrderLineItem["sides"]) ?? [];
  return [
    {
      meal_type_id: row.meal_type_id as string,
      meal_type_name: row.meal_type_name as string,
      proteins,
      sides,
      unit_price_cents: Number(row.total_cents ?? 0),
    },
  ];
}

export function mapOrderRow(row: Record<string, unknown>): Order {
  const items = normalizeOrderItems(row);
  const first = items[0];
  const { proteins, protein_id, protein_name } = proteinsFromRow(row);

  return {
    id: row.id as string,
    order_number: row.order_number as string,
    customer_name: row.customer_name as string,
    customer_phone: row.customer_phone as string,
    delivery_type: row.delivery_type as Order["delivery_type"],
    address: (row.address as string | null) ?? null,
    items,
    additionals: ((row.additionals as Order["additionals"]) ?? []).map((a) => ({
      ...a,
      quantity: Number(a.quantity ?? 0),
      unit_price_cents: Number(a.unit_price_cents ?? 0),
      total_cents: Number(a.total_cents ?? 0),
    })),
    meal_type_id: first?.meal_type_id ?? (row.meal_type_id as string),
    meal_type_name:
      items.length > 1
        ? items.map((i) => i.meal_type_name).join(" + ")
        : (first?.meal_type_name ?? (row.meal_type_name as string)),
    proteins: first?.proteins ?? proteins,
    protein_id: first?.proteins[0]?.id ?? protein_id,
    protein_name: first?.proteins[0]?.name ?? protein_name,
    sides: first?.sides ?? (row.sides as Order["sides"]),
    notes: (row.notes as string | null) ?? null,
    total_cents: row.total_cents as number,
    status: row.status as Order["status"],
    created_at: row.created_at as string,
    paid_at: (row.paid_at as string | null) ?? null,
    updated_at: row.updated_at as string,
  };
}

import type { MenuItemRef, Order } from "@/types/order";

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

export function mapOrderRow(row: Record<string, unknown>): Order {
  const { proteins, protein_id, protein_name } = proteinsFromRow(row);
  return {
    id: row.id as string,
    order_number: row.order_number as string,
    customer_name: row.customer_name as string,
    customer_phone: row.customer_phone as string,
    delivery_type: row.delivery_type as Order["delivery_type"],
    address: (row.address as string | null) ?? null,
    meal_type_id: row.meal_type_id as string,
    meal_type_name: row.meal_type_name as string,
    proteins,
    protein_id,
    protein_name,
    sides: row.sides as Order["sides"],
    notes: (row.notes as string | null) ?? null,
    total_cents: row.total_cents as number,
    status: row.status as Order["status"],
    created_at: row.created_at as string,
    paid_at: (row.paid_at as string | null) ?? null,
    updated_at: row.updated_at as string,
  };
}

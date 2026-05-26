import { createClient } from "@supabase/supabase-js";
import {
  calculateTotal,
  getMealType,
  getProtein,
  getSide,
  REQUIRED_SIDES,
} from "@/lib/menu";
import { formatOrderNumber, todayKey } from "@/lib/order-number";
import { normalizePhone } from "@/lib/phone";
import type { CreateOrderInput, Order, OrderStatus } from "@/types/order";

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, key, { auth: { persistSession: false } });
}

function validateCreateInput(input: CreateOrderInput): string | null {
  const meal = getMealType(input.meal_type_id);
  const protein = getProtein(input.protein_id);
  if (!meal) return "Tipo de marmita inválido.";
  if (!protein?.available) return "Proteína indisponível.";
  if (input.side_ids.length !== REQUIRED_SIDES) {
    return `Selecione exatamente ${REQUIRED_SIDES} acompanhamentos.`;
  }
  const unique = new Set(input.side_ids);
  if (unique.size !== REQUIRED_SIDES) {
    return "Não repita o mesmo acompanhamento.";
  }
  for (const id of input.side_ids) {
    const side = getSide(id);
    if (!side?.available) return `Acompanhamento indisponível.`;
  }
  if (input.delivery_type === "delivery" && !input.address?.trim()) {
    return "Informe o endereço para entrega.";
  }
  if (!input.customer_name.trim()) return "Informe seu nome.";
  if (normalizePhone(input.customer_phone).length < 12) {
    return "Informe um WhatsApp válido com DDD.";
  }
  return null;
}

function mapRow(row: Record<string, unknown>): Order {
  return {
    id: row.id as string,
    order_number: row.order_number as string,
    customer_name: row.customer_name as string,
    customer_phone: row.customer_phone as string,
    delivery_type: row.delivery_type as Order["delivery_type"],
    address: (row.address as string | null) ?? null,
    meal_type_id: row.meal_type_id as string,
    meal_type_name: row.meal_type_name as string,
    protein_id: row.protein_id as string,
    protein_name: row.protein_name as string,
    sides: row.sides as Order["sides"],
    notes: (row.notes as string | null) ?? null,
    total_cents: row.total_cents as number,
    status: row.status as OrderStatus,
    created_at: row.created_at as string,
    paid_at: (row.paid_at as string | null) ?? null,
    updated_at: row.updated_at as string,
  };
}

async function nextSequence(supabase: ReturnType<typeof getAdminClient>) {
  const key = todayKey();
  const { data, error } = await supabase.rpc("increment_daily_counter", {
    p_date: key,
  });
  if (error) throw error;
  return data as number;
}

export async function supabaseCreateOrder(
  input: CreateOrderInput,
): Promise<{ order?: Order; error?: string }> {
  const validation = validateCreateInput(input);
  if (validation) return { error: validation };

  const supabase = getAdminClient();
  const meal = getMealType(input.meal_type_id)!;
  const protein = getProtein(input.protein_id)!;
  const sides = input.side_ids.map((id) => {
    const s = getSide(id)!;
    return { id: s.id, name: s.name };
  });

  const now = new Date();
  let sequence: number;
  try {
    sequence = await nextSequence(supabase);
  } catch {
    const { count } = await supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .gte("created_at", `${todayKey()}T00:00:00`);
    sequence = (count ?? 0) + 1;
  }

  const orderNumber = formatOrderNumber(now, sequence);
  const row = {
    order_number: orderNumber,
    customer_name: input.customer_name.trim(),
    customer_phone: normalizePhone(input.customer_phone),
    delivery_type: input.delivery_type,
    address: input.address?.trim() ?? null,
    meal_type_id: meal.id,
    meal_type_name: meal.name,
    protein_id: protein.id,
    protein_name: protein.name,
    sides,
    notes: input.notes?.trim() ?? null,
    total_cents: calculateTotal(meal.id, input.delivery_type),
    status: "awaiting_payment" as const,
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(row)
    .select()
    .single();

  if (error) return { error: error.message };
  return { order: mapRow(data) };
}

export async function supabaseListOrders(date?: string): Promise<Order[]> {
  const supabase = getAdminClient();
  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  if (date) {
    query = query
      .gte("created_at", `${date}T00:00:00`)
      .lt("created_at", `${date}T23:59:59.999`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapRow);
}

export async function supabaseGetOrderByNumber(
  orderNumber: string,
): Promise<Order | null> {
  const supabase = getAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapRow(data) : null;
}

export async function supabaseUpdateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order | null> {
  const supabase = getAdminClient();
  const patch: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };
  if (status === "paid") {
    patch.paid_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("orders")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) return null;
  return mapRow(data);
}

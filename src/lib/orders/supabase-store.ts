import { buildLineItem, calculateOrderTotal } from "@/lib/orders/build-line-item";
import { resolveOrderAdditionals } from "@/lib/orders/additionals";
import { mapOrderRow } from "@/lib/order-items";
import { formatOrderNumber, todayKey } from "@/lib/order-number";
import { normalizePhone } from "@/lib/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CreateOrderInput, Order, OrderStatus } from "@/types/order";

function isMissingItemsColumnError(message: string): boolean {
  return (
    message.includes("Could not find the 'items' column of 'orders'") ||
    message.includes("column \"items\" of relation \"orders\" does not exist")
  );
}

function validateCustomer(input: CreateOrderInput): string | null {
  if (!input.items?.length) return "Adicione pelo menos uma marmita ao pedido.";
  if (input.delivery_type === "delivery" && !input.address?.trim()) {
    return "Informe o endereço para entrega.";
  }
  if (!input.customer_name.trim()) return "Informe seu nome.";
  if (normalizePhone(input.customer_phone).length < 12) {
    return "Informe um WhatsApp válido com DDD.";
  }
  return null;
}

async function nextSequence(supabase: ReturnType<typeof getSupabaseAdmin>) {
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
  const customerErr = validateCustomer(input);
  if (customerErr) return { error: customerErr };

  const items = [];
  for (let i = 0; i < input.items.length; i++) {
    const result = await buildLineItem(input.items[i]);
    if (result.error) {
      return { error: `Marmita ${i + 1}: ${result.error}` };
    }
    items.push(result.item!);
  }

  const supabase = getSupabaseAdmin();
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

  const first = items[0];
  const firstProtein = first.proteins[0];
  const additionalsResult = await resolveOrderAdditionals(input.additionals);
  if (additionalsResult.error) return { error: additionalsResult.error };
  const additionals = additionalsResult.items;
  const additionalsTotal = additionals.reduce((sum, a) => sum + a.total_cents, 0);
  const orderNumber = formatOrderNumber(now, sequence);
  const row = {
    order_number: orderNumber,
    customer_name: input.customer_name.trim(),
    customer_phone: normalizePhone(input.customer_phone),
    delivery_type: input.delivery_type,
    address: input.address?.trim() ?? null,
    items,
    additionals,
    meal_type_id: first.meal_type_id,
    meal_type_name:
      items.length > 1
        ? items.map((i) => i.meal_type_name).join(" + ")
        : first.meal_type_name,
    proteins: first.proteins,
    protein_id: firstProtein?.id ?? "",
    protein_name: firstProtein?.name ?? "",
    sides: first.sides,
    notes: input.notes?.trim() ?? null,
    total_cents: calculateOrderTotal(items, input.delivery_type, additionalsTotal),
    status: "awaiting_payment" as const,
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(row)
    .select()
    .single();

  if (error) {
    if (isMissingItemsColumnError(error.message ?? "")) {
      return {
        error:
          "A coluna orders.items não existe no banco atual. Rode a migração no Supabase: alter table orders add column if not exists items jsonb not null default '[]'::jsonb; e tente novamente.",
      };
    }
    return { error: error.message };
  }
  return { order: mapOrderRow(data) };
}

export async function supabaseListOrders(date?: string): Promise<Order[]> {
  const supabase = getSupabaseAdmin();
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
  return (data ?? []).map(mapOrderRow);
}

export async function supabaseGetOrderByNumber(
  orderNumber: string,
): Promise<Order | null> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("orders")
    .select("*")
    .eq("order_number", orderNumber)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data ? mapOrderRow(data) : null;
}

export async function supabaseUpdateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<{ order?: Order; error?: string; notFound?: boolean }> {
  const supabase = getSupabaseAdmin();

  const exists = await supabase
    .from("orders")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (exists.error) {
    return { error: exists.error.message ?? "Erro ao validar pedido." };
  }
  if (!exists.data) {
    return { notFound: true, error: "Pedido não encontrado." };
  }

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

  if (error) {
    const message = error.message ?? "Erro ao atualizar pedido.";
    if ((error as unknown as { code?: string }).code === "PGRST116") {
      return {
        error:
          "Sem permissão para atualizar (RLS). Verifique SUPABASE_SERVICE_ROLE_KEY.",
      };
    }
    return { error: message };
  }
  return { order: mapOrderRow(data) };
}

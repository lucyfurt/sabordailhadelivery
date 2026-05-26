import {
  calculateTotalFromMeal,
} from "@/lib/menu";
import { getMealTypeById } from "@/lib/menu-store";
import { mapOrderRow } from "@/lib/order-items";
import { formatOrderNumber, todayKey } from "@/lib/order-number";
import { normalizePhone } from "@/lib/phone";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { CreateOrderInput, Order, OrderStatus } from "@/types/order";

function validateBasics(
  input: CreateOrderInput,
  meal: NonNullable<Awaited<ReturnType<typeof getMealTypeById>>>,
): string | null {
  if (!meal.available) return "Tipo de marmita indisponível.";

  const reqP = meal.required_proteins;
  const reqS = meal.required_sides;

  if (reqP > 0 && input.protein_ids.length !== reqP) {
    return `Selecione exatamente ${reqP} proteína(s).`;
  }
  if (reqP > 0) {
    const uniqueP = new Set(input.protein_ids);
    if (uniqueP.size !== reqP) {
      return "Não repita a mesma proteína.";
    }
  }

  if (reqS > 0 && input.side_ids.length !== reqS) {
    return `Selecione exatamente ${reqS} acompanhamento(s).`;
  }
  if (reqS > 0) {
    const uniqueS = new Set(input.side_ids);
    if (uniqueS.size !== reqS) {
      return "Não repita o mesmo acompanhamento.";
    }
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
  const meal = await getMealTypeById(input.meal_type_id);
  if (!meal) return { error: "Tipo de marmita inválido." };

  const validation = validateBasics(input, meal);
  if (validation) return { error: validation };

  const supabase = getSupabaseAdmin();

  let proteinRows: { id: string; name: string; available: boolean }[] = [];
  if (meal.required_proteins > 0) {
    const proteinRes = await supabase
      .from("proteins")
      .select("id,name,available")
      .in("id", input.protein_ids);
    if (proteinRes.error) return { error: proteinRes.error.message };
    proteinRows = proteinRes.data ?? [];
    if (proteinRows.length !== meal.required_proteins) {
      return { error: "Proteína inválida." };
    }
    if (proteinRows.some((p) => !p.available)) {
      return { error: "Uma ou mais proteínas estão indisponíveis." };
    }
  }

  let sideRows: { id: string; name: string; available: boolean }[] = [];
  if (meal.required_sides > 0) {
    const sidesRes = await supabase
      .from("sides")
      .select("id,name,available")
      .in("id", input.side_ids);
    if (sidesRes.error) return { error: sidesRes.error.message };
    sideRows = sidesRes.data ?? [];
    if (sideRows.length !== meal.required_sides) {
      return { error: "Acompanhamento inválido." };
    }
    if (sideRows.some((s) => !s.available)) {
      return { error: "Um ou mais acompanhamentos estão indisponíveis." };
    }
  }

  const proteins = input.protein_ids.map((id) => {
    const row = proteinRows.find((p) => p.id === id);
    return { id, name: row?.name ?? id };
  });
  const sides = input.side_ids.map((id) => {
    const row = sideRows.find((s) => s.id === id);
    return { id, name: row?.name ?? id };
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
  const firstProtein = proteins[0];
  const row = {
    order_number: orderNumber,
    customer_name: input.customer_name.trim(),
    customer_phone: normalizePhone(input.customer_phone),
    delivery_type: input.delivery_type,
    address: input.address?.trim() ?? null,
    meal_type_id: meal.id,
    meal_type_name: meal.name,
    proteins,
    protein_id: firstProtein?.id ?? "",
    protein_name: firstProtein?.name ?? "",
    sides,
    notes: input.notes?.trim() ?? null,
    total_cents: calculateTotalFromMeal(meal.price_cents, input.delivery_type),
    status: "awaiting_payment" as const,
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(row)
    .select()
    .single();

  if (error) return { error: error.message };
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

import { calculateTotalFromMeal, getFallbackMealType, getProtein, getSide } from "@/lib/menu";
import { getMealTypeAllowedItemIds, getMealTypeById } from "@/lib/menu-store";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import { isSupabaseEnabled } from "@/lib/config";
import type { CreateOrderLineInput, OrderLineItem } from "@/types/order";

function validateLineCounts(
  meal: { required_proteins: number; required_sides: number },
  input: CreateOrderLineInput,
): string | null {
  const reqP = meal.required_proteins;
  const reqS = meal.required_sides;

  if (reqP > 0 && input.protein_ids.length !== reqP) {
    return `Selecione exatamente ${reqP} proteína(s).`;
  }
  if (reqP > 0) {
    const uniqueP = new Set(input.protein_ids);
    if (uniqueP.size !== reqP) return "Não repita a mesma proteína.";
  }

  if (reqS > 0 && input.side_ids.length < 1) {
    return "Selecione pelo menos 1 acompanhamento.";
  }
  if (reqS > 0 && input.side_ids.length > reqS) {
    return `Selecione no máximo ${reqS} acompanhamento(s).`;
  }
  if (reqS > 0) {
    const uniqueS = new Set(input.side_ids);
    if (uniqueS.size !== input.side_ids.length) {
      return "Não repita o mesmo acompanhamento.";
    }
  }
  return null;
}

export async function buildLineItem(
  input: CreateOrderLineInput,
): Promise<{ item?: OrderLineItem; error?: string }> {
  if (!isSupabaseEnabled()) {
    const meal = getFallbackMealType(input.meal_type_id);
    if (!meal) return { error: "Tipo de marmita inválido." };
    if (!meal.available) return { error: "Tipo de marmita indisponível." };
    const countErr = validateLineCounts(meal, input);
    if (countErr) return { error: countErr };

    const proteins = input.protein_ids.map((id) => {
      const p = getProtein(id);
      if (!p?.available) throw new Error("Proteína indisponível.");
      return { id: p.id, name: p.name };
    });
    const sides = input.side_ids.map((id) => {
      const s = getSide(id);
      if (!s?.available) throw new Error("Acompanhamento indisponível.");
      return { id: s.id, name: s.name };
    });

    return {
      item: {
        meal_type_id: meal.id,
        meal_type_name: meal.name,
        proteins,
        sides,
        unit_price_cents: meal.price_cents,
      },
    };
  }

  const meal = await getMealTypeById(input.meal_type_id);
  if (!meal) return { error: "Tipo de marmita inválido." };
  if (!meal.available) return { error: "Tipo de marmita indisponível." };
  const countErr = validateLineCounts(meal, input);
  if (countErr) return { error: countErr };

  const supabase = getSupabaseAdmin();
  const allowed = await getMealTypeAllowedItemIds(meal.id);

  let proteinRows: { id: string; name: string; available: boolean }[] = [];
  if (meal.required_proteins > 0) {
    if (input.protein_ids.some((id) => !allowed.protein_ids.includes(id))) {
      return { error: "Proteína não permitida para este tipo de marmita." };
    }
    const res = await supabase
      .from("proteins")
      .select("id,name,available")
      .in("id", input.protein_ids);
    if (res.error) return { error: res.error.message };
    proteinRows = res.data ?? [];
    if (proteinRows.length !== input.protein_ids.length) {
      return { error: "Proteína inválida." };
    }
    if (proteinRows.some((p) => !p.available)) {
      return { error: "Uma ou mais proteínas estão indisponíveis." };
    }
  }

  let sideRows: { id: string; name: string; available: boolean }[] = [];
  if (meal.required_sides > 0) {
    if (input.side_ids.some((id) => !allowed.side_ids.includes(id))) {
      return { error: "Acompanhamento não permitido para este tipo de marmita." };
    }
    const res = await supabase
      .from("sides")
      .select("id,name,available")
      .in("id", input.side_ids);
    if (res.error) return { error: res.error.message };
    sideRows = res.data ?? [];
    if (sideRows.length !== input.side_ids.length) {
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

  return {
    item: {
      meal_type_id: meal.id,
      meal_type_name: meal.name,
      proteins,
      sides,
      unit_price_cents: meal.price_cents,
    },
  };
}

export function calculateOrderTotal(
  items: OrderLineItem[],
  deliveryType: "pickup" | "delivery",
  additionalsTotalCents = 0,
): number {
  const subtotal = items.reduce((sum, i) => sum + i.unit_price_cents, 0);
  if (items.length === 0) return 0;
  return calculateTotalFromMeal(subtotal + additionalsTotalCents, deliveryType);
}

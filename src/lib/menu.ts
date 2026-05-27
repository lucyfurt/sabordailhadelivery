import { STORE } from "@/lib/store";
import type { MealTypeItem } from "@/types/menu";

export interface MenuOption {
  id: string;
  name: string;
  available: boolean;
}

/** Fallback local quando Supabase não está configurado */
export const FALLBACK_MEAL_TYPES: Omit<
  MealTypeItem,
  "created_at" | "updated_at"
>[] = [
  {
    id: "pf",
    slug: "pf",
    name: "PF Caseiro",
    description:
      "Arroz, feijão, macarrão, salada e proteína do dia — você escolhe os acompanhamentos.",
    price_cents: 1990,
    emoji: "🍱",
    required_proteins: 1,
    required_sides: 4,
    available: true,
    position: 0,
  },
  {
    id: "executiva",
    slug: "executiva",
    name: "Marmita Executiva",
    description: "Porção reforçada com proteína e acompanhamentos à sua escolha.",
    price_cents: 2490,
    emoji: "🔥",
    required_proteins: 1,
    required_sides: 4,
    available: true,
    position: 1,
  },
  {
    id: "fit",
    slug: "fit",
    name: "Marmita Fit",
    description: "Linha mais leve — monte com as opções do cardápio.",
    price_cents: 2290,
    emoji: "🥗",
    required_proteins: 1,
    required_sides: 4,
    available: true,
    position: 2,
  },
];

export const PROTEINS: MenuOption[] = [
  { id: "frango-grelhado", name: "Frango grelhado", available: true },
  { id: "frango-empanado", name: "Frango empanado", available: true },
  { id: "carne-moida", name: "Carne moída", available: true },
  { id: "bife-acebolado", name: "Bife acebolado", available: true },
  { id: "peixe-frito", name: "Peixe frito", available: true },
  { id: "peixe-ensopado", name: "Peixe ensopado", available: true },
  { id: "charque", name: "Charque", available: true },
  { id: "ovo", name: "Ovo frito", available: true },
];

export const SIDES: MenuOption[] = [
  { id: "arroz", name: "Arroz", available: true },
  { id: "feijao", name: "Feijão", available: true },
  { id: "feijao-tropeiro", name: "Feijão tropeiro", available: true },
  { id: "macarrao", name: "Macarrão", available: true },
  { id: "pure-batata", name: "Purê de batata", available: true },
  { id: "salada", name: "Salada verde", available: true },
  { id: "vinagrete", name: "Vinagrete", available: true },
  { id: "farofa", name: "Farofa", available: true },
  { id: "legumes", name: "Legumes refogados", available: true },
  { id: "arroz-integral", name: "Arroz integral", available: true },
  { id: "mandioca", name: "Mandioca cozida", available: true },
  { id: "banana-frita", name: "Banana da terra frita", available: true },
];

export interface FallbackAdditionalOption extends MenuOption {
  unit_price_cents: number;
}

export const ADDITIONALS: FallbackAdditionalOption[] = [];

export const DELIVERY_FEE_CENTS = STORE.deliveryFeeCents;

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function getFallbackMealType(id: string) {
  const now = new Date().toISOString();
  const found = FALLBACK_MEAL_TYPES.find((m) => m.id === id || m.slug === id);
  if (!found) return undefined;
  return { ...found, created_at: now, updated_at: now } as MealTypeItem;
}

export function getProtein(id: string): MenuOption | undefined {
  return PROTEINS.find((p) => p.id === id);
}

export function getSide(id: string): MenuOption | undefined {
  return SIDES.find((s) => s.id === id);
}

export function calculateTotalFromMeal(
  priceCents: number,
  deliveryType: "pickup" | "delivery",
): number {
  const delivery =
    deliveryType === "delivery" ? DELIVERY_FEE_CENTS : 0;
  return priceCents + delivery;
}

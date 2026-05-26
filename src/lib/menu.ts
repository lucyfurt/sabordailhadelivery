import { STORE } from "@/lib/store";

export interface MealType {
  id: string;
  name: string;
  description: string;
  priceCents: number;
  emoji: string;
}

export interface MenuOption {
  id: string;
  name: string;
  available: boolean;
}

export const MEAL_TYPES: MealType[] = [
  {
    id: "pf",
    name: "PF Caseiro",
    description:
      "Arroz, feijão, macarrão, salada e proteína do dia — você escolhe os 4 acompanhamentos.",
    priceCents: 1990,
    emoji: "🍱",
  },
  {
    id: "executiva",
    name: "Marmita Executiva",
    description: "Porção reforçada: proteína em dobro na prática + 4 acompanhamentos.",
    priceCents: 2490,
    emoji: "🔥",
  },
  {
    id: "fit",
    name: "Marmita Fit",
    description:
      "Linha mais leve: frango grelhado, legumes e arroz integral entre as opções.",
    priceCents: 2290,
    emoji: "🥗",
  },
];

/** Proteínas do dia — marque `available: false` quando acabar */
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

export const REQUIRED_SIDES = 4;

export const DELIVERY_FEE_CENTS = STORE.deliveryFeeCents;

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function getMealType(id: string): MealType | undefined {
  return MEAL_TYPES.find((m) => m.id === id);
}

export function getProtein(id: string): MenuOption | undefined {
  return PROTEINS.find((p) => p.id === id);
}

export function getSide(id: string): MenuOption | undefined {
  return SIDES.find((s) => s.id === id);
}

export function calculateTotal(
  mealTypeId: string,
  deliveryType: "pickup" | "delivery",
): number {
  const meal = getMealType(mealTypeId);
  if (!meal) return 0;
  const delivery =
    deliveryType === "delivery" ? DELIVERY_FEE_CENTS : 0;
  return meal.priceCents + delivery;
}

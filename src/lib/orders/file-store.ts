import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
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

const DATA_DIR = path.join(process.cwd(), "data");
const ORDERS_FILE = path.join(DATA_DIR, "orders.json");
const COUNTERS_FILE = path.join(DATA_DIR, "counters.json");

interface CountersFile {
  [date: string]: number;
}

async function ensureDataDir() {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function readOrders(): Promise<Order[]> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(ORDERS_FILE, "utf-8");
    return JSON.parse(raw) as Order[];
  } catch {
    return [];
  }
}

async function writeOrders(orders: Order[]) {
  await ensureDataDir();
  await fs.writeFile(ORDERS_FILE, JSON.stringify(orders, null, 2));
}

async function nextSequence(): Promise<number> {
  await ensureDataDir();
  const key = todayKey();
  let counters: CountersFile = {};
  try {
    const raw = await fs.readFile(COUNTERS_FILE, "utf-8");
    counters = JSON.parse(raw) as CountersFile;
  } catch {
    /* empty */
  }
  const next = (counters[key] ?? 0) + 1;
  counters[key] = next;
  await fs.writeFile(COUNTERS_FILE, JSON.stringify(counters, null, 2));
  return next;
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
    if (!side?.available) return `Acompanhamento indisponível: ${id}`;
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

export async function fileCreateOrder(
  input: CreateOrderInput,
): Promise<{ order?: Order; error?: string }> {
  const validation = validateCreateInput(input);
  if (validation) return { error: validation };

  const meal = getMealType(input.meal_type_id)!;
  const protein = getProtein(input.protein_id)!;
  const sides = input.side_ids.map((id) => {
    const s = getSide(id)!;
    return { id: s.id, name: s.name };
  });

  const now = new Date();
  const sequence = await nextSequence();
  const order: Order = {
    id: randomUUID(),
    order_number: formatOrderNumber(now, sequence),
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
    status: "awaiting_payment",
    created_at: now.toISOString(),
    paid_at: null,
    updated_at: now.toISOString(),
  };

  const orders = await readOrders();
  orders.unshift(order);
  await writeOrders(orders);
  return { order };
}

export async function fileListOrders(date?: string): Promise<Order[]> {
  const orders = await readOrders();
  if (!date) return orders;
  return orders.filter((o) => o.created_at.startsWith(date));
}

export async function fileGetOrderByNumber(
  orderNumber: string,
): Promise<Order | null> {
  const orders = await readOrders();
  return orders.find((o) => o.order_number === orderNumber) ?? null;
}

export async function fileUpdateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order | null> {
  const orders = await readOrders();
  const index = orders.findIndex((o) => o.id === id);
  if (index === -1) return null;

  const now = new Date().toISOString();
  const updated: Order = {
    ...orders[index],
    status,
    updated_at: now,
    paid_at:
      status === "paid" && !orders[index].paid_at ? now : orders[index].paid_at,
  };
  orders[index] = updated;
  await writeOrders(orders);
  return updated;
}

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import { resolveOrderAdditionals } from "@/lib/orders/additionals";
import { buildLineItem, calculateOrderTotal } from "@/lib/orders/build-line-item";
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

export async function fileCreateOrder(
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

  const first = items[0];
  const firstProtein = first.proteins[0];
  const additionalsResult = await resolveOrderAdditionals(input.additionals);
  if (additionalsResult.error) return { error: additionalsResult.error };
  const additionals = additionalsResult.items;
  const additionalsTotal = additionals.reduce((sum, a) => sum + a.total_cents, 0);
  const now = new Date();
  const sequence = await nextSequence();
  const order: Order = {
    id: randomUUID(),
    order_number: formatOrderNumber(now, sequence),
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

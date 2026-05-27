import type { Order } from "@/types/order";
import { getOrderItems } from "@/types/order";

export interface SideCount {
  name: string;
  count: number;
}

export interface ProteinCount {
  name: string;
  count: number;
}

export interface DailyCashReport {
  date: string;
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  revenueCents: number;
  awaitingPaymentCents: number;
  averageTicketCents: number;
}

export function countSides(orders: Order[]): SideCount[] {
  const map = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "expired") continue;
    for (const item of getOrderItems(order)) {
      for (const side of item.sides) {
        map.set(side.name, (map.get(side.name) ?? 0) + 1);
      }
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function countProteins(orders: Order[]): ProteinCount[] {
  const map = new Map<string, number>();
  for (const order of orders) {
    if (order.status === "cancelled" || order.status === "expired") continue;
    for (const item of getOrderItems(order)) {
      for (const protein of item.proteins) {
        map.set(protein.name, (map.get(protein.name) ?? 0) + 1);
      }
    }
  }
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);
}

export function dailyCashReport(orders: Order[], date: string): DailyCashReport {
  const dayOrders = orders.filter((o) => o.created_at.startsWith(date));
  const paid = dayOrders.filter(
    (o) =>
      o.status === "paid" ||
      o.status === "preparing" ||
      o.status === "ready" ||
      o.status === "delivered",
  );
  const cancelled = dayOrders.filter(
    (o) => o.status === "cancelled" || o.status === "expired",
  );
  const awaiting = dayOrders.filter((o) => o.status === "awaiting_payment");

  const revenueCents = paid.reduce((sum, o) => sum + o.total_cents, 0);
  const awaitingPaymentCents = awaiting.reduce(
    (sum, o) => sum + o.total_cents,
    0,
  );

  return {
    date,
    totalOrders: dayOrders.length,
    paidOrders: paid.length,
    cancelledOrders: cancelled.length,
    revenueCents,
    awaitingPaymentCents,
    averageTicketCents:
      paid.length > 0 ? Math.round(revenueCents / paid.length) : 0,
  };
}

export function ordersByHour(orders: Order[]): { hour: string; count: number }[] {
  const map = new Map<string, number>();
  for (const order of orders) {
    const hour = new Date(order.created_at).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).slice(0, 2) + "h";
    map.set(hour, (map.get(hour) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([hour, count]) => ({ hour, count }))
    .sort((a, b) => a.hour.localeCompare(b.hour));
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { formatPrice } from "@/lib/menu";
import {
  countProteins,
  countSides,
  dailyCashReport,
  ordersByHour,
} from "@/lib/reports";
import { formatPhoneDisplay } from "@/lib/phone";
import { adminOrderWhatsAppUrl } from "@/lib/whatsapp";
import type { Order, OrderStatus } from "@/types/order";
import { ORDER_STATUS_LABELS } from "@/types/order";
import { AdminMealTypesManager } from "@/components/AdminMealTypesManager";
import { AdminMenuManager } from "@/components/AdminMenuManager";
import { getOrderItems, lineProteinLabel } from "@/types/order";

const STATUS_OPTIONS: OrderStatus[] = [
  "awaiting_payment",
  "paid",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
  "expired",
];

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function AdminDashboard() {
  const [date, setDate] = useState(todayIso());
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<
    "pedidos" | "relatorios" | "cardapio" | "marmitas"
  >("pedidos");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/orders?date=${date}`);
    if (res.ok) {
      const data = await res.json();
      setOrders(data.orders);
    }
    setLoading(false);
  }, [date]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  async function updateStatus(id: string, status: OrderStatus) {
    const res = await fetch(`/api/orders/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) load();
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  const cash = dailyCashReport(orders, date);
  const sides = countSides(orders);
  const proteins = countProteins(orders);
  const hourly = ordersByHour(orders);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={load}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white"
          >
            Atualizar
          </button>
          <button
            type="button"
            onClick={logout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        {(["pedidos", "marmitas", "cardapio", "relatorios"] as const).map(
          (t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded-full px-4 py-2 text-sm font-medium ${
              tab === t
                ? "bg-orange-500 text-white"
                : "bg-white text-gray-700"
            }`}
          >
            {t === "pedidos"
              ? "Pedidos"
              : t === "relatorios"
                ? "Relatórios"
                : t === "marmitas"
                  ? "Tipos marmita"
                  : "Itens"}
          </button>
        ),
        )}
      </div>

      {tab === "marmitas" && <AdminMealTypesManager />}
      {tab === "cardapio" && <AdminMenuManager />}

      {tab === "relatorios" && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">Caixa do dia</h2>
            <ul className="mt-3 space-y-1 text-sm">
              <li>Pedidos: {cash.totalOrders}</li>
              <li>Pagos: {cash.paidOrders}</li>
              <li>Cancelados/expirados: {cash.cancelledOrders}</li>
              <li className="font-bold text-green-700">
                Faturamento: {formatPrice(cash.revenueCents)}
              </li>
              <li className="text-amber-700">
                Aguardando PIX: {formatPrice(cash.awaitingPaymentCents)}
              </li>
              <li>Ticket médio: {formatPrice(cash.averageTicketCents)}</li>
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">Fluxo por hora</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {hourly.length === 0 && <li>Sem pedidos</li>}
              {hourly.map((h) => (
                <li key={h.hour}>
                  {h.hour}: {h.count} pedido(s)
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">Acompanhamentos</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {sides.map((s) => (
                <li key={s.name}>
                  {s.name}: <strong>{s.count}</strong>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">Proteínas</h2>
            <ul className="mt-3 space-y-1 text-sm">
              {proteins.map((p) => (
                <li key={p.name}>
                  {p.name}: <strong>{p.count}</strong>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {tab === "pedidos" && (
        <div className="space-y-3">
          {loading && <p className="text-sm text-gray-500">Carregando…</p>}
          {!loading && orders.length === 0 && (
            <p className="text-sm text-gray-500">Nenhum pedido nesta data.</p>
          )}
          {orders.map((order) => (
            <article
              key={order.id}
              className="rounded-2xl border border-orange-100 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-bold text-orange-600">
                    #{order.order_number}
                  </p>
                  <p className="text-sm">
                    {order.customer_name} ·{" "}
                    {formatPhoneDisplay(order.customer_phone)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {new Date(order.created_at).toLocaleString("pt-BR")}
                  </p>
                </div>
                <p className="font-bold">{formatPrice(order.total_cents)}</p>
              </div>
              <ul className="mt-2 space-y-2 text-sm">
                {getOrderItems(order).map((item, i) => (
                  <li key={i}>
                    <span className="font-medium">{item.meal_type_name}</span>
                    {getOrderItems(order).length > 1 && (
                      <span className="text-gray-500">
                        {" "}
                        · {formatPrice(item.unit_price_cents)}
                      </span>
                    )}
                    <p className="text-gray-600">
                      {lineProteinLabel(item)}
                      {item.sides.length > 0 &&
                        ` · ${item.sides.map((s) => s.name).join(", ")}`}
                    </p>
                  </li>
                ))}
              </ul>
              {order.additionals.length > 0 && (
                <div className="mt-2 rounded-lg bg-orange-50 p-2 text-sm">
                  <p className="font-medium text-orange-900">Adicionais</p>
                  <ul className="mt-1 space-y-1 text-orange-900">
                    {order.additionals.map((a) => (
                      <li key={a.id} className="flex justify-between">
                        <span>
                          {a.name} x{a.quantity}
                        </span>
                        <span>{formatPrice(a.total_cents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {order.address && (
                <p className="text-sm text-gray-600">📍 {order.address}</p>
              )}
              {order.notes && (
                <p className="text-sm italic text-gray-500">Obs: {order.notes}</p>
              )}
              <div className="mt-3 flex flex-wrap gap-2">
                <select
                  value={order.status}
                  onChange={(e) =>
                    updateStatus(order.id, e.target.value as OrderStatus)
                  }
                  className="rounded-lg border border-gray-300 px-2 py-1 text-sm"
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s} value={s}>
                      {ORDER_STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const url = adminOrderWhatsAppUrl(order);
                    window.open(url, "_blank", "noopener,noreferrer");
                  }}
                  className="rounded-lg bg-green-600 px-3 py-1 text-sm font-medium text-white"
                >
                  WhatsApp
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

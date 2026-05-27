"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/menu";
import { orderWhatsAppUrl } from "@/lib/whatsapp";
import type { Order } from "@/types/order";
import {
  getOrderItems,
  lineProteinLabel,
  ORDER_STATUS_LABELS,
} from "@/types/order";

export function OrderSuccess({
  order,
  isNew,
}: {
  order: Order;
  isNew?: boolean;
}) {
  const waUrl = orderWhatsAppUrl(order);
  const items = getOrderItems(order);

  return (
    <div className="mx-auto max-w-lg space-y-6 rounded-2xl bg-white p-8 shadow-lg">
      {isNew ? (
        <div className="text-center">
          <p className="text-4xl">✅</p>
          <h1 className="mt-2 text-2xl font-bold">Pedido registrado!</h1>
        </div>
      ) : (
        <h1 className="text-center text-2xl font-bold">Seu pedido</h1>
      )}

      <div className="rounded-xl bg-orange-50 p-6 text-center">
        <p className="text-sm text-gray-600">Número do pedido</p>
        <p className="text-3xl font-bold tracking-wide text-orange-600">
          #{order.order_number}
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <p>
          <strong>Status:</strong> {ORDER_STATUS_LABELS[order.status]}
        </p>
        {items.length === 1 ? (
          <>
            <p>
              <strong>Marmita:</strong> {items[0].meal_type_name}
            </p>
            <p>
              <strong>Proteína(s):</strong> {lineProteinLabel(items[0])}
            </p>
            <p>
              <strong>Acompanhamentos:</strong>{" "}
              {items[0].sides.map((s) => s.name).join(", ") || "—"}
            </p>
          </>
        ) : (
          <div>
            <p className="font-medium">
              Marmitas ({items.length})
            </p>
            <ul className="mt-1 space-y-2 pl-0">
              {items.map((item, i) => (
                <li key={i} className="rounded-lg bg-gray-50 p-2">
                  <p>
                    <strong>{item.meal_type_name}</strong> —{" "}
                    {formatPrice(item.unit_price_cents)}
                  </p>
                  <p className="text-gray-600">
                    Proteína(s): {lineProteinLabel(item)}
                  </p>
                  <p className="text-gray-600">
                    Acompanhamentos:{" "}
                    {item.sides.map((s) => s.name).join(", ") || "—"}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}
        <p>
          <strong>Total:</strong> {formatPrice(order.total_cents)}
        </p>
        {order.additionals.length > 0 && (
          <div className="rounded-lg bg-orange-50 p-3">
            <p>
              <strong>Adicionais:</strong>
            </p>
            <ul className="mt-1 space-y-1">
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
      </div>

      {isNew && (
        <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
          <p className="font-medium text-green-900">
            Próximo passo: pagar via PIX no WhatsApp
          </p>
          <p className="text-green-800">
            Toque no botão abaixo para enviar seu pedido. Você receberá a chave
            PIX e confirma o pagamento por lá.
          </p>
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-xl bg-green-600 py-3 text-center font-bold text-white hover:bg-green-700"
          >
            Enviar pedido no WhatsApp
          </a>
        </div>
      )}

      <p className="text-center text-xs text-gray-500">
        Guarde o número <strong>#{order.order_number}</strong> para consultar o
        status.
      </p>

      <Link
        href="/cardapio"
        className="block text-center text-sm text-orange-600 hover:underline"
      >
        Fazer outro pedido
      </Link>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import { formatPrice } from "@/lib/menu";
import { STORE } from "@/lib/store";
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
  const [copied, setCopied] = useState(false);
  const waUrl = orderWhatsAppUrl(order);
  const items = getOrderItems(order);

  async function copyPixCode() {
    if (!STORE.pixCopyCode) return;
    try {
      await navigator.clipboard.writeText(STORE.pixCopyCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

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
        {order.delivery_type === "pickup" && (
          <p>
            <strong>Retirada em:</strong> {STORE.pickupAddress}
          </p>
        )}
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

      {STORE.pixCopyCode && (
        <div className="space-y-2 rounded-xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-medium text-green-900">
            Após realizar o pagamento via PIX, envie o comprovante pelo WhatsApp para confirmação do pedido.
            Obs: Pagamentos via cartão ou dinheiro deverão ser comunicados pelo WhatsApp e realizados presencialmente.
          </p>
          <textarea
            readOnly
            value={STORE.pixCopyCode}
            className="h-24 w-full rounded-lg border border-green-200 bg-white p-2 text-xs text-gray-800"
          />
          <button
            type="button"
            onClick={copyPixCode}
            className="w-full rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white hover:bg-green-700"
          >
            {copied ? "Código PIX copiado!" : "Copiar código PIX"}
          </button>
        </div>
      )}

      {isNew && (
        <div className="space-y-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm">
          <p className="text-green-800">
            Toque no botão abaixo para confirmar seu pedido.
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
        Guarde o número <strong>#{order.order_number}</strong> para receber o seu
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

import { formatPrice } from "@/lib/menu";
import type { Order } from "@/types/order";
import { orderProteinLabel } from "@/types/order";

const WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5598992019061";

export function buildWhatsAppMessage(order: Order): string {
  const sides = order.sides.map((s) => s.name).join(", ");
  const delivery =
    order.delivery_type === "delivery"
      ? `Entrega: ${order.address ?? "—"}`
      : "Retirada no local";

  return [
    `Olá! Quero confirmar meu pedido *#${order.order_number}*`,
    ``,
    `*${order.meal_type_name}*`,
    `Proteína(s): ${orderProteinLabel(order)}`,
    `Acompanhamentos: ${sides}`,
    order.notes ? `Obs: ${order.notes}` : null,
    delivery,
    `Total: *${formatPrice(order.total_cents)}*`,
    ``,
    `Vou pagar via PIX. Pode me enviar a chave?`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function whatsAppUrl(message: string): string {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
}

export function orderWhatsAppUrl(order: Order): string {
  return whatsAppUrl(buildWhatsAppMessage(order));
}

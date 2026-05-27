import { formatPrice } from "@/lib/menu";
import type { Order } from "@/types/order";
import { orderProteinLabel } from "@/types/order";

const STORE_WHATSAPP_NUMBER =
  process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "5598992019061";

function encodeMessage(message: string, phone: string) {
  const encoded = encodeURIComponent(message);
  return `https://wa.me/${phone}?text=${encoded}`;
}

export function buildCustomerWhatsAppMessage(order: Order): string {
  const sides = order.sides.map((s) => s.name).join(", ");
  const delivery =
    order.delivery_type === "delivery"
      ? `Entrega: ${order.address ?? "—"}`
      : "Retirada no local";

  return [
    `Olá! Pedido *#${order.order_number}* registrado no Sabor da Ilha.`,
    ``,
    `*${order.meal_type_name}*`,
    `Proteína(s): ${orderProteinLabel(order)}`,
    `Acompanhamentos: ${sides}`,
    order.notes ? `Obs: ${order.notes}` : null,
    delivery,
    `Total: *${formatPrice(order.total_cents)}*`,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildAdminStatusMessage(order: Order): string {
  const base = `Pedido *#${order.order_number}* - ${order.meal_type_name}`;
  const total = `Valor: *${formatPrice(order.total_cents)}*`;

  switch (order.status) {
    case "awaiting_payment":
      return [
        `Olá! ${base}`,
        ``,
        total,
        ``,
        `Seu pedido foi registrado e está aguardando pagamento via PIX.`,
        `Assim que confirmar o pagamento, já colocamos em preparo para você.`,
      ].join("\n");
    case "paid":
      return [
        `Olá! ${base}`,
        ``,
        total,
        ``,
        `Pagamento confirmado com sucesso ✅`,
        `Seu pedido já vai entrar em preparo.`,
      ].join("\n");
    case "preparing":
      return [
        `Olá! ${base}`,
        ``,
        total,
        ``,
        `Seu pedido já está em preparo na cozinha 👩‍🍳`,
        `Avisaremos assim que estiver pronto para retirada/entrega.`,
      ].join("\n");
    case "ready":
      return [
        `Olá! ${base}`,
        ``,
        total,
        ``,
        `Seu pedido já está *pronto* ✅`,
        order.delivery_type === "delivery"
          ? `Em instantes sai para entrega.`
          : `Pode vir buscar quando quiser 😉`,
      ].join("\n");
    case "delivered":
      return [
        `Olá! ${base}`,
        ``,
        total,
        ``,
        `Seu pedido foi marcado como *entregue*.`,
        `Qualquer coisa é só chamar aqui 🙂`,
      ].join("\n");
    case "cancelled":
      return [
        `Olá! ${base}`,
        ``,
        total,
        ``,
        `Seu pedido foi *cancelado* conforme combinado.`,
        `Se precisar refazer, é só mandar mensagem aqui.`,
      ].join("\n");
    case "expired":
      return [
        `Olá! ${base}`,
        ``,
        total,
        ``,
        `Seu pedido ficou um tempo sem confirmação de pagamento e foi *expirado*.`,
        `Se ainda tiver interesse, me avise que verifico a disponibilidade para refazer.`,
      ].join("\n");
    default:
      return [
        `Olá! ${base}`,
        ``,
        total,
        ``,
        `Atualização do status do seu pedido: ${order.status}.`,
      ].join("\n");
  }
}

// Link que o cliente vê (para falar com o número da loja)
export function orderWhatsAppUrl(order: Order): string {
  const message = buildCustomerWhatsAppMessage(order);
  return encodeMessage(message, STORE_WHATSAPP_NUMBER);
}

// Link que o admin usa para falar direto com o cliente
export function adminOrderWhatsAppUrl(order: Order): string {
  const phone = order.customer_phone.replace(/\D/g, "");
  const message = buildAdminStatusMessage(order);
  return encodeMessage(message, phone);
}

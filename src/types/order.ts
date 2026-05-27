export type OrderStatus =
  | "awaiting_payment"
  | "paid"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled"
  | "expired";

export type DeliveryType = "pickup" | "delivery";

export interface MenuItemRef {
  id: string;
  name: string;
}

export interface OrderAdditionalItem {
  id: string;
  name: string;
  unit_price_cents: number;
  quantity: number;
  total_cents: number;
}

export interface OrderLineItem {
  meal_type_id: string;
  meal_type_name: string;
  proteins: MenuItemRef[];
  sides: MenuItemRef[];
  unit_price_cents: number;
}

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  address: string | null;
  items: OrderLineItem[];
  additionals: OrderAdditionalItem[];
  /** Campos legados (primeira marmita) — mantidos para pedidos antigos */
  meal_type_id: string;
  meal_type_name: string;
  proteins: MenuItemRef[];
  protein_id: string;
  protein_name: string;
  sides: MenuItemRef[];
  notes: string | null;
  total_cents: number;
  status: OrderStatus;
  created_at: string;
  paid_at: string | null;
  updated_at: string;
}

export interface CreateOrderLineInput {
  meal_type_id: string;
  protein_ids: string[];
  side_ids: string[];
}

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  address?: string;
  items: CreateOrderLineInput[];
  additionals?: CreateOrderAdditionalInput[];
  notes?: string;
}

export interface CreateOrderAdditionalInput {
  additional_id: string;
  quantity: number;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  preparing: "Em preparo",
  ready: "Pronto para retirada/entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
  expired: "Expirado",
};

export function getOrderItems(order: Order): OrderLineItem[] {
  if (order.items?.length > 0) return order.items;
  return [
    {
      meal_type_id: order.meal_type_id,
      meal_type_name: order.meal_type_name,
      proteins: order.proteins,
      sides: order.sides,
      unit_price_cents: order.total_cents,
    },
  ];
}

export function lineProteinLabel(item: OrderLineItem): string {
  if (item.proteins.length === 0) return "—";
  return item.proteins.map((p) => p.name).join(", ");
}

export function orderProteinLabel(order: Order): string {
  return getOrderItems(order)
    .map((item) => lineProteinLabel(item))
    .join(" | ");
}

export function orderMealSummary(order: Order): string {
  const items = getOrderItems(order);
  if (items.length === 1) return items[0].meal_type_name;
  return items.map((i) => i.meal_type_name).join(" + ");
}

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

export interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  address: string | null;
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

export interface CreateOrderInput {
  customer_name: string;
  customer_phone: string;
  delivery_type: DeliveryType;
  address?: string;
  meal_type_id: string;
  protein_ids: string[];
  side_ids: string[];
  notes?: string;
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

export function orderProteinLabel(order: Order): string {
  if (order.proteins.length > 0) {
    return order.proteins.map((p) => p.name).join(", ");
  }
  return order.protein_name;
}

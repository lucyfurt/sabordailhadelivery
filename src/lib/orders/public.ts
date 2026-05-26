import type { Order } from "@/types/order";

export type PublicOrder = Omit<Order, "customer_phone">;

export function toPublicOrder(order: Order): PublicOrder {
  // Telefone só no admin — não expor na consulta pública
  const rest = { ...order };
  delete (rest as Partial<Order>).customer_phone;
  return rest as PublicOrder;
}

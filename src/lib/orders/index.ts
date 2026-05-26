import { assertOrderStorageReady, isSupabaseEnabled } from "@/lib/config";
import {
  fileCreateOrder,
  fileGetOrderByNumber,
  fileListOrders,
  fileUpdateOrderStatus,
} from "@/lib/orders/file-store";
import {
  supabaseCreateOrder,
  supabaseGetOrderByNumber,
  supabaseListOrders,
  supabaseUpdateOrderStatus,
} from "@/lib/orders/supabase-store";
import type { CreateOrderInput, Order, OrderStatus } from "@/types/order";

export async function createOrder(
  input: CreateOrderInput,
): Promise<{ order?: Order; error?: string }> {
  const storageError = assertOrderStorageReady();
  if (storageError) return { error: storageError };
  if (isSupabaseEnabled()) return supabaseCreateOrder(input);
  return fileCreateOrder(input);
}

export async function listOrders(date?: string): Promise<Order[]> {
  if (isSupabaseEnabled()) return supabaseListOrders(date);
  return fileListOrders(date);
}

export async function getOrderByNumber(
  orderNumber: string,
): Promise<Order | null> {
  if (isSupabaseEnabled()) return supabaseGetOrderByNumber(orderNumber);
  return fileGetOrderByNumber(orderNumber);
}

export async function updateOrderStatus(
  id: string,
  status: OrderStatus,
): Promise<Order | null> {
  if (isSupabaseEnabled()) return supabaseUpdateOrderStatus(id, status);
  return fileUpdateOrderStatus(id, status);
}

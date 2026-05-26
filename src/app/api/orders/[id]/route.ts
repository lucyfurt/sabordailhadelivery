import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { updateOrderStatus } from "@/lib/orders";
import type { OrderStatus } from "@/types/order";

const VALID_STATUSES: OrderStatus[] = [
  "awaiting_payment",
  "paid",
  "preparing",
  "ready",
  "delivered",
  "cancelled",
  "expired",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as { status?: OrderStatus };

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }

  const result = await updateOrderStatus(id, body.status);
  if (result.notFound) {
    return NextResponse.json({ error: result.error ?? "Pedido não encontrado." }, { status: 404 });
  }
  if (result.error || !result.order) {
    return NextResponse.json(
      { error: result.error ?? "Erro ao atualizar pedido." },
      { status: 500 },
    );
  }

  return NextResponse.json({ order: result.order });
}

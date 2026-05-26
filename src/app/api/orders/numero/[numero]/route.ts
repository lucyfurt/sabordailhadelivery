import { NextResponse } from "next/server";
import { getOrderByNumber } from "@/lib/orders";
import { toPublicOrder } from "@/lib/orders/public";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ numero: string }> },
) {
  const { numero } = await params;
  try {
    const order = await getOrderByNumber(numero);
    if (!order) {
      return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
    }
    return NextResponse.json({ order: toPublicOrder(order) });
  } catch {
    return NextResponse.json(
      { error: "Erro ao buscar pedido." },
      { status: 500 },
    );
  }
}

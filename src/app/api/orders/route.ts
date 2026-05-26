import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { createOrder, listOrders } from "@/lib/orders";
import type { CreateOrderInput } from "@/types/order";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateOrderInput;
    const result = await createOrder(body);
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ order: result.order }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Erro ao criar pedido." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { assertOrderStorageReady } = await import("@/lib/config");
  const storageError = assertOrderStorageReady();
  if (storageError) {
    return NextResponse.json({ error: storageError }, { status: 503 });
  }

  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") ?? undefined;

  try {
    const orders = await listOrders(date ?? undefined);
    return NextResponse.json({ orders });
  } catch {
    return NextResponse.json(
      { error: "Erro ao listar pedidos." },
      { status: 500 },
    );
  }
}

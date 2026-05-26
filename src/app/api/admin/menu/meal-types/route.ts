import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  adminCreateMealType,
  adminListMealTypes,
} from "@/lib/menu-store";

export async function GET() {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  try {
    const items = await adminListMealTypes();
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    name?: string;
    description?: string;
    price_cents?: number;
    emoji?: string;
    required_proteins?: number;
    required_sides?: number;
    position?: number;
  };

  if (!body.name?.trim()) {
    return NextResponse.json({ error: "Informe o nome." }, { status: 400 });
  }
  if (typeof body.price_cents !== "number" || body.price_cents < 0) {
    return NextResponse.json({ error: "Preço inválido." }, { status: 400 });
  }

  const result = await adminCreateMealType({
    name: body.name,
    description: body.description,
    price_cents: body.price_cents,
    emoji: body.emoji,
    required_proteins: body.required_proteins,
    required_sides: body.required_sides,
    position: body.position,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ item: result.item }, { status: 201 });
}

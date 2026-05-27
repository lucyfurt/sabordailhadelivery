import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  adminCreateMenuItem,
  adminListMenuItems,
} from "@/lib/menu-store";

function asTable(value: string): "proteins" | "sides" | "additionals" | null {
  if (value === "proteins" || value === "sides" || value === "additionals") {
    return value;
  }
  return null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ table: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { table: raw } = await params;
  const table = asTable(raw);
  if (!table) return NextResponse.json({ error: "Tabela inválida." }, { status: 400 });

  try {
    const items = await adminListMenuItems(table);
    return NextResponse.json({ items });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao listar." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ table: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { table: raw } = await params;
  const table = asTable(raw);
  if (!table) return NextResponse.json({ error: "Tabela inválida." }, { status: 400 });

  const body = (await request.json()) as {
    name?: string;
    position?: number;
    unit_price_cents?: number;
  };
  if (!body.name?.trim()) return NextResponse.json({ error: "Informe o nome." }, { status: 400 });

  const result = await adminCreateMenuItem(table, {
    name: body.name,
    position: body.position,
    unit_price_cents: body.unit_price_cents,
  });
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ item: result.item }, { status: 201 });
}


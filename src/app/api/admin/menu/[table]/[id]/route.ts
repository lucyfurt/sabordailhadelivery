import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { adminDeleteMenuItem, adminUpdateMenuItem } from "@/lib/menu-store";

function asTable(value: string): "proteins" | "sides" | "additionals" | null {
  if (value === "proteins" || value === "sides" || value === "additionals") {
    return value;
  }
  return null;
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ table: string; id: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { table: raw, id } = await params;
  const table = asTable(raw);
  if (!table) return NextResponse.json({ error: "Tabela inválida." }, { status: 400 });

  const body = (await request.json()) as {
    name?: string;
    available?: boolean;
    fit?: boolean;
    position?: number;
    unit_price_cents?: number;
  };

  const result = await adminUpdateMenuItem(table, id, body);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ item: result.item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ table: string; id: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const { table: raw, id } = await params;
  const table = asTable(raw);
  if (!table) return NextResponse.json({ error: "Tabela inválida." }, { status: 400 });

  const result = await adminDeleteMenuItem(table, id);
  if (result.error) return NextResponse.json({ error: result.error }, { status: 400 });
  return NextResponse.json({ ok: true });
}


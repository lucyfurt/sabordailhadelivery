import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import {
  adminDeleteMealType,
  adminUpdateMealType,
} from "@/lib/menu-store";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const body = (await request.json()) as {
    name?: string;
    description?: string;
    price_cents?: number;
    emoji?: string;
    required_proteins?: number;
    required_sides?: number;
    available?: boolean;
    position?: number;
  };

  const result = await adminUpdateMealType(id, body);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ item: result.item });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  const { id } = await params;
  const result = await adminDeleteMealType(id);
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}

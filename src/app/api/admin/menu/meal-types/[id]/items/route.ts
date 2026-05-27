import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { adminGetMealTypeItems, adminSetMealTypeItems } from "@/lib/menu-store";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  try {
    const data = await adminGetMealTypeItems(id);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro ao carregar itens." },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const authed = await isAdminAuthenticated();
  if (!authed) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const { id } = await params;
  const body = (await request.json()) as {
    protein_ids?: string[];
    side_ids?: string[];
  };

  const result = await adminSetMealTypeItems(id, {
    protein_ids: body.protein_ids ?? [],
    side_ids: body.side_ids ?? [],
  });
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}


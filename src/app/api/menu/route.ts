import { NextResponse } from "next/server";
import { getPublicMenu } from "@/lib/menu-store";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const menu = await getPublicMenu();
    return NextResponse.json(menu, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar cardápio." },
      { status: 500 },
    );
  }
}


import { NextResponse } from "next/server";
import { getPublicMenu } from "@/lib/menu-store";

export async function GET() {
  try {
    const menu = await getPublicMenu();
    return NextResponse.json(menu);
  } catch {
    return NextResponse.json(
      { error: "Erro ao carregar cardápio." },
      { status: 500 },
    );
  }
}


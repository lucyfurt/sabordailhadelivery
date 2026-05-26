import Link from "next/link";
import { STORE_NAME } from "@/lib/config";

export function Header() {
  return (
    <header className="border-b border-orange-200/60 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
        <Link href="/" className="text-lg font-bold text-orange-600">
          {STORE_NAME}
        </Link>
        <nav className="flex gap-3 text-sm font-medium">
          <Link
            href="/cardapio"
            className="rounded-full bg-orange-500 px-4 py-2 text-white hover:bg-orange-600"
          >
            Montar pedido
          </Link>
        </nav>
      </div>
    </header>
  );
}

import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { STORE_NAME } from "@/lib/config";
import { STORE } from "@/lib/store";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-gradient-to-br from-orange-500 to-red-600 px-4 py-16 text-white">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
                CARDÁPIO ONLINE 🍛
              </span>
              <h1 className="mt-4 text-4xl font-bold leading-tight md:text-5xl">
                {STORE_NAME}
              </h1>
              <p className="mt-4 text-lg text-orange-100">
                Monte sua marmita: escolha a proteína e 4 acompanhamentos.
                Pague via PIX no WhatsApp.
              </p>
              <p className="mt-2 text-sm text-orange-200/90">
                {STORE.hours} · {STORE.city}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/cardapio"
                  className="rounded-2xl bg-white px-6 py-3 font-bold text-orange-600 hover:scale-105 transition"
                >
                  Montar meu pedido
                </Link>
                <a
                  href={`https://wa.me/${STORE.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border-2 border-white px-6 py-3 font-bold hover:bg-white/10"
                >
                  WhatsApp
                </a>
                <a
                  href={STORE.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border-2 border-white/60 px-6 py-3 font-bold hover:bg-white/10"
                >
                  Instagram
                </a>
              </div>
            </div>
            <div className="flex justify-center">
              <Image
                src="/assets/logo_sabor.png"
                alt="Logo Sabor da Ilha"
                width={280}
                height={280}
                className="rounded-2xl bg-white/10 p-4"
                priority
              />
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-16">
          <h2 className="text-center text-3xl font-bold">Como funciona</h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-4">
            {[
              ["1", "Escolha a marmita"],
              ["2", "Proteína + 4 acompanhamentos"],
              ["3", "Receba o número do pedido"],
              ["4", "Pague o PIX no WhatsApp"],
            ].map(([n, t]) => (
              <li
                key={n}
                className="rounded-2xl bg-white p-6 text-center shadow-sm"
              >
                <span className="text-2xl font-bold text-orange-500">{n}</span>
                <p className="mt-2 font-medium">{t}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="bg-orange-500 px-4 py-12 text-center text-white">
          <h2 className="text-2xl font-bold">Pronto para pedir?</h2>
          <Link
            href="/cardapio"
            className="mt-6 inline-block rounded-2xl bg-white px-8 py-3 font-bold text-orange-600"
          >
            Abrir cardápio
          </Link>
        </section>
      </main>
      <footer className="py-8 text-center text-sm text-gray-600">
        <p className="font-semibold">{STORE_NAME}</p>
        <p>{STORE.tagline}</p>
      </footer>
    </>
  );
}

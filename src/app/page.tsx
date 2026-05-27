import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/Header";
import { STORE_NAME } from "@/lib/config";
import { STORE } from "@/lib/store";
import { ST } from "next/dist/shared/lib/utils";

export default function HomePage() {
  return (
    <>
      <Header />
      <main>
        <section className="bg-gradient-to-br from-orange-500 to-red-600 px-4 py-16 text-white">
          <div className="mx-auto grid max-w-5xl items-center gap-10 md:grid-cols-2">
            <div>
              <span className="inline-block rounded-full bg-white/20 px-4 py-2 text-sm font-bold">
                CARDÁPIO ONLINE
              </span>
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
              
              <p className="mt-2 text-sm text-orange-200/90">
                {STORE.hours} · {STORE.city}
              </p>
             
            </div>
           
          </div>
        </section>       

        <section className="bg-orange-500 px-4 py-12 text-center text-white">
          <h2 className="text-2xl font-bold">Pronto para pedir?</h2>
          <Link
            href="/cardapio"
            className="mt-6 inline-block rounded-2xl bg-white px-8 py-3 font-bold text-orange-600"
          >
            Abrir cardápio
          </Link>
          <div className="mt-10 flex flex-col items-center gap-4 md:flex-row md:justify-center">
<h2 className="text-2xl font-bold">Fale Conosco!</h2>
          <a
                  href={`https://wa.me/${STORE.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border-2 border-white px-2 py-1 font-bold hover:bg-white/10"
                >
                  WhatsApp
                </a>
               
                <a
                  href={STORE.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-2xl border-2 border-white/60 px-2 py-1 font-bold hover:bg-white/10"
                >
                  Instagram
                </a>
          </div>
          
        </section>        
      </main>
      <footer className="py-8 text-center text-sm text-gray-600">
        <p className="font-semibold">{STORE_NAME}</p>
        <p>{STORE.tagline}</p>
       <a href="https://ilha3d-studio-com-br.vercel.app/" target="_blank"><p>{STORE.desenvolvedor}</p></a> 
      </footer>
    </>
  );
}

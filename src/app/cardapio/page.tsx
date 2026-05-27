import { Header } from "@/components/Header";
import { OrderBuilder } from "@/components/OrderBuilder";

export default function CardapioPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <h1 className="text-3xl font-bold">Monte seu pedido</h1>
        <p className="mt-2 text-gray-600">
          Escolha sua marmita com proteínas e acompanhamentos personalizados.
        </p>
        <div className="mt-8">
          <OrderBuilder />
        </div>
      </main>
    </>
  );
}

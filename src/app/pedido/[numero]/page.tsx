import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { OrderSuccess } from "@/components/OrderSuccess";
import { getOrderByNumber } from "@/lib/orders";

export default async function PedidoPage({
  params,
  searchParams,
}: {
  params: Promise<{ numero: string }>;
  searchParams: Promise<{ novo?: string }>;
}) {
  const { numero } = await params;
  const { novo } = await searchParams;
  const order = await getOrderByNumber(numero);

  if (!order) notFound();

  return (
    <>
      <Header />
      <main className="px-4 py-10">
        <OrderSuccess order={order} isNew={novo === "1"} />
      </main>
    </>
  );
}

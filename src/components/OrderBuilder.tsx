"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateTotal,
  DELIVERY_FEE_CENTS,
  formatPrice,
  MEAL_TYPES,
  REQUIRED_SIDES,
  sortForMealType,
} from "@/lib/menu";
import type { DeliveryType } from "@/types/order";
import type { MenuItem } from "@/types/menu";

type Step = "meal" | "protein" | "sides" | "customer";

export function OrderBuilder() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("meal");
  const [mealTypeId, setMealTypeId] = useState("");
  const [proteinId, setProteinId] = useState("");
  const [sideIds, setSideIds] = useState<string[]>([]);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [proteins, setProteins] = useState<MenuItem[]>([]);
  const [sides, setSides] = useState<MenuItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();
        if (!res.ok) return;
        if (cancelled) return;
        setProteins(data.proteins ?? []);
        setSides(data.sides ?? []);
      } catch {
        // fallback: se API falhar, fica vazio (admin ainda pode cadastrar)
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(() => {
    if (!mealTypeId) return 0;
    return calculateTotal(mealTypeId, deliveryType);
  }, [mealTypeId, deliveryType]);

  function toggleSide(id: string) {
    setSideIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (prev.length >= REQUIRED_SIDES) return prev;
      return [...prev, id];
    });
  }

  async function submit() {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_type_id: mealTypeId,
          protein_id: proteinId,
          side_ids: sideIds,
          delivery_type: deliveryType,
          customer_name: customerName,
          customer_phone: customerPhone,
          address: deliveryType === "delivery" ? address : undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao enviar pedido.");
        return;
      }
      router.push(`/pedido/${data.order.order_number}?novo=1`);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  const steps: { key: Step; label: string }[] = [
    { key: "meal", label: "Marmita" },
    { key: "protein", label: "Proteína" },
    { key: "sides", label: "Acompanhamentos" },
    { key: "customer", label: "Seus dados" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {steps.map((s, i) => (
          <span
            key={s.key}
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              step === s.key
                ? "bg-orange-500 text-white"
                : "bg-orange-100 text-orange-800"
            }`}
          >
            {i + 1}. {s.label}
          </span>
        ))}
      </div>

      {step === "meal" && (
        <section className="grid gap-4 sm:grid-cols-3">
          {MEAL_TYPES.map((meal) => (
            <button
              key={meal.id}
              type="button"
              onClick={() => setMealTypeId(meal.id)}
              className={`rounded-2xl border-2 p-5 text-left transition ${
                mealTypeId === meal.id
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-orange-300"
              }`}
            >
              <div className="text-3xl">{meal.emoji}</div>
              <h3 className="mt-2 font-bold">{meal.name}</h3>
              <p className="mt-1 text-sm text-gray-600">{meal.description}</p>
              <p className="mt-3 font-bold text-orange-600">
                {formatPrice(meal.priceCents)}
              </p>
            </button>
          ))}
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="button"
              disabled={!mealTypeId}
              onClick={() => setStep("protein")}
              className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === "protein" && (
        <section className="space-y-4">
          <p className="text-sm text-gray-600">Escolha 1 proteína</p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sortForMealType(
              proteins.filter((p) => p.available),
              mealTypeId,
            ).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setProteinId(p.id)}
                className={`rounded-xl border-2 px-4 py-3 text-left font-medium ${
                  proteinId === p.id
                    ? "border-orange-500 bg-orange-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("meal")}
              className="text-orange-600"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={!proteinId}
              onClick={() => setStep("sides")}
              className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === "sides" && (
        <section className="space-y-4">
          <p className="text-sm text-gray-600">
            Escolha exatamente {REQUIRED_SIDES} acompanhamentos (
            {sideIds.length}/{REQUIRED_SIDES})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sortForMealType(
              sides.filter((s) => s.available),
              mealTypeId,
            ).map((s) => {
              const selected = sideIds.includes(s.id);
              const disabled =
                !selected && sideIds.length >= REQUIRED_SIDES;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => toggleSide(s.id)}
                  className={`rounded-xl border-2 px-4 py-3 text-left font-medium disabled:opacity-40 ${
                    selected
                      ? "border-orange-500 bg-orange-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  {s.name}
                </button>
              );
            })}
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("protein")}
              className="text-orange-600"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={sideIds.length !== REQUIRED_SIDES}
              onClick={() => setStep("customer")}
              className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === "customer" && (
        <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex gap-4">
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border-2 border-gray-200 p-4 has-checked:border-orange-500 has-checked:bg-orange-50">
              <input
                type="radio"
                name="delivery"
                checked={deliveryType === "pickup"}
                onChange={() => setDeliveryType("pickup")}
              />
              Retirada
            </label>
            <label className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border-2 border-gray-200 p-4 has-checked:border-orange-500 has-checked:bg-orange-50">
              <input
                type="radio"
                name="delivery"
                checked={deliveryType === "delivery"}
                onChange={() => setDeliveryType("delivery")}
              />
              Entrega (+{formatPrice(DELIVERY_FEE_CENTS)})
            </label>
          </div>

          {deliveryType === "delivery" && (
            <input
              className="w-full rounded-xl border border-gray-300 px-4 py-3"
              placeholder="Endereço completo"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          )}

          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            placeholder="Seu nome"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
          <input
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            placeholder="WhatsApp com DDD — ex: (98) 99999-9999"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
          />
          <textarea
            className="w-full rounded-xl border border-gray-300 px-4 py-3"
            placeholder="Observações (opcional)"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="rounded-xl bg-orange-50 p-4 text-center">
            <p className="text-sm text-gray-600">Total do pedido</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatPrice(total)}
            </p>
          </div>

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setStep("sides")}
              className="text-orange-600"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={submit}
              className="rounded-xl bg-green-600 px-6 py-3 font-bold text-white hover:bg-green-700 disabled:opacity-50"
            >
              {loading ? "Enviando…" : "Confirmar pedido"}
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

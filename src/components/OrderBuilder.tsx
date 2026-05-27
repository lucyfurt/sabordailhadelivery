"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateTotalFromMeal,
  DELIVERY_FEE_CENTS,
  formatPrice,
} from "@/lib/menu";
import type { DeliveryType } from "@/types/order";
import type { MealTypeItem, MenuItem } from "@/types/menu";

type Step = "meal" | "protein" | "sides" | "customer";

export function OrderBuilder() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("meal");
  const [mealTypeId, setMealTypeId] = useState("");
  const [proteinIds, setProteinIds] = useState<string[]>([]);
  const [sideIds, setSideIds] = useState<string[]>([]);
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("pickup");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [mealTypes, setMealTypes] = useState<MealTypeItem[]>([]);
  const [proteins, setProteins] = useState<MenuItem[]>([]);
  const [sides, setSides] = useState<MenuItem[]>([]);
  const [mealTypeProteins, setMealTypeProteins] = useState<Record<string, string[]>>({});
  const [mealTypeSides, setMealTypeSides] = useState<Record<string, string[]>>({});

  const selectedMeal = useMemo(
    () => mealTypes.find((m) => m.id === mealTypeId),
    [mealTypes, mealTypeId],
  );

  const requiredProteins = selectedMeal?.required_proteins ?? 1;
  const requiredSides = selectedMeal?.required_sides ?? 4;
  const allowedProteinIds = selectedMeal
    ? (mealTypeProteins[selectedMeal.id] ?? [])
    : [];
  const allowedSideIds = selectedMeal ? (mealTypeSides[selectedMeal.id] ?? []) : [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/menu");
        const data = await res.json();
        if (!res.ok) return;
        if (cancelled) return;
        setMealTypes(data.mealTypes ?? []);
        setProteins(data.proteins ?? []);
        setSides(data.sides ?? []);
        setMealTypeProteins(data.mealTypeProteins ?? {});
        setMealTypeSides(data.mealTypeSides ?? {});
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = useMemo(() => {
    if (!selectedMeal) return 0;
    return calculateTotalFromMeal(selectedMeal.price_cents, deliveryType);
  }, [selectedMeal, deliveryType]);

  function selectMeal(id: string) {
    setMealTypeId(id);
    setProteinIds([]);
    setSideIds([]);
  }

  function toggleProtein(id: string) {
    setProteinIds((prev) => {
      if (prev.includes(id)) return prev.filter((p) => p !== id);
      if (requiredProteins <= 0) return prev;
      if (prev.length >= requiredProteins) return prev;
      return [...prev, id];
    });
  }

  function toggleSide(id: string) {
    setSideIds((prev) => {
      if (prev.includes(id)) return prev.filter((s) => s !== id);
      if (requiredSides <= 0) return prev;
      if (prev.length >= requiredSides) return prev;
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
          protein_ids: proteinIds,
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

  const steps: { key: Step; label: string; skip?: boolean }[] = [
    { key: "meal", label: "Marmita" },
    {
      key: "protein",
      label: requiredProteins > 1 ? "Proteínas" : "Proteína",
      skip: requiredProteins === 0,
    },
    {
      key: "sides",
      label: "Acompanhamentos",
      skip: requiredSides === 0,
    },
    { key: "customer", label: "Seus dados" },
  ];

  const visibleSteps = steps.filter((s) => !s.skip);

  function goNext(from: Step) {
    const idx = visibleSteps.findIndex((s) => s.key === from);
    const next = visibleSteps[idx + 1];
    if (next) setStep(next.key);
  }

  function goBack(from: Step) {
    const idx = visibleSteps.findIndex((s) => s.key === from);
    const prev = visibleSteps[idx - 1];
    if (prev) setStep(prev.key);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {visibleSteps.map((s, i) => (
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
          {mealTypes.length === 0 && (
            <p className="text-sm text-gray-600 sm:col-span-3">
              Nenhum tipo de marmita disponível no momento.
            </p>
          )}
          {mealTypes.map((meal) => (
            <button
              key={meal.id}
              type="button"
              onClick={() => selectMeal(meal.id)}
              className={`rounded-2xl border-2 p-5 text-left transition ${
                mealTypeId === meal.id
                  ? "border-orange-500 bg-orange-50"
                  : "border-gray-200 bg-white hover:border-orange-300"
              }`}
            >
              <div className="text-3xl">{meal.emoji}</div>
              <h3 className="mt-2 font-bold">{meal.name}</h3>
              <p className="mt-1 text-sm text-gray-600">{meal.description}</p>
              <p className="mt-2 text-xs text-gray-500">
                {meal.required_proteins > 0
                  ? `${meal.required_proteins} proteína(s)`
                  : "Sem proteína"}{" "}
                ·{" "}
                {meal.required_sides > 0
                  ? `${meal.required_sides} acompanhamento(s)`
                  : "Sem acompanhamento"}
              </p>
              <p className="mt-3 font-bold text-orange-600">
                {formatPrice(meal.price_cents)}
              </p>
            </button>
          ))}
          <div className="sm:col-span-3 flex justify-end">
            <button
              type="button"
              disabled={!mealTypeId}
              onClick={() => goNext("meal")}
              className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === "protein" && requiredProteins > 0 && (
        <section className="space-y-4">
          <p className="text-sm text-gray-600">
            Escolha exatamente {requiredProteins} proteína
            {requiredProteins > 1 ? "s" : ""} ({proteinIds.length}/
            {requiredProteins})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {proteins
              .filter((p) => p.available && allowedProteinIds.includes(p.id))
              .sort(
                (a, b) =>
                  a.position - b.position ||
                  a.name.localeCompare(b.name, "pt-BR"),
              )
              .map((p) => {
                const selected = proteinIds.includes(p.id);
                const disabled =
                  !selected && proteinIds.length >= requiredProteins;
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleProtein(p.id)}
                    className={`rounded-xl border-2 px-4 py-3 text-left font-medium disabled:opacity-40 ${
                      selected
                        ? "border-orange-500 bg-orange-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    {p.name}
                  </button>
                );
              })}
          </div>
          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => goBack("protein")}
              className="text-orange-600"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={proteinIds.length !== requiredProteins}
              onClick={() => goNext("protein")}
              className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
            >
              Continuar
            </button>
          </div>
        </section>
      )}

      {step === "sides" && requiredSides > 0 && (
        <section className="space-y-4">
          <p className="text-sm text-gray-600">
            Escolha de 1 até {requiredSides} acompanhamento
            {requiredSides > 1 ? "s" : ""} ({sideIds.length}/{requiredSides})
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {sides
              .filter((s) => s.available && allowedSideIds.includes(s.id))
              .sort(
                (a, b) =>
                  a.position - b.position ||
                  a.name.localeCompare(b.name, "pt-BR"),
              )
              .map((s) => {
                const selected = sideIds.includes(s.id);
                const disabled =
                  !selected && sideIds.length >= requiredSides;
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
              onClick={() => goBack("sides")}
              className="text-orange-600"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={sideIds.length < 1}
              onClick={() => goNext("sides")}
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
              onClick={() => goBack("customer")}
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

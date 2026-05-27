"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  calculateTotalFromMeal,
  DELIVERY_FEE_CENTS,
  formatPrice,
} from "@/lib/menu";
import type { CreateOrderLineInput } from "@/types/order";
import type { DeliveryType } from "@/types/order";
import type { MealTypeItem, MenuItem } from "@/types/menu";

type Step = "meal" | "protein" | "sides" | "customer";

interface CartLine {
  key: string;
  mealTypeId: string;
  mealTypeName: string;
  proteinIds: string[];
  proteinNames: string[];
  sideIds: string[];
  sideNames: string[];
  unitPriceCents: number;
}

function newKey() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function OrderBuilder() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("meal");
  const [mealTypeId, setMealTypeId] = useState("");
  const [proteinIds, setProteinIds] = useState<string[]>([]);
  const [sideIds, setSideIds] = useState<string[]>([]);
  const [cart, setCart] = useState<CartLine[]>([]);
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
  const [mealTypeProteins, setMealTypeProteins] = useState<
    Record<string, string[]>
  >({});
  const [mealTypeSides, setMealTypeSides] = useState<Record<string, string[]>>(
    {},
  );

  const selectedMeal = useMemo(
    () => mealTypes.find((m) => m.id === mealTypeId),
    [mealTypes, mealTypeId],
  );

  const requiredProteins = selectedMeal?.required_proteins ?? 1;
  const requiredSides = selectedMeal?.required_sides ?? 4;
  const allowedProteinIds = selectedMeal
    ? (mealTypeProteins[selectedMeal.id] ?? [])
    : [];
  const allowedSideIds = selectedMeal
    ? (mealTypeSides[selectedMeal.id] ?? [])
    : [];

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/menu", { cache: "no-store" });
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

  const cartSubtotal = cart.reduce((sum, line) => sum + line.unitPriceCents, 0);
  const total = useMemo(() => {
    if (cart.length === 0) return 0;
    return calculateTotalFromMeal(cartSubtotal, deliveryType);
  }, [cart.length, cartSubtotal, deliveryType]);

  function resetMealSelection() {
    setMealTypeId("");
    setProteinIds([]);
    setSideIds([]);
    setStep("meal");
  }

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

  function currentLineValid(): string | null {
    if (!selectedMeal) return "Escolha o tipo de marmita.";
    if (
      requiredProteins > 0 &&
      proteinIds.length !== requiredProteins
    ) {
      return `Selecione ${requiredProteins} proteína(s).`;
    }
    if (requiredSides > 0 && sideIds.length < 1) {
      return "Selecione pelo menos 1 acompanhamento.";
    }
    if (requiredSides > 0 && sideIds.length > requiredSides) {
      return `No máximo ${requiredSides} acompanhamento(s).`;
    }
    return null;
  }

  function buildCurrentCartLine(): CartLine | null {
    if (!selectedMeal) return null;
    const err = currentLineValid();
    if (err) return null;
    const proteinNames = proteinIds.map(
      (id) => proteins.find((p) => p.id === id)?.name ?? id,
    );
    const sideNames = sideIds.map(
      (id) => sides.find((s) => s.id === id)?.name ?? id,
    );
    return {
      key: newKey(),
      mealTypeId: selectedMeal.id,
      mealTypeName: selectedMeal.name,
      proteinIds: [...proteinIds],
      proteinNames,
      sideIds: [...sideIds],
      sideNames,
      unitPriceCents: selectedMeal.price_cents,
    };
  }

  function addCurrentToCart(): boolean {
    const line = buildCurrentCartLine();
    if (!line) {
      setError(currentLineValid() ?? "Complete a marmita atual.");
      return false;
    }
    setError("");
    setCart((prev) => [...prev, line]);
    resetMealSelection();
    return true;
  }

  function removeFromCart(key: string) {
    setCart((prev) => prev.filter((l) => l.key !== key));
  }

  function goToCustomer() {
    let nextCart = cart;
    if (mealTypeId && currentLineValid() === null) {
      const line = buildCurrentCartLine();
      if (line) {
        nextCart = [...cart, line];
        setCart(nextCart);
        resetMealSelection();
      }
    }
    if (nextCart.length === 0) {
      setError("Adicione pelo menos uma marmita ao pedido.");
      return;
    }
    setError("");
    setStep("customer");
  }

  async function submit() {
    setError("");
    let lines: CartLine[] = [...cart];
    if (mealTypeId && currentLineValid() === null) {
      const line = buildCurrentCartLine();
      if (line) lines = [...lines, line];
    }
    if (lines.length === 0) {
      setError("Adicione pelo menos uma marmita ao pedido.");
      return;
    }

    const items: CreateOrderLineInput[] = lines.map((line) => ({
      meal_type_id: line.mealTypeId,
      protein_ids: line.proteinIds,
      side_ids: line.sideIds,
    }));

    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items,
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
      {cart.length > 0 && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-bold text-orange-800">
            Seu pedido ({cart.length} marmita{cart.length > 1 ? "s" : ""})
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {cart.map((line) => (
              <li
                key={line.key}
                className="flex items-start justify-between gap-2 rounded-lg bg-white p-2"
              >
                <div>
                  <p className="font-medium">{line.mealTypeName}</p>
                  {line.proteinNames.length > 0 && (
                    <p className="text-gray-600">
                      {line.proteinNames.join(", ")}
                    </p>
                  )}
                  {line.sideNames.length > 0 && (
                    <p className="text-gray-600">
                      {line.sideNames.join(", ")}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-semibold text-orange-700">
                    {formatPrice(line.unitPriceCents)}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeFromCart(line.key)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-right text-sm font-bold text-orange-800">
            Subtotal marmitas: {formatPrice(cartSubtotal)}
          </p>
        </div>
      )}

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
              <p className="mt-3 font-bold text-orange-600">
                {formatPrice(meal.price_cents)}
              </p>
            </button>
          ))}
          <div className="sm:col-span-3 flex flex-wrap justify-end gap-2">
            {requiredProteins === 0 && requiredSides === 0 && (
              <>
                <button
                  type="button"
                  disabled={!mealTypeId}
                  onClick={() => {
                    if (addCurrentToCart()) {
                      /* próxima marmita */
                    }
                  }}
                  className="rounded-xl border-2 border-orange-500 px-4 py-3 font-bold text-orange-600 disabled:opacity-40"
                >
                  + Adicionar outra marmita
                </button>
                <button
                  type="button"
                  disabled={!mealTypeId && cart.length === 0}
                  onClick={goToCustomer}
                  className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
                >
                  {cart.length > 0 ? "Continuar pedido" : "Continuar"}
                </button>
              </>
            )}
            {(requiredProteins > 0 || requiredSides > 0) && (
              <button
                type="button"
                disabled={!mealTypeId}
                onClick={() => goNext("meal")}
                className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
              >
                Continuar
              </button>
            )}
          </div>
        </section>
      )}

      {step === "protein" && requiredProteins > 0 && (
        <section className="space-y-4">
          <p className="text-sm text-gray-600">
            {selectedMeal?.name} — escolha {requiredProteins} proteína
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
          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={() => goBack("protein")}
              className="text-orange-600"
            >
              Voltar
            </button>
            <div className="flex flex-wrap gap-2">
              {requiredSides === 0 && (
                <>
                  <button
                    type="button"
                    disabled={proteinIds.length !== requiredProteins}
                    onClick={() => {
                      if (addCurrentToCart()) {
                        /* próxima marmita */
                      }
                    }}
                    className="rounded-xl border-2 border-orange-500 px-4 py-3 font-bold text-orange-600 disabled:opacity-40"
                  >
                    + Adicionar outra marmita
                  </button>
                  <button
                    type="button"
                    disabled={
                      proteinIds.length !== requiredProteins && cart.length === 0
                    }
                    onClick={goToCustomer}
                    className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
                  >
                    {cart.length > 0 ? "Continuar pedido" : "Continuar"}
                  </button>
                </>
              )}
              {requiredSides > 0 && (
                <button
                  type="button"
                  disabled={proteinIds.length !== requiredProteins}
                  onClick={() => goNext("protein")}
                  className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
                >
                  Continuar
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {step === "sides" && requiredSides > 0 && (
        <section className="space-y-4">
          <p className="text-sm text-gray-600">
            {selectedMeal?.name} — de 1 até {requiredSides} acompanhamento
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
          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              onClick={() => goBack("sides")}
              className="text-orange-600"
            >
              Voltar
            </button>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={sideIds.length < 1}
                onClick={() => {
                  if (addCurrentToCart()) {
                    /* fica na montagem da próxima */
                  }
                }}
                className="rounded-xl border-2 border-orange-500 px-4 py-3 font-bold text-orange-600 disabled:opacity-40"
              >
                + Adicionar outra marmita
              </button>
              <button
                type="button"
                disabled={sideIds.length < 1 && cart.length === 0}
                onClick={goToCustomer}
                className="rounded-xl bg-orange-500 px-6 py-3 font-bold text-white disabled:opacity-40"
              >
                {cart.length > 0 ? "Continuar pedido" : "Continuar"}
              </button>
            </div>
          </div>
        </section>
      )}

      {step === "customer" && (
        <section className="space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          {cart.length > 0 && (
            <div className="rounded-xl bg-gray-50 p-4 text-sm">
              <p className="font-bold">Resumo do pedido</p>
              <ul className="mt-2 space-y-2">
                {cart.map((line) => (
                  <li key={line.key} className="flex justify-between">
                    <span>{line.mealTypeName}</span>
                    <span>{formatPrice(line.unitPriceCents)}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 flex justify-between border-t pt-2">
                <span>Subtotal marmitas</span>
                <span>{formatPrice(cartSubtotal)}</span>
              </p>
              {deliveryType === "delivery" && (
                <p className="flex justify-between text-gray-600">
                  <span>Taxa entrega</span>
                  <span>{formatPrice(DELIVERY_FEE_CENTS)}</span>
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={resetMealSelection}
            className="w-full rounded-xl border-2 border-dashed border-orange-300 py-2 text-sm font-medium text-orange-700"
          >
            + Adicionar mais uma marmita
          </button>

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
              onClick={() => {
                if (cart.length > 0) setStep("meal");
                else goBack("customer");
              }}
              className="text-orange-600"
            >
              Voltar
            </button>
            <button
              type="button"
              disabled={loading || cart.length === 0}
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

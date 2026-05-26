"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/menu";
import type { MealTypeItem } from "@/types/menu";

function centsFromReais(value: string): number {
  const n = Number(value.replace(",", "."));
  if (Number.isNaN(n)) return 0;
  return Math.round(n * 100);
}

function reaisFromCents(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

export function AdminMealTypesManager() {
  const [items, setItems] = useState<MealTypeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPrice, setNewPrice] = useState("19,90");
  const [newEmoji, setNewEmoji] = useState("🍱");
  const [newProteins, setNewProteins] = useState(1);
  const [newSides, setNewSides] = useState(4);

  const sorted = useMemo(
    () =>
      [...items].sort(
        (a, b) =>
          a.position - b.position || a.name.localeCompare(b.name, "pt-BR"),
      ),
    [items],
  );

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch("/api/admin/menu/meal-types");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao carregar.");
      setItems([]);
    } else {
      setItems(data.items ?? []);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError("");
    const res = await fetch("/api/admin/menu/meal-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        description: newDescription,
        price_cents: centsFromReais(newPrice),
        emoji: newEmoji,
        required_proteins: newProteins,
        required_sides: newSides,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao criar.");
      return;
    }
    setNewName("");
    setNewDescription("");
    setNewPrice("19,90");
    setNewEmoji("🍱");
    setNewProteins(1);
    setNewSides(4);
    await load();
  }

  async function patch(id: string, body: Partial<MealTypeItem>) {
    const res = await fetch(`/api/admin/menu/meal-types/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao salvar.");
      return;
    }
    setItems((prev) => prev.map((it) => (it.id === id ? data.item : it)));
  }

  async function remove(id: string) {
    if (!confirm("Excluir este tipo de marmita?")) return;
    const res = await fetch(`/api/admin/menu/meal-types/${id}`, {
      method: "DELETE",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao excluir.");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-lg font-bold">Tipos de marmita</h2>
        <p className="text-sm text-gray-600">
          Defina preço, nome e quantas proteínas e acompanhamentos o cliente
          escolhe em cada tipo.
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 md:grid-cols-2">
        <input
          className="rounded-lg border border-gray-300 px-3 py-2 md:col-span-2"
          placeholder="Nome — ex: PF Caseiro"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <textarea
          className="rounded-lg border border-gray-300 px-3 py-2 md:col-span-2"
          placeholder="Descrição (opcional)"
          rows={2}
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
        />
        <input
          className="rounded-lg border border-gray-300 px-3 py-2"
          placeholder="Preço (R$) — ex: 19,90"
          value={newPrice}
          onChange={(e) => setNewPrice(e.target.value)}
        />
        <input
          className="rounded-lg border border-gray-300 px-3 py-2"
          placeholder="Emoji — ex: 🍱"
          value={newEmoji}
          onChange={(e) => setNewEmoji(e.target.value)}
        />
        <label className="text-sm">
          Proteínas a escolher
          <input
            type="number"
            min={0}
            max={10}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={newProteins}
            onChange={(e) => setNewProteins(Number(e.target.value))}
          />
        </label>
        <label className="text-sm">
          Acompanhamentos a escolher
          <input
            type="number"
            min={0}
            max={20}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2"
            value={newSides}
            onChange={(e) => setNewSides(Number(e.target.value))}
          />
        </label>
        <button
          type="button"
          onClick={create}
          disabled={!newName.trim()}
          className="md:col-span-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        >
          Adicionar tipo de marmita
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Carregando…</p>
      ) : (
        <div className="space-y-3">
          {sorted.length === 0 && (
            <p className="text-sm text-gray-500">
              Nenhum tipo cadastrado. Rode o SQL do Supabase ou adicione acima.
            </p>
          )}
          {sorted.map((it) => (
            <article
              key={it.id}
              className={`rounded-xl border p-4 ${
                it.available
                  ? "border-gray-200 bg-white"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="grid gap-3 md:grid-cols-2">
                <div className="flex gap-2">
                  <input
                    className="w-14 rounded-lg border border-gray-200 px-2 py-2 text-center text-xl"
                    value={it.emoji}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p) =>
                          p.id === it.id ? { ...p, emoji: e.target.value } : p,
                        ),
                      )
                    }
                    onBlur={() => patch(it.id, { emoji: it.emoji })}
                  />
                  <input
                    className="flex-1 rounded-lg border border-gray-200 px-3 py-2 font-medium"
                    value={it.name}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p) =>
                          p.id === it.id ? { ...p, name: e.target.value } : p,
                        ),
                      )
                    }
                    onBlur={() => patch(it.id, { name: it.name })}
                  />
                </div>
                <input
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={it.description}
                  onChange={(e) =>
                    setItems((prev) =>
                      prev.map((p) =>
                        p.id === it.id
                          ? { ...p, description: e.target.value }
                          : p,
                      ),
                    )
                  }
                  onBlur={() => patch(it.id, { description: it.description })}
                />
                <label className="text-sm">
                  Preço (R$)
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                    defaultValue={reaisFromCents(it.price_cents)}
                    key={`price-${it.id}-${it.price_cents}`}
                    onBlur={(e) =>
                      patch(it.id, {
                        price_cents: centsFromReais(e.target.value),
                      })
                    }
                  />
                  <span className="text-xs text-gray-500">
                    Atual: {formatPrice(it.price_cents)}
                  </span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-sm">
                    Proteínas
                    <input
                      type="number"
                      min={0}
                      max={10}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                      value={it.required_proteins}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p) =>
                            p.id === it.id
                              ? {
                                  ...p,
                                  required_proteins: Number(e.target.value),
                                }
                              : p,
                          ),
                        )
                      }
                      onBlur={() =>
                        patch(it.id, {
                          required_proteins: it.required_proteins,
                        })
                      }
                    />
                  </label>
                  <label className="text-sm">
                    Acompanhamentos
                    <input
                      type="number"
                      min={0}
                      max={20}
                      className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                      value={it.required_sides}
                      onChange={(e) =>
                        setItems((prev) =>
                          prev.map((p) =>
                            p.id === it.id
                              ? {
                                  ...p,
                                  required_sides: Number(e.target.value),
                                }
                              : p,
                          ),
                        )
                      }
                      onBlur={() =>
                        patch(it.id, { required_sides: it.required_sides })
                      }
                    />
                  </label>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => patch(it.id, { available: !it.available })}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    it.available
                      ? "bg-amber-500 text-white"
                      : "bg-green-600 text-white"
                  }`}
                >
                  {it.available ? "Desativar" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  Excluir
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

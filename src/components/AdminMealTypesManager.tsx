"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/menu";
import type { MealTypeItem, MenuItem } from "@/types/menu";

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
  const [proteins, setProteins] = useState<MenuItem[]>([]);
  const [sides, setSides] = useState<MenuItem[]>([]);
  const [links, setLinks] = useState<
    Record<string, { protein_ids: string[]; side_ids: string[] }>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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
    setNotice("");
    const res = await fetch("/api/admin/menu/meal-types", {
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao carregar.");
      setItems([]);
    } else {
      setItems(data.items ?? []);
      const [pRes, sRes] = await Promise.all([
        fetch("/api/admin/menu/proteins", { cache: "no-store" }),
        fetch("/api/admin/menu/sides", { cache: "no-store" }),
      ]);
      const pData = await pRes.json();
      const sData = await sRes.json();
      setProteins(pData.items ?? []);
      setSides(sData.items ?? []);

      const ids = (data.items ?? []).map((it: MealTypeItem) => it.id);
      const pairs = await Promise.all(
        ids.map(async (id: string) => {
          const r = await fetch(`/api/admin/menu/meal-types/${id}/items`, {
            cache: "no-store",
          });
          const d = await r.json();
          return [id, { protein_ids: d.protein_ids ?? [], side_ids: d.side_ids ?? [] }] as const;
        }),
      );
      const map: Record<string, { protein_ids: string[]; side_ids: string[] }> = {};
      for (const [id, value] of pairs) map[id] = value;
      setLinks(map);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function create() {
    setError("");
    setNotice("");
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
    setNotice("");
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
    setNotice("");
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

  function toggleMealLink(
    mealTypeId: string,
    kind: "protein_ids" | "side_ids",
    itemId: string,
  ) {
    setLinks((prev) => {
      const current = prev[mealTypeId] ?? { protein_ids: [], side_ids: [] };
      const arr = current[kind];
      const nextArr = arr.includes(itemId)
        ? arr.filter((id) => id !== itemId)
        : [...arr, itemId];
      return {
        ...prev,
        [mealTypeId]: { ...current, [kind]: nextArr },
      };
    });
  }

  async function saveMealLinks(mealTypeId: string) {
    setError("");
    setNotice("");
    const payload = links[mealTypeId] ?? { protein_ids: [], side_ids: [] };
    const res = await fetch(`/api/admin/menu/meal-types/${mealTypeId}/items`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao salvar itens da marmita.");
      return;
    }
    await load();
    setNotice("Itens da marmita salvos com sucesso.");
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
      {notice && (
        <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {notice}
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
                <button
                  type="button"
                  onClick={() => saveMealLinks(it.id)}
                  className="rounded-lg bg-blue-600 px-3 py-2 text-sm text-white"
                >
                  Salvar itens desta marmita
                </button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2 rounded-lg border border-gray-100 p-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    Proteínas visíveis neste tipo
                  </p>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {proteins
                      .filter((p) => p.available)
                      .map((p) => (
                        <label key={`${it.id}-p-${p.id}`} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={(links[it.id]?.protein_ids ?? []).includes(p.id)}
                            onChange={() => toggleMealLink(it.id, "protein_ids", p.id)}
                          />
                          {p.name}
                        </label>
                      ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-2">
                    Acompanhamentos visíveis neste tipo
                  </p>
                  <div className="space-y-1 max-h-40 overflow-auto">
                    {sides
                      .filter((s) => s.available)
                      .map((s) => (
                        <label key={`${it.id}-s-${s.id}`} className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={(links[it.id]?.side_ids ?? []).includes(s.id)}
                            onChange={() => toggleMealLink(it.id, "side_ids", s.id)}
                          />
                          {s.name}
                        </label>
                      ))}
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

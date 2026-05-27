"use client";

import { useEffect, useMemo, useState } from "react";
import { formatPrice } from "@/lib/menu";
import type { AdditionalItem, MenuItem } from "@/types/menu";

type Table = "proteins" | "sides" | "additionals";
type Item = MenuItem | AdditionalItem;

function labelFor(table: Table) {
  if (table === "proteins") return "Proteínas";
  if (table === "sides") return "Acompanhamentos";
  return "Adicionais";
}

export function AdminMenuManager() {
  const [tab, setTab] = useState<Table>("proteins");
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");
  const [newUnitPrice, setNewUnitPrice] = useState("0");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (a.position - b.position) || a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/menu/${tab}`);
    const data = (await res.json()) as { items?: Item[]; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Erro ao carregar.");
      setItems([]);
      setLoading(false);
      return;
    }
    setItems(data.items ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function create() {
    setError("");
    const res = await fetch(`/api/admin/menu/${tab}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        unit_price_cents:
          tab === "additionals"
            ? Math.max(0, Math.round(Number(newUnitPrice || "0") * 100))
            : undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao criar.");
      return;
    }
    setNewName("");
    setNewUnitPrice("0");
    await load();
  }

  async function patch(
    id: string,
    body: Partial<MenuItem> & { unit_price_cents?: number },
  ) {
    const res = await fetch(`/api/admin/menu/${tab}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as { item?: Item; error?: string };
    if (!res.ok) {
      setError(data.error ?? "Erro ao salvar.");
      return;
    }
    if (!data.item) return;
    setItems((prev) => prev.map((it) => (it.id === id ? data.item! : it)));
  }

  async function remove(id: string) {
    const ok = confirm("Excluir este item? Essa ação não pode ser desfeita.");
    if (!ok) return;
    const res = await fetch(`/api/admin/menu/${tab}/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao excluir.");
      return;
    }
    setItems((prev) => prev.filter((it) => it.id !== id));
  }

  return (
    <div className="space-y-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">Cardápio</h2>
          <p className="text-sm text-gray-600">
            Ative/desative quando acabar e mantenha a lista atualizada.
          </p>
        </div>
        <div className="flex gap-2">
          {(["proteins", "sides", "additionals"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-full px-4 py-2 text-sm font-medium ${
                tab === t ? "bg-orange-500 text-white" : "bg-orange-50 text-orange-700"
              }`}
            >
              {labelFor(t)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 rounded-xl border border-orange-100 bg-orange-50 p-4 md:grid-cols-4">
        <input
          className="md:col-span-2 rounded-lg border border-gray-300 px-3 py-2"
          placeholder={`Adicionar ${
            tab === "proteins"
              ? "proteína"
              : tab === "sides"
                ? "acompanhamento"
                : "adicional"
          }`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        {tab === "additionals" && (
          <input
            className="rounded-lg border border-gray-300 px-3 py-2"
            type="number"
            min={0}
            step="0.01"
            value={newUnitPrice}
            onChange={(e) => setNewUnitPrice(e.target.value)}
            placeholder="Preço unitário (R$)"
          />
        )}
        <button
          type="button"
          onClick={create}
          disabled={!newName.trim()}
          className={`rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50 ${
            tab === "additionals" ? "" : "md:col-span-2"
          }`}
        >
          Adicionar
        </button>
      </div>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Carregando…</p>
      ) : (
        <div className="space-y-2">
          {sorted.length === 0 && (
            <p className="text-sm text-gray-500">Nenhum item cadastrado.</p>
          )}
          {sorted.map((it) => (
            <div
              key={it.id}
              className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 ${
                it.available ? "border-gray-200 bg-white" : "border-amber-200 bg-amber-50"
              }`}
            >
              <div className="min-w-[220px] flex-1">
                <input
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                  value={it.name}
                  onChange={(e) => setItems((prev) => prev.map((p) => (p.id === it.id ? { ...p, name: e.target.value } : p)))}
                  onBlur={() => patch(it.id, { name: it.name })}
                />
                <div className="mt-1 flex gap-3 text-xs text-gray-600">
                  <span className="text-gray-400">slug: {it.slug}</span>
                  {"unit_price_cents" in it && (
                    <span>Valor: {formatPrice(it.unit_price_cents)}</span>
                  )}
                </div>
                {"unit_price_cents" in it && (
                  <input
                    className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={(it.unit_price_cents / 100).toFixed(2)}
                    onChange={(e) =>
                      setItems((prev) =>
                        prev.map((p) =>
                          p.id === it.id
                            ? {
                                ...p,
                                unit_price_cents: Math.max(
                                  0,
                                  Math.round(Number(e.target.value || "0") * 100),
                                ),
                              }
                            : p,
                        ),
                      )
                    }
                    onBlur={() =>
                      patch(it.id, {
                        unit_price_cents: (it as AdditionalItem).unit_price_cents,
                      })
                    }
                  />
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => patch(it.id, { available: !it.available })}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    it.available ? "bg-amber-500 text-white" : "bg-green-600 text-white"
                  }`}
                >
                  {it.available ? "Desativar (acabou)" : "Ativar"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(it.id)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


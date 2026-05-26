"use client";

import { useEffect, useMemo, useState } from "react";
import type { MenuItem } from "@/types/menu";

type Table = "proteins" | "sides";

function labelFor(table: Table) {
  return table === "proteins" ? "Proteínas" : "Acompanhamentos";
}

export function AdminMenuManager() {
  const [tab, setTab] = useState<Table>("proteins");
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [newName, setNewName] = useState("");

  const sorted = useMemo(() => {
    return [...items].sort((a, b) => (a.position - b.position) || a.name.localeCompare(b.name, "pt-BR"));
  }, [items]);

  async function load() {
    setLoading(true);
    setError("");
    const res = await fetch(`/api/admin/menu/${tab}`);
    const data = await res.json();
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
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Erro ao criar.");
      return;
    }
    setNewName("");
    await load();
  }

  async function patch(id: string, body: Partial<MenuItem>) {
    const res = await fetch(`/api/admin/menu/${tab}/${id}`, {
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
          {(["proteins", "sides"] as const).map((t) => (
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
          placeholder={`Adicionar ${tab === "proteins" ? "proteína" : "acompanhamento"}`}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
        <button
          type="button"
          onClick={create}
          disabled={!newName.trim()}
          className="md:col-span-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
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
                </div>
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


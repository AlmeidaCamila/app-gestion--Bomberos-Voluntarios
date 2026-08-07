"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { submitInventoryReviewAction } from "@/app/(app)/tasks/[id]/actions";
import type { ReviewItemInput } from "@/app/(app)/tasks/[id]/types";

interface InvRow {
  unit_inventory_id: string;
  item_name: string;
  quantity: number;
}

export function InventoryReviewForm({
  taskId,
  unitId,
  rows,
  states,
}: {
  taskId: string;
  unitId: string;
  rows: InvRow[];
  states: { code: string; name: string; color: string }[];
}) {
  const router = useRouter();
  const [results, setResults] = useState<Record<string, { state_code: string; observations: string }>>(
    Object.fromEntries(rows.map((r) => [r.unit_inventory_id, { state_code: "correcto", observations: "" }]))
  );
  const [generalObs, setGeneralObs] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function update(id: string, patch: Partial<{ state_code: string; observations: string }>) {
    setResults((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));
  }

  function submit() {
    setError(null);
    const items: ReviewItemInput[] = rows.map((r) => ({
      unit_inventory_id: r.unit_inventory_id,
      state_code: results[r.unit_inventory_id].state_code,
      observations: results[r.unit_inventory_id].observations,
    }));
    startTransition(async () => {
      const res = await submitInventoryReviewAction(taskId, unitId, generalObs, items);
      if (res.error) setError(res.error);
      else router.push("/");
    });
  }

  return (
    <div className="space-y-3">
      {rows.map((r) => (
        <div key={r.unit_inventory_id} className="rounded-md border border-line bg-white p-3">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">
              {r.item_name} <span className="font-mono text-xs text-steel">× {r.quantity}</span>
            </span>
          </div>
          <div className="mb-2 flex flex-wrap gap-1.5">
            {states.map((s) => (
              <button
                key={s.code}
                type="button"
                onClick={() => update(r.unit_inventory_id, { state_code: s.code })}
                className="rounded px-2.5 py-1 text-[11px] uppercase"
                style={{
                  background: results[r.unit_inventory_id].state_code === s.code ? s.color : "#e8e5dd",
                  color: results[r.unit_inventory_id].state_code === s.code ? "#fff" : "#5b6470",
                }}
              >
                {s.name}
              </button>
            ))}
          </div>
          <input
            placeholder="Observaciones (ej: manguera con pérdida)"
            value={results[r.unit_inventory_id].observations}
            onChange={(e) => update(r.unit_inventory_id, { observations: e.target.value })}
            className="w-full rounded border border-line px-2 py-1.5 text-xs"
          />
        </div>
      ))}

      <div className="rounded-md border border-line bg-white p-3">
        <label className="mb-1 block font-mono text-[10px] uppercase text-steel">Observaciones generales</label>
        <textarea value={generalObs} onChange={(e) => setGeneralObs(e.target.value)} className="w-full rounded border border-line px-2 py-1.5 text-xs" />
      </div>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-xs text-brand-dark">{error}</div>}

      <button
        disabled={pending}
        onClick={submit}
        className="rounded bg-brand px-4 py-2 font-display text-xs uppercase text-white disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar revisión a validación"}
      </button>
    </div>
  );
}

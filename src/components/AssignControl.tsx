"use client";

import { useState, useTransition } from "react";
import { UserRound, RefreshCw } from "lucide-react";
import { assignTaskAction } from "@/app/(app)/tasks/actions";
import { useToast } from "@/components/Toast";

export function AssignControl({
  taskId,
  currentBomberoId,
  currentBomberoName,
  bomberos,
  compact,
}: {
  taskId: string;
  currentBomberoId: string | null;
  currentBomberoName: string | null;
  bomberos: { id: string; full_name: string; legajo: string }[];
  compact?: boolean;
}) {
  const [changing, setChanging] = useState(false);
  const [value, setValue] = useState(currentBomberoId || "");
  const [pending, startTransition] = useTransition();
  const showToast = useToast();

  function confirm() {
    if (!value) return;
    startTransition(async () => {
      const res = await assignTaskAction(taskId, value);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Asignación actualizada.");
        setChanging(false);
      }
    });
  }

  if (!changing) {
    return (
      <div className={`flex items-center gap-2 ${compact ? "" : "flex-col items-start"}`}>
        <span className="flex items-center gap-1.5 text-xs text-charcoal">
          <UserRound className="h-3.5 w-3.5 text-steel" />
          {currentBomberoName || <span className="text-steel">Sin asignar</span>}
        </span>
        <button
          onClick={() => setChanging(true)}
          className="flex items-center gap-1 font-mono text-[10px] uppercase text-brand hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          {currentBomberoId ? "Cambiar asignación" : "Asignar"}
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoFocus
        className="rounded border border-line px-2 py-1 text-xs"
      >
        <option value="">Seleccionar bombero...</option>
        {bomberos.map((b) => (
          <option key={b.id} value={b.id}>
            {b.full_name} ({b.legajo})
          </option>
        ))}
      </select>
      <div className="flex gap-2">
        <button
          disabled={pending || !value}
          onClick={confirm}
          className="rounded bg-brand px-2 py-1 text-[10px] uppercase text-white disabled:opacity-40"
        >
          {pending ? "Guardando..." : "Confirmar"}
        </button>
        <button onClick={() => setChanging(false)} className="text-[10px] text-steel underline">
          Cancelar
        </button>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeTaskAction } from "@/app/(app)/tasks/actions";

export function CompleteTaskButton({ taskId }: { taskId: string }) {
  const [open, setOpen] = useState(false);
  const [obs, setObs] = useState("");
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="rounded bg-brand px-3 py-1.5 text-[11px] uppercase text-white">
        Finalizar tarea
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <input
        value={obs}
        onChange={(e) => setObs(e.target.value)}
        placeholder="Observaciones (opcional)"
        className="w-full rounded border border-line px-2 py-1.5 text-xs"
      />
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await completeTaskAction(taskId, obs);
            router.refresh();
          })
        }
        className="rounded bg-brand px-3 py-1.5 text-[11px] uppercase text-white disabled:opacity-60"
      >
        {pending ? "Enviando..." : "Enviar a validación"}
      </button>
    </div>
  );
}

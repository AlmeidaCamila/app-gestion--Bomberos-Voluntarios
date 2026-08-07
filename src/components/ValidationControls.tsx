"use client";

import { useState, useTransition } from "react";
import { approveSubmissionAction, rejectSubmissionAction } from "@/app/(app)/validations/actions";

export function ValidationControls({ submissionId }: { submissionId: string }) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (rejecting) {
    return (
      <div className="mt-2 space-y-2">
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Motivo del rechazo (obligatorio)"
          className="w-full rounded border border-line px-2 py-1.5 text-xs"
        />
        {error && <div className="text-[11px] text-brand">{error}</div>}
        <div className="flex gap-2">
          <button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await rejectSubmissionAction(submissionId, reason);
                if (res.error) setError(res.error);
              })
            }
            className="rounded border border-brand px-3 py-1.5 text-[11px] uppercase text-brand hover:bg-brand hover:text-white"
          >
            Confirmar rechazo
          </button>
          <button onClick={() => setRejecting(false)} className="text-[11px] text-steel underline">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 flex gap-2">
      <button
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await approveSubmissionAction(submissionId);
          })
        }
        className="rounded bg-green px-3 py-1.5 text-[11px] uppercase text-white"
      >
        Aprobar
      </button>
      <button onClick={() => setRejecting(true)} className="rounded border border-brand px-3 py-1.5 text-[11px] uppercase text-brand">
        Rechazar
      </button>
    </div>
  );
}

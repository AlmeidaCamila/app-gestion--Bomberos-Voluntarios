"use client";

import { useState, useTransition } from "react";
import { Trash2, KeyRound } from "lucide-react";
import { updateUserActiveAction, deleteUserAction, resetUserPasswordAction } from "./actions";
import { useToast } from "@/components/Toast";

export function UserRowActions({ userId, active, isSelf }: { userId: string; active: boolean; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();
  const [changingPassword, setChangingPassword] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const showToast = useToast();

  function toggle() {
    startTransition(async () => {
      const res = await updateUserActiveAction(userId, active);
      if (res.error) showToast(res.error, "error");
      else showToast(active ? "Usuario desactivado." : "Usuario activado.");
    });
  }

  function remove() {
    if (!confirm("¿Eliminar este usuario del sistema? No se puede deshacer.")) return;
    startTransition(async () => {
      const res = await deleteUserAction(userId);
      if (res.error) showToast(res.error, "error");
      else showToast("Usuario eliminado.");
    });
  }

  function confirmPasswordChange() {
    startTransition(async () => {
      const res = await resetUserPasswordAction(userId, newPassword);
      if (res.error) showToast(res.error, "error");
      else {
        showToast("Contraseña actualizada.");
        setChangingPassword(false);
        setNewPassword("");
      }
    });
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={pending}
        className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase disabled:opacity-50 ${
          active ? "bg-green/15 text-green" : "bg-paper2 text-steel"
        }`}
      >
        {active ? "Activo" : "Inactivo"}
      </button>

      <div className="relative">
        <button
          onClick={() => setChangingPassword((v) => !v)}
          disabled={pending}
          title="Cambiar contraseña"
          className="text-steel hover:text-charcoal disabled:opacity-50"
        >
          <KeyRound className="h-3.5 w-3.5" />
        </button>
        {changingPassword && (
          <div className="absolute right-0 top-6 z-20 w-56 rounded-md border border-line bg-white p-3 shadow-lg">
            <label className="mb-1 block font-mono text-[10px] uppercase text-steel">Nueva contraseña</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
              placeholder="Mínimo 6 caracteres"
              className="mb-2 w-full rounded border border-line px-2 py-1.5 text-xs"
            />
            <div className="flex gap-2">
              <button
                disabled={pending || newPassword.length < 6}
                onClick={confirmPasswordChange}
                className="flex-1 rounded bg-brand py-1.5 text-[11px] uppercase text-white disabled:opacity-40"
              >
                {pending ? "..." : "Guardar"}
              </button>
              <button
                onClick={() => {
                  setChangingPassword(false);
                  setNewPassword("");
                }}
                className="flex-1 rounded border border-line py-1.5 text-[11px] uppercase text-charcoal"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}
      </div>

      {!isSelf && (
        <button onClick={remove} disabled={pending} className="text-steel hover:text-brand disabled:opacity-50">
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}


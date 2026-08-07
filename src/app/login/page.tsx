"use client";

import { useFormState, useFormStatus } from "react-dom";
import { loginAction } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-brand py-2.5 font-display text-sm font-semibold uppercase tracking-wide text-white hover:bg-brand-dark disabled:opacity-60"
    >
      {pending ? "Ingresando..." : "Ingresar"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, { error: null });

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-charcoal p-5">
      <div className="relative w-full max-w-sm rounded-lg bg-paper p-8 shadow-2xl">
        <div className="mb-7 text-center">
          <div className="mb-2 text-3xl">🧑‍🚒</div>
          <h1 className="font-display text-2xl uppercase tracking-wide text-charcoal">
            Tareas de Guardia
          </h1>
          <p className="mt-1 font-mono text-xs text-steel">Gestión de tareas internas</p>
          <p className="mt-3 font-mono text-xs leading-relaxed text-steel">
            Cuartel Nº142
            <br />
            Sierra de los Padres
          </p>
          <p className="mt-3 font-mono text-[10.5px] italic text-steelLight">
            Cada tarea cuenta. Cada bombero importa.
          </p>
        </div>

        {state?.error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-brand-dark">
            {state.error}
          </div>
        )}

        <form action={formAction} className="space-y-4">
          <div>
            <label className="mb-1 block font-mono text-[11px] uppercase text-steel">
              Legajo
            </label>
            <input
              name="legajo"
              type="text"
              required
              className="w-full rounded-md border border-line px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[11px] uppercase text-steel">
              Contraseña
            </label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-md border border-line px-3 py-2.5 text-sm focus:border-brand focus:outline-none"
            />
          </div>
          <SubmitButton />
        </form>
      </div>
    </div>
  );
}

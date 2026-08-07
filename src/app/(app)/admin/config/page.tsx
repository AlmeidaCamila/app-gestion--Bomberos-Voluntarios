import { createServerSupabase } from "@/lib/supabase/server";
import { asFormAction } from "@/lib/actionHelpers";
import {
  updateScoringConfigAction,
  createPriorityAction,
  deletePriorityAction,
  createFrequencyAction,
  deleteFrequencyAction,
  updateGeneralSettingAction,
} from "./actions";

export default async function AdminConfigPage() {
  const supabase = createServerSupabase();
  const [{ data: cfg }, { data: priorities }, { data: frequencies }, { data: settings }, { data: levels }] =
    await Promise.all([
      supabase.from("scoring_config").select("*").eq("active", true).limit(1).single(),
      supabase.from("priorities").select("*").order("sort_order"),
      supabase.from("task_frequencies").select("*").order("sort_order"),
      supabase.from("general_settings").select("*"),
      supabase.from("performance_levels").select("*").order("sort_order"),
    ]);

  return (
    <div className="space-y-6">
      <p className="rounded-md bg-paper2 p-3 text-xs text-steel">
        Todo lo de esta página vive en tablas de configuración de la base de datos — nada está fijo en el
        código. Los formularios de abajo son un patrón genérico; los mismos componentes se pueden reutilizar
        para <b>Estados de tareas</b> y <b>Niveles de desempeño</b> (ya están en la base, ver tablas
        <code> task_statuses</code> y <code> performance_levels</code> más abajo en solo-lectura como referencia).
      </p>

      {/* ---- Puntuación ---- */}
      <section className="rounded-lg border border-line bg-white p-5">
        <h3 className="mb-3 font-display text-sm uppercase">Sistema de puntuación</h3>
        {cfg && (
          <form action={asFormAction(updateScoringConfigAction)} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <input type="hidden" name="id" value={cfg.id} />
            <Field label="Puntos por aprobada" name="points_approved" defaultValue={cfg.points_approved} />
            <Field label="Puntos por rechazada" name="points_rejected" defaultValue={cfg.points_rejected} />
            <Field label="Bonus por adelantada" name="points_early_bonus" defaultValue={cfg.points_early_bonus} />
            <Field label="Penalización por vencida" name="points_overdue_penalty" defaultValue={cfg.points_overdue_penalty} />
            <button className="col-span-2 rounded bg-brand px-4 py-2 font-display text-xs uppercase text-white md:col-span-4">
              Guardar
            </button>
          </form>
        )}
        <p className="mt-2 text-[11px] text-steel">
          Los puntos por aprobada se multiplican además por el <code>score_multiplier</code> de cada prioridad
          (ver abajo) — así una tarea crítica aprobada vale más que una baja.
        </p>
      </section>

      {/* ---- Prioridades ---- */}
      <section className="rounded-lg border border-line bg-white p-5">
        <h3 className="mb-3 font-display text-sm uppercase">Prioridades</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {priorities?.map((p) => (
            <span key={p.id} className="flex items-center gap-1.5 rounded px-2.5 py-1 text-xs text-white" style={{ background: p.color }}>
              {p.name} (x{p.score_multiplier})
              <form action={asFormAction(deletePriorityAction, p.id)}>
                <button className="opacity-80 hover:opacity-100">✕</button>
              </form>
            </span>
          ))}
        </div>
        <form action={asFormAction(createPriorityAction)} className="flex flex-wrap gap-2">
          <input name="code" placeholder="código (ej: urgente)" required className="rounded border border-line px-2 py-1.5 text-xs" />
          <input name="name" placeholder="Nombre" required className="rounded border border-line px-2 py-1.5 text-xs" />
          <input name="score_multiplier" type="number" step="0.05" defaultValue={1} className="w-24 rounded border border-line px-2 py-1.5 text-xs" />
          <button className="rounded border border-line px-3 py-1.5 text-xs">Agregar prioridad</button>
        </form>
      </section>

      {/* ---- Frecuencias ---- */}
      <section className="rounded-lg border border-line bg-white p-5">
        <h3 className="mb-3 font-display text-sm uppercase">Frecuencias de tareas cíclicas</h3>
        <div className="mb-3 flex flex-wrap gap-2">
          {frequencies?.map((f) => (
            <span key={f.id} className="flex items-center gap-1.5 rounded bg-paper2 px-2.5 py-1 text-xs">
              {f.label}
              <form action={asFormAction(deleteFrequencyAction, f.id)}>
                <button className="text-steel hover:text-brand">✕</button>
              </form>
            </span>
          ))}
        </div>
        <form action={asFormAction(createFrequencyAction)} className="flex flex-wrap gap-2">
          <input name="days" type="number" placeholder="Días" required className="w-24 rounded border border-line px-2 py-1.5 text-xs" />
          <input name="label" placeholder="Etiqueta (ej: Cada 45 días)" required className="rounded border border-line px-2 py-1.5 text-xs" />
          <button className="rounded border border-line px-3 py-1.5 text-xs">Agregar frecuencia</button>
        </form>
      </section>

      {/* ---- Parámetros generales ---- */}
      <section className="rounded-lg border border-line bg-white p-5">
        <h3 className="mb-3 font-display text-sm uppercase">Parámetros generales</h3>
        <div className="space-y-2">
          {settings?.map((s) => (
            <form key={s.key} action={asFormAction(updateGeneralSettingAction)} className="flex items-center gap-2">
              <input type="hidden" name="key" value={s.key} />
              <span className="w-72 text-xs text-steel">{s.description || s.key}</span>
              <input name="value" defaultValue={JSON.stringify(s.value)} className="w-32 rounded border border-line px-2 py-1 text-xs" />
              <button className="rounded border border-line px-2 py-1 text-[11px]">Guardar</button>
            </form>
          ))}
        </div>
      </section>

      {/* ---- Niveles de desempeño (solo lectura acá, mismo patrón que arriba) ---- */}
      <section className="rounded-lg border border-line bg-white p-5">
        <h3 className="mb-3 font-display text-sm uppercase">Niveles de desempeño</h3>
        <div className="flex flex-wrap gap-2">
          {levels?.map((l) => (
            <span key={l.id} className="rounded px-2.5 py-1 text-xs text-white" style={{ background: l.color }}>
              {l.name}: {l.min_points}–{l.max_points ?? "∞"}
            </span>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-steel">
          Tabla <code>performance_levels</code>. Reusá el mismo patrón de formulario de &quot;Prioridades&quot; para
          agregar CRUD completo acá cuando definas la escala final.
        </p>
      </section>
    </div>
  );
}

function Field({ label, name, defaultValue }: { label: string; name: string; defaultValue: number }) {
  return (
    <label className="text-xs">
      <div className="mb-1 font-mono text-[10px] uppercase text-steel">{label}</div>
      <input name={name} type="number" defaultValue={defaultValue} className="w-full rounded border border-line px-2 py-1.5 text-xs" />
    </label>
  );
}

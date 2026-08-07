import { createServerSupabase } from "@/lib/supabase/server";
import { ValidationControls } from "@/components/ValidationControls";

export default async function ValidationsPage() {
  const supabase = createServerSupabase();

  // RLS limita esto a tareas de subsecciones que el usuario puede gestionar.
  // El filtro sobre task_statuses.code necesita que esa relación esté
  // embebida (con !inner) en el select — si no, PostgREST no tiene sobre
  // qué aplicarlo y la consulta falla. Sin este !inner, esto quedaba
  // desincronizado con el contador de "Validaciones" del sidebar (que sí
  // lo usa), mostrando la lista vacía aunque el número indicara pendientes.
  const { data: tasks, error: tasksError } = await supabase
    .from("tasks")
    .select("id, name, priorities(name), task_statuses!inner(code)")
    .eq("task_statuses.code", "pendiente_validacion");

  if (tasksError) console.error("[validations/page] error al cargar tareas pendientes:", tasksError.message);

  // Traemos la última entrega (submission) pendiente por cada tarea.
  const taskIds = (tasks || []).map((t: any) => t.id);
  const { data: submissions } = taskIds.length
    ? await supabase
        .from("task_submissions")
        .select("id, task_id, submitted_at, observations, profiles(full_name, legajo)")
        .in("task_id", taskIds)
        .order("submitted_at", { ascending: false })
    : { data: [] as any[] };

  if (!tasks?.length) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel">No hay tareas esperando validación.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {tasks.map((t: any) => {
        const sub = (submissions || []).find((s: any) => s.task_id === t.id);
        return (
          <div key={t.id} className="rounded-lg border border-line bg-white p-4">
            <div className="flex items-start justify-between">
              <h4 className="text-sm font-semibold">{t.name}</h4>
              <span className="rounded bg-paper2 px-2 py-0.5 font-mono text-[10px] uppercase text-steel">
                {t.priorities?.name}
              </span>
            </div>
            {sub && (
              <div className="mt-2 font-mono text-[11px] text-steel">
                <div>Ejecutada por: {sub.profiles?.full_name} (legajo {sub.profiles?.legajo})</div>
                <div>Enviada: {new Date(sub.submitted_at).toLocaleString("es-AR")}</div>
                {sub.observations && <div className="mt-1 text-charcoal">Obs: {sub.observations}</div>}
              </div>
            )}
            {sub && <ValidationControls submissionId={sub.id} />}
          </div>
        );
      })}
    </div>
  );
}

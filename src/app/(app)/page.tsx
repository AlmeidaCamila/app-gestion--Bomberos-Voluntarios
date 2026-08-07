import Link from "next/link";
import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { WeekBanner } from "@/components/WeekBanner";
import { CompleteTaskButton } from "@/components/CompleteTaskButton";
import { AssignControl } from "@/components/AssignControl";

export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = createServerSupabase();

  if (profile.role_code === "admin") {
    const { data: sections } = await supabase.from("sections").select("id, name, icon");
    const { data: subsections } = await supabase.from("subsections").select("id, section_id");
    return (
      <div>
        <WeekBanner />
        {!sections?.length && (
          <p className="text-sm text-steel">
            Todavía no hay secciones creadas.{" "}
            <Link href="/admin/sections" className="text-brand underline">
              Creá la primera
            </Link>
            .
          </p>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sections?.map((s) => {
            const subCount = subsections?.filter((sd) => sd.section_id === s.id).length || 0;
            return (
              <Link
                key={s.id}
                href={`/tasks?section=${s.id}`}
                className="rounded-lg bg-charcoal p-5 text-white transition hover:-translate-y-0.5"
              >
                <div className="font-display text-lg uppercase">{s.name}</div>
                <div className="mt-1 font-mono text-[10.5px] text-steelLight">
                  {subCount} subsección{subCount !== 1 ? "es" : ""}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    );
  }

  // encargados y bomberos: tareas asignadas o de su alcance
  const canManage = profile.role_code === "encargado_seccion" || profile.role_code === "encargado_subseccion";

  const [{ data: tasks }, { data: bomberosRaw, error: bomberosError }] = await Promise.all([
    supabase
      .from("tasks")
      .select(
        "id, name, description, priority_id, status_id, due_date, assigned_bombero_id, subsection_id, unit_id, requires_inventory_review, priorities(name,code), task_statuses(name,code), units(name)"
      )
      .eq("active", true)
      .order("created_at", { ascending: false })
      .limit(50),
    canManage
      ? supabase.from("profiles").select("id, full_name, legajo, subsection_id, roles(code)").eq("active", true)
      : Promise.resolve({ data: [] as any[], error: null }),
  ]);

  if (bomberosError) console.error("[dashboard] error al cargar bomberos:", bomberosError.message);

  const bomberos = (bomberosRaw || [])
    .filter((b: any) => b.roles?.code === "bombero")
    .map((b: any) => ({ id: b.id, full_name: b.full_name, legajo: b.legajo, subsection_id: b.subsection_id }));

  const mine =
    profile.role_code === "bombero"
      ? (tasks || []).filter((t: any) => t.assigned_bombero_id === profile.id)
      : tasks || [];

  const pending = mine.filter((t: any) => t.task_statuses?.code === "pendiente" || t.task_statuses?.code === "en_proceso");
  const review = mine.filter((t: any) => t.task_statuses?.code === "pendiente_validacion");

  return (
    <div>
      <WeekBanner />
      <h3 className="mb-2 font-display text-sm uppercase">Pendientes ({pending.length})</h3>
      <TaskList tasks={pending} isBombero={profile.role_code === "bombero"} canManage={canManage} bomberos={bomberos} />
      <h3 className="mb-2 mt-6 font-display text-sm uppercase">En revisión ({review.length})</h3>
      <TaskList tasks={review} isBombero={profile.role_code === "bombero"} canManage={canManage} bomberos={bomberos} />
    </div>
  );
}

function TaskList({
  tasks,
  isBombero,
  canManage,
  bomberos,
}: {
  tasks: any[];
  isBombero: boolean;
  canManage: boolean;
  bomberos: { id: string; full_name: string; legajo: string; subsection_id: string | null }[];
}) {
  if (!tasks.length)
    return <div className="rounded-lg border border-line bg-white p-6 text-center text-sm text-steel">Sin tareas.</div>;
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
      {tasks.map((t) => (
        <div key={t.id} className="rounded-lg border border-line bg-white p-4">
          <div className="flex items-start justify-between gap-2">
            <h4 className="font-semibold text-sm">{t.name}</h4>
          </div>
          {t.description && <p className="mt-1 text-xs text-steel">{t.description}</p>}
          <div className="mt-2 flex gap-1.5 flex-wrap">
            <span className="rounded bg-paper2 px-2 py-0.5 font-mono text-[10px] uppercase text-steel">
              {t.priorities?.name}
            </span>
            <span className="rounded bg-paper2 px-2 py-0.5 font-mono text-[10px] uppercase text-steel">
              {t.task_statuses?.name}
            </span>
            {t.units?.name && (
              <span className="rounded bg-paper2 px-2 py-0.5 font-mono text-[10px] uppercase text-steel">
                {t.units.name}
              </span>
            )}
          </div>
          {canManage && (
            <div className="mt-2.5 border-t border-line pt-2.5">
              {t.task_statuses?.code === "pendiente_validacion" ? (
                <p className="text-[11px] text-steel">
                  En revisión — no se puede reasignar hasta que se apruebe o rechace.
                </p>
              ) : (
                <AssignControl
                  taskId={t.id}
                  currentBomberoId={t.assigned_bombero_id}
                  currentBomberoName={bomberos.find((b) => b.id === t.assigned_bombero_id)?.full_name || null}
                  bomberos={bomberos.filter((b) => b.subsection_id === t.subsection_id)}
                  compact
                />
              )}
              <Link href="/tasks" className="mt-1.5 block font-mono text-[10px] uppercase text-brand underline">
                Editar tarea
              </Link>
            </div>
          )}
          {isBombero && t.task_statuses?.code !== "pendiente_validacion" && (
            <div className="mt-2">
              {t.unit_id && t.requires_inventory_review ? (
                <Link href={`/tasks/${t.id}/review`} className="inline-block rounded bg-brand px-3 py-1.5 text-[11px] uppercase text-white">
                  Revisar inventario y finalizar
                </Link>
              ) : (
                <CompleteTaskButton taskId={t.id} />
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

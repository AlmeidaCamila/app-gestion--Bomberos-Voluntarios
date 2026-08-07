import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

export default async function ScoresPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = createServerSupabase();

  // RLS limita las filas visibles según el rol (propias, de su sección o subsección, o todas si admin).
  const { data: scores } = await supabase
    .from("scores")
    .select("id, points, tasks_assigned, tasks_completed, tasks_approved, tasks_rejected, bombero_id, section_id, profiles(full_name, legajo), sections(name)");

  const { data: levels } = await supabase
    .from("performance_levels")
    .select("name, min_points, max_points, color")
    .order("sort_order");

  function levelFor(points: number) {
    return (levels || []).find((l) => points >= l.min_points && (l.max_points === null || points <= l.max_points));
  }

  if (!scores?.length) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel">Todavía no hay puntajes calculados.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {scores.map((s: any) => {
        const evaluadas = s.tasks_approved + s.tasks_rejected;
        const cumplimiento = evaluadas > 0 ? Math.round((s.tasks_approved / evaluadas) * 100) : 0;
        const level = levelFor(s.points);
        return (
          <div key={s.id} className="rounded-lg border border-line bg-white p-4">
            <div className="text-sm font-bold">{s.profiles?.full_name}</div>
            <div className="font-mono text-[10.5px] uppercase text-steel">{s.sections?.name}</div>
            {level && (
              <span
                className="mt-1 inline-block rounded-full px-2 py-0.5 font-mono text-[10px] uppercase text-white"
                style={{ background: level.color }}
              >
                {level.name}
              </span>
            )}
            <div className="mt-2 font-mono text-lg font-bold">{s.points} pts</div>
            <div className="mt-2 grid grid-cols-2 gap-1 font-mono text-[11px] text-steel">
              <div>Asignadas: <b className="text-charcoal">{s.tasks_assigned}</b></div>
              <div>Completadas: <b className="text-charcoal">{s.tasks_completed}</b></div>
              <div>Aprobadas: <b className="text-charcoal">{s.tasks_approved}</b></div>
              <div>Rechazadas: <b className="text-charcoal">{s.tasks_rejected}</b></div>
              <div className="col-span-2">Cumplimiento: <b className="text-charcoal">{cumplimiento}%</b></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

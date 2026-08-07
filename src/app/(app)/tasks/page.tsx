import { createServerSupabase } from "@/lib/supabase/server";
import { TasksManager } from "@/components/TasksManager";

export default async function TasksPage() {
  const supabase = createServerSupabase();

  // RLS ya limita secciones/subsecciones/tareas al alcance del usuario.
  const [
    { data: sections },
    { data: subsections },
    { data: priorities },
    { data: frequencies },
    { data: tasksRaw },
    { data: bomberos },
    { data: units },
  ] = await Promise.all([
    supabase.from("sections").select("id, name"),
    supabase.from("subsections").select("id, name, section_id"),
    supabase.from("priorities").select("id, code, name").order("sort_order"),
    supabase.from("task_frequencies").select("days, label").eq("active", true).order("sort_order"),
    supabase
      .from("tasks")
      .select(
        "id, name, description, unit, unit_id, requires_inventory_review, type, frequency_days, due_date, active, subsection_id, assigned_bombero_id, priority_id, priorities(name,code), task_statuses(name,code), subsections(name, sections(name))"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("id, full_name, legajo, subsection_id, roles(code)")
      .eq("active", true),
    supabase.from("units").select("id, name"),
  ]);

  const bomberosList = (bomberos || [])
    .filter((b: any) => b.roles?.code === "bombero")
    .map((b: any) => ({ id: b.id, full_name: b.full_name, legajo: b.legajo, subsection_id: b.subsection_id }));

  return (
    <div>
      <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-charcoal">
        Gestión de Tareas
      </h2>
      <TasksManager
        tasks={(tasksRaw || []) as any}
        sections={sections || []}
        subsections={subsections || []}
        priorities={priorities || []}
        frequencies={frequencies || []}
        bomberos={bomberosList}
        units={units || []}
      />
    </div>
  );
}

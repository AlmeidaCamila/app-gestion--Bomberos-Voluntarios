import { createServerSupabase } from "@/lib/supabase/server";

export default async function HistoryPage() {
  const supabase = createServerSupabase();

  // RLS ya filtra por alcance (propio historial para bombero, de su área/subsección
  // para encargados, todo para admin).
  const { data: submissions } = await supabase
    .from("task_submissions")
    .select(
      "id, submitted_at, observations, tasks(name), profiles(full_name, legajo), validations(decision, rejection_reason, validated_at, points_awarded, profiles:validator_id(full_name))"
    )
    .order("submitted_at", { ascending: false })
    .limit(200);

  if (!submissions?.length) {
    return <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel">Todavía no hay ejecuciones registradas.</div>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-white">
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b-2 border-line font-mono text-[10px] uppercase text-steel">
            <th className="p-2 text-left">Tarea</th>
            <th className="p-2 text-left">Bombero</th>
            <th className="p-2 text-left">Enviada</th>
            <th className="p-2 text-left">Estado</th>
            <th className="p-2 text-left">Validado por</th>
            <th className="p-2 text-left">Validado el</th>
            <th className="p-2 text-left">Puntos</th>
            <th className="p-2 text-left">Observaciones / Motivo</th>
          </tr>
        </thead>
        <tbody>
          {submissions.map((s: any) => {
            const v = Array.isArray(s.validations) ? s.validations[0] : s.validations;
            return (
              <tr key={s.id} className="border-b border-line">
                <td className="p-2 font-semibold">{s.tasks?.name}</td>
                <td className="p-2">
                  {s.profiles?.full_name} <span className="font-mono text-steel">({s.profiles?.legajo})</span>
                </td>
                <td className="p-2 font-mono">{new Date(s.submitted_at).toLocaleString("es-AR")}</td>
                <td className="p-2">{v ? (v.decision === "aprobada" ? "Aprobada" : "Rechazada") : "En revisión"}</td>
                <td className="p-2">{v?.profiles?.full_name || "—"}</td>
                <td className="p-2 font-mono">{v ? new Date(v.validated_at).toLocaleString("es-AR") : "—"}</td>
                <td className="p-2 font-mono">{v?.points_awarded ?? "—"}</td>
                <td className="p-2">{v?.decision === "rechazada" ? v.rejection_reason : s.observations || "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

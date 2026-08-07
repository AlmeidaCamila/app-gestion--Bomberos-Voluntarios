import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";

const STATUS_OPTIONS = [
  { value: "en_revision", label: "En revisión" },
  { value: "aprobada", label: "Aprobada" },
  { value: "rechazada", label: "Rechazada" },
];

export default async function HistoryPage({
  searchParams,
}: {
  searchParams: { bombero?: string; from?: string; to?: string; status?: string };
}) {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = createServerSupabase();

  const { bombero = "", from = "", to = "", status = "" } = searchParams;
  const canFilterByBombero = profile.role_code !== "bombero";

  const [{ data: bomberosRaw }, { data: submissionsRaw, error: submissionsError }] = await Promise.all([
    canFilterByBombero
      ? supabase.from("profiles").select("id, full_name, legajo, roles(code)").eq("active", true)
      : Promise.resolve({ data: [] as any[] }),
    (() => {
      // RLS ya filtra por alcance (propio historial para bombero, de su área/subsección
      // para encargados, todo para admin).
      let query = supabase
        .from("task_submissions")
        .select(
          "id, submitted_at, observations, tasks(name), profiles(full_name, legajo), validations(decision, rejection_reason, validated_at, points_awarded, profiles:validator_id(full_name))"
        )
        .order("submitted_at", { ascending: false })
        .limit(500);
      if (bombero) query = query.eq("bombero_id", bombero);
      if (from) query = query.gte("submitted_at", `${from}T00:00:00`);
      if (to) query = query.lte("submitted_at", `${to}T23:59:59`);
      return query;
    })(),
  ]);

  if (submissionsError) console.error("[history/page] error al cargar el historial:", submissionsError.message);

  const bomberos = (bomberosRaw || [])
    .filter((b: any) => b.roles?.code === "bombero")
    .map((b: any) => ({ id: b.id, full_name: b.full_name, legajo: b.legajo }));

  const submissions = (submissionsRaw || [])
    .map((s: any) => ({ ...s, v: Array.isArray(s.validations) ? s.validations[0] : s.validations }))
    .filter((s: any) => {
      if (!status) return true;
      if (status === "en_revision") return !s.v;
      return s.v?.decision === status;
    });

  const hasFilters = !!(bombero || from || to || status);

  return (
    <div>
      <form className="mb-3 flex flex-wrap items-end gap-2.5 rounded-lg border border-line bg-white p-3">
        {canFilterByBombero && (
          <label className="flex flex-col gap-1">
            <span className="font-mono text-[10px] uppercase text-steel">Bombero</span>
            <select name="bombero" defaultValue={bombero} className="rounded border border-line px-2 py-1.5 text-xs">
              <option value="">Todos</option>
              {bomberos.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.full_name} ({b.legajo})
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase text-steel">Desde</span>
          <input type="date" name="from" defaultValue={from} className="rounded border border-line px-2 py-1.5 text-xs" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase text-steel">Hasta</span>
          <input type="date" name="to" defaultValue={to} className="rounded border border-line px-2 py-1.5 text-xs" />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] uppercase text-steel">Estado</span>
          <select name="status" defaultValue={status} className="rounded border border-line px-2 py-1.5 text-xs">
            <option value="">Todos</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded bg-brand px-3.5 py-1.5 font-display text-xs font-bold uppercase text-white">
          Filtrar
        </button>
        {hasFilters && (
          <a href="/history" className="font-mono text-[11px] uppercase text-steel underline">
            Limpiar filtros
          </a>
        )}
      </form>

      {!submissions.length ? (
        <div className="rounded-lg border border-line bg-white p-8 text-center text-sm text-steel">
          {hasFilters ? "No hay ejecuciones que coincidan con el filtro." : "Todavía no hay ejecuciones registradas."}
        </div>
      ) : (
        <>
          {/* Tabla — desktop */}
          <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
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
                  const v = s.v;
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

          {/* Tarjetas — mobile: sin tabla ancha, todo apilado y visible sin scrollear al costado */}
          <div className="space-y-2.5 md:hidden">
            {submissions.map((s: any) => {
              const v = s.v;
              const estado = v ? (v.decision === "aprobada" ? "Aprobada" : "Rechazada") : "En revisión";
              return (
                <div key={s.id} className="rounded-lg border border-line bg-white p-3.5">
                  <div className="mb-1.5 flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-charcoal">{s.tasks?.name}</h4>
                    <span className="whitespace-nowrap rounded bg-paper2 px-2 py-0.5 font-mono text-[10px] uppercase text-steel">
                      {estado}
                    </span>
                  </div>
                  <div className="space-y-1 font-mono text-[11px] text-steel">
                    <div>
                      Bombero: <span className="text-charcoal">{s.profiles?.full_name} ({s.profiles?.legajo})</span>
                    </div>
                    <div>Enviada: <span className="text-charcoal">{new Date(s.submitted_at).toLocaleString("es-AR")}</span></div>
                    <div>
                      Validado por: <span className="text-charcoal">{v?.profiles?.full_name || "—"}</span>
                    </div>
                    <div>
                      Validado el: <span className="text-charcoal">{v ? new Date(v.validated_at).toLocaleString("es-AR") : "—"}</span>
                    </div>
                    <div>Puntos: <span className="text-charcoal">{v?.points_awarded ?? "—"}</span></div>
                    <div>
                      {v?.decision === "rechazada" ? "Motivo" : "Observaciones"}:{" "}
                      <span className="text-charcoal">{v?.decision === "rechazada" ? v.rejection_reason : s.observations || "—"}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

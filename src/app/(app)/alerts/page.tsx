import { createServerSupabase } from "@/lib/supabase/server";
import { asFormAction } from "@/lib/actionHelpers";
import { resolveAlertAction } from "./actions";

export default async function AlertsPage() {
  const supabase = createServerSupabase();

  // RLS limita esto a las secciones que el usuario puede gestionar.
  const { data: alerts } = await supabase
    .from("inventory_alerts")
    .select(
      "id, status, created_at, resolution_note, units(name), inventory_review_items(observations, item_states(name,color), unit_inventory(inventory_items(name)))"
    )
    .order("created_at", { ascending: false });

  const open = (alerts || []).filter((a: any) => a.status === "abierta");
  const resolved = (alerts || []).filter((a: any) => a.status === "resuelta");

  return (
    <div>
      <h3 className="mb-3 font-display text-sm uppercase">Novedades abiertas ({open.length})</h3>
      {!open.length ? (
        <div className="mb-6 rounded-lg border border-line bg-white p-6 text-center text-sm text-steel">
          No hay novedades pendientes.
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
          {open.map((a: any) => {
            const ri = a.inventory_review_items;
            const state = ri?.item_states;
            const itemName = ri?.unit_inventory?.inventory_items?.name;
            return (
              <div key={a.id} className="rounded-lg border border-brand/40 bg-white p-4">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">
                    {itemName} — {a.units?.name}
                  </div>
                  <span
                    className="rounded px-2 py-0.5 font-mono text-[10px] uppercase text-white"
                    style={{ background: state?.color }}
                  >
                    {state?.name}
                  </span>
                </div>
                {ri?.observations && <p className="mt-1 text-xs text-steel">{ri.observations}</p>}
                <div className="mt-1 font-mono text-[10px] text-steelLight">
                  {new Date(a.created_at).toLocaleString("es-AR")}
                </div>
                <form action={asFormAction(resolveAlertAction, a.id)} className="mt-2 flex gap-2">
                  <input name="note" placeholder="Nota de resolución (opcional)" className="flex-1 rounded border border-line px-2 py-1.5 text-xs" />
                  <button className="rounded bg-green px-3 py-1.5 text-[11px] uppercase text-white">Resolver</button>
                </form>
              </div>
            );
          })}
        </div>
      )}

      <h3 className="mb-3 font-display text-sm uppercase text-steel">Resueltas recientemente</h3>
      <div className="space-y-1.5">
        {resolved.slice(0, 20).map((a: any) => (
          <div key={a.id} className="rounded border border-line bg-white px-3 py-2 text-xs text-steel">
            {a.units?.name} — {a.resolution_note || "sin nota"}
          </div>
        ))}
      </div>
    </div>
  );
}

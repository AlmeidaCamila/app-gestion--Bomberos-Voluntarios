import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { InventoryReviewForm } from "@/components/InventoryReviewForm";

export default async function TaskReviewPage({ params }: { params: { id: string } }) {
  const supabase = createServerSupabase();

  const { data: task } = await supabase
    .from("tasks")
    .select("id, name, unit_id, requires_inventory_review, units(name)")
    .eq("id", params.id)
    .single();

  if (!task || !task.unit_id || !task.requires_inventory_review) notFound();

  const [{ data: inventory }, { data: items }, { data: states }] = await Promise.all([
    supabase.from("unit_inventory").select("id, item_id, quantity").eq("unit_id", task.unit_id),
    supabase.from("inventory_items").select("id, name"),
    supabase.from("item_states").select("code, name, color").order("sort_order"),
  ]);

  const rows = (inventory || []).map((r) => ({
    unit_inventory_id: r.id,
    item_name: items?.find((i) => i.id === r.item_id)?.name || "—",
    quantity: r.quantity,
  }));

  return (
    <div>
      <h2 className="mb-1 font-display text-lg uppercase">{task.name}</h2>
      <p className="mb-4 text-xs text-steel">
        Revisión de inventario — {(task as any).units?.name}
      </p>
      {!rows.length ? (
        <div className="rounded-lg border border-line bg-white p-6 text-center text-sm text-steel">
          Esta unidad todavía no tiene inventario cargado. Pedile al encargado que lo cargue desde &quot;Inventario&quot;.
        </div>
      ) : (
        <InventoryReviewForm taskId={task.id} unitId={task.unit_id} rows={rows} states={states || []} />
      )}
    </div>
  );
}

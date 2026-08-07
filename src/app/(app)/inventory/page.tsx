import { getCurrentProfile } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { InventoryManager } from "@/components/InventoryManager";

export default async function InventoryPage() {
  const profile = await getCurrentProfile();
  if (!profile) return null;
  const supabase = createServerSupabase();

  const [{ data: units }, { data: items }, { data: unitInventory }, { data: sections }] = await Promise.all([
    supabase.from("units").select("id, name, code, section_id"),
    supabase.from("inventory_items").select("id, name, category").order("name"),
    supabase.from("unit_inventory").select("id, unit_id, item_id, quantity"),
    supabase.from("sections").select("id, name"),
  ]);

  return (
    <div>
      <h2 className="mb-3 font-display text-base font-bold uppercase tracking-wide text-charcoal">Inventario</h2>
      <InventoryManager
        isAdmin={profile.role_code === "admin"}
        units={units || []}
        items={items || []}
        unitInventory={unitInventory || []}
        sections={sections || []}
      />
    </div>
  );
}

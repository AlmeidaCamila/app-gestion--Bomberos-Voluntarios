"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function resolveAlertAction(alertId: string, formData: FormData) {
  const note = String(formData.get("note") || "").trim();
  const supabase = createServerSupabase();
  const { error } = await supabase.rpc("resolve_alert", { p_alert_id: alertId, p_note: note || null });
  if (error) return { error: error.message };
  revalidatePath("/alerts");
  return { error: null };
}

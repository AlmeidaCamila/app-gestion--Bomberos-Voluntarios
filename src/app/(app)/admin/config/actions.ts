"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateScoringConfigAction(formData: FormData) {
  const supabase = createServerSupabase();
  const id = String(formData.get("id"));
  const patch = {
    points_approved: Number(formData.get("points_approved")),
    points_rejected: Number(formData.get("points_rejected")),
    points_early_bonus: Number(formData.get("points_early_bonus")),
    points_overdue_penalty: Number(formData.get("points_overdue_penalty")),
  };
  const { error } = await supabase
  .from("scoring_config")
  .update(patch as any)
  .eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/config");
  return { error: null };
}

export async function createPriorityAction(formData: FormData) {
  const supabase = createServerSupabase();
  const code = String(formData.get("code") || "").trim().toLowerCase();
  const name = String(formData.get("name") || "").trim();
  const score_multiplier = Number(formData.get("score_multiplier") || 1);
  if (!code || !name) return { error: "Completá código y nombre." };
  const { error } = await supabase.from("priorities").insert({ code, name, score_multiplier, sort_order: 99 } as any);
  if (error) return { error: error.message };
  revalidatePath("/admin/config");
  return { error: null };
}

export async function deletePriorityAction(id: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("priorities").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/config");
  return { error: null };
}

export async function createFrequencyAction(formData: FormData) {
  const supabase = createServerSupabase();
  const days = Number(formData.get("days"));
  const label = String(formData.get("label") || "").trim();
  if (!days || !label) return { error: "Completá días y etiqueta." };
  const { error } = await supabase.from("task_frequencies").insert({ days, label, sort_order: 99 } as any);
  if (error) return { error: error.message };
  revalidatePath("/admin/config");
  return { error: null };
}

export async function deleteFrequencyAction(id: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("task_frequencies").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/config");
  return { error: null };
}

export async function updateGeneralSettingAction(formData: FormData) {
  const supabase = createServerSupabase();
  const key = String(formData.get("key"));
  const value = String(formData.get("value"));
  const { error } = await supabase.from("general_settings").update({ value: JSON.parse(value) }).eq("key", key);
  if (error) return { error: error.message };
  revalidatePath("/admin/config");
  return { error: null };
}

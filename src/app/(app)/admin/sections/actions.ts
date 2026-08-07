"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createSectionAction(formData: FormData) {
  const supabase = createServerSupabase();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "El nombre es obligatorio." };
  const { error } = await supabase.from("sections").insert({ name, icon: "🔥" } as any);
  if (error) return { error: error.message };
  revalidatePath("/admin/sections");
  return { error: null };
}

export async function updateSectionIconAction(sectionId: string, formData: FormData) {
  const supabase = createServerSupabase();
  const icon = String(formData.get("icon") || "").trim();
  if (!icon) return { error: "Elegí un emoji para la sección." };
  const { error } = await supabase.from("sections").update({ icon }).eq("id", sectionId);
  if (error) return { error: error.message };
  revalidatePath("/admin/sections");
  revalidatePath("/");
  return { error: null };
}

export async function updateSectionNameAction(sectionId: string, formData: FormData) {
  const supabase = createServerSupabase();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "El nombre es obligatorio." };
  const { error } = await supabase.from("sections").update({ name }).eq("id", sectionId);
  if (error) return { error: error.message };
  revalidatePath("/admin/sections");
  revalidatePath("/");
  revalidatePath("/tasks");
  return { error: null };
}

export async function deleteSectionAction(id: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("sections").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/sections");
  return { error: null };
}

export async function createSubsectionAction(sectionId: string, formData: FormData) {
  const supabase = createServerSupabase();
  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "El nombre es obligatorio." };
  const { error } = await supabase.from("subsections").insert({ section_id: sectionId, name } as any);
  if (error) return { error: error.message };
  revalidatePath("/admin/sections");
  return { error: null };
}

export async function deleteSubsectionAction(id: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("subsections").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath("/admin/sections");
  return { error: null };
}

export async function assignSectionEncargadoAction(sectionId: string, encargadoId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("sections").update({ encargado_id: encargadoId || null }).eq("id", sectionId);
  if (error) return { error: error.message };
  revalidatePath("/admin/sections");
  return { error: null };
}

export async function assignSubsectionEncargadoAction(subsectionId: string, encargadoId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("subsections").update({ encargado_id: encargadoId || null }).eq("id", subsectionId);
  if (error) return { error: error.message };
  revalidatePath("/admin/sections");
  return { error: null };
}

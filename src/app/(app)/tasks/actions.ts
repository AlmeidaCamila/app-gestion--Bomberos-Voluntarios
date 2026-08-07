"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function createTaskAction(formData: FormData) {
  const supabase = createServerSupabase();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const subsection_id = String(formData.get("subsection_id") || "");
  const unit = String(formData.get("unit") || "").trim();
  const priority_id = String(formData.get("priority_id") || "");
  const type = String(formData.get("type") || "unica");
  const frequency_days = type === "ciclica" ? Number(formData.get("frequency_days")) : null;
  const unit_id = String(formData.get("unit_id") || "") || null;
  const requires_inventory_review = unit_id ? formData.get("requires_inventory_review") === "on" : false;
  const assigned_bombero_id = String(formData.get("assigned_bombero_id") || "") || null;

  if (!name || !subsection_id || !priority_id) {
    return { error: "Completá nombre, subsección y prioridad." };
  }

  const { data: statuses } = await supabase.from("task_statuses").select("id, code");
  const pendiente = statuses?.find((s) => s.code === "pendiente");

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      name,
      description,
      subsection_id,
      unit: unit || null,
      unit_id,
      requires_inventory_review,
      priority_id,
      type,
      frequency_days,
      status_id: pendiente?.id,
      active: true,
    } as any)
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Asignación opcional en el mismo paso de creación (vía la función central
  // assign_task, para que quede auditado igual que cualquier otra asignación).
  if (assigned_bombero_id && created) {
    const { error: assignError } = await supabase.rpc("assign_task", {
      p_task_id: created.id,
      p_bombero_id: assigned_bombero_id,
    });
    if (assignError) return { error: `Tarea creada, pero falló la asignación: ${assignError.message}` };
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null };
}

export async function updateTaskAction(taskId: string, formData: FormData) {
  const supabase = createServerSupabase();
  const name = String(formData.get("name") || "").trim();
  const description = String(formData.get("description") || "").trim();
  const subsection_id = String(formData.get("subsection_id") || "");
  const unit = String(formData.get("unit") || "").trim();
  const priority_id = String(formData.get("priority_id") || "");
  const type = String(formData.get("type") || "unica");
  const frequency_days = type === "ciclica" ? Number(formData.get("frequency_days")) : null;
  const unit_id = String(formData.get("unit_id") || "") || null;
  const requires_inventory_review = unit_id ? formData.get("requires_inventory_review") === "on" : false;
  const assigned_bombero_id = String(formData.get("assigned_bombero_id") || "") || null;

  if (!name || !subsection_id || !priority_id) {
    return { error: "Completá nombre, subsección y prioridad." };
  }

  const { data: current } = await supabase.from("tasks").select("assigned_bombero_id").eq("id", taskId).single();

  const { error } = await supabase
    .from("tasks")
    .update({
      name,
      description,
      subsection_id,
      unit: unit || null,
      unit_id,
      requires_inventory_review,
      priority_id,
      type,
      frequency_days,
    } as any)
    .eq("id", taskId);

  if (error) return { error: error.message };

  // Asignación / reasignación opcional en el mismo paso de edición (vía
  // assign_task, para que quede auditada igual que cualquier otra asignación).
  if (assigned_bombero_id && assigned_bombero_id !== current?.assigned_bombero_id) {
    const { error: assignError } = await supabase.rpc("assign_task", {
      p_task_id: taskId,
      p_bombero_id: assigned_bombero_id,
    });
    if (assignError) return { error: `Tarea actualizada, pero falló la asignación: ${assignError.message}` };
  }

  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null };
}

export async function assignTaskAction(taskId: string, bomberoId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.rpc("assign_task", { p_task_id: taskId, p_bombero_id: bomberoId });
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  revalidatePath("/");
  return { error: null };
}

export async function completeTaskAction(taskId: string, observations: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.rpc("submit_task", { p_task_id: taskId, p_observations: observations });
  if (error) return { error: error.message };
  revalidatePath("/");
  revalidatePath("/tasks");
  return { error: null };
}

export async function toggleTaskActiveAction(taskId: string, active: boolean) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("tasks").update({ active: !active }).eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  return { error: null };
}

export async function deleteTaskAction(taskId: string) {
  const supabase = createServerSupabase();
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  if (error) return { error: error.message };
  revalidatePath("/tasks");
  return { error: null };
}


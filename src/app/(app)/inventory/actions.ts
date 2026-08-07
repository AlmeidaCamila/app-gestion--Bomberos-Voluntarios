"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { PANOL_UNIT_NAME } from "@/lib/constants";

/**
 * Todas las acciones de este archivo devuelven siempre {error: string|null},
 * nunca lanzan — así un fallo inesperado (RLS, red, fila duplicada, etc.)
 * termina en un mensaje de error prolijo en vez de tirar abajo la página
 * ("crash al crear unidades" que reportaron).
 */

// ---------- Inventario: Administrador, Encargado de Área y Subencargado.
// Los bomberos solo pueden ver (acá y en RLS: can_manage_inventory() /
// items_write no los incluye). ----------
const INVENTORY_MANAGER_ROLES = ["admin", "encargado_seccion", "encargado_subseccion"];

async function assertCanManageInventory() {
  const profile = await getCurrentProfile();
  if (!profile || !INVENTORY_MANAGER_ROLES.includes(profile.role_code)) {
    throw new Error("No tenés permiso para modificar el inventario.");
  }
}

export async function createInventoryItemAction(formData: FormData) {
  try {
    await assertCanManageInventory();
    const supabase = createServerSupabase();
    const name = String(formData.get("name") || "").trim();
    const category = String(formData.get("category") || "").trim();
    if (!name) return { error: "El nombre es obligatorio." };
    const { error } = await supabase.from("inventory_items").insert({ name, category: category || null } as any);
    if (error) return { error: error.message };
    revalidatePath("/inventory");
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || "Ocurrió un error inesperado." };
  }
}

export async function deleteInventoryItemAction(id: string) {
  try {
    await assertCanManageInventory();
    const supabase = createServerSupabase();
    const { error } = await supabase.from("inventory_items").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/inventory");
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || "Ocurrió un error inesperado." };
  }
}

// ---------- Unidades (Encargado de Área / Subencargado de esa sección + admin) ----------
export async function createUnitAction(formData: FormData) {
  try {
    await assertCanManageInventory();
    const supabase = createServerSupabase();
    const name = String(formData.get("name") || "").trim();
    const section_id = String(formData.get("section_id") || "");
    const code = String(formData.get("code") || "").trim();
    if (!name) return { error: "El nombre de la unidad es obligatorio." };
    if (!section_id) return { error: "Elegí a qué sección pertenece la unidad." };

    const { error } = await supabase.from("units").insert({ name, section_id, code: code || null } as any);
    if (error) {
      // Mensaje más claro para el caso típico de RLS (usuario sin permiso
      // sobre esa sección) en vez de dejar pasar el error crudo de Postgres.
      if (error.code === "42501" || /row-level security/i.test(error.message)) {
        return { error: "No tenés permiso para crear unidades en esa sección." };
      }
      return { error: error.message };
    }
    revalidatePath("/inventory");
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || "Ocurrió un error inesperado al crear la unidad." };
  }
}

/** Crea (si todavía no existe) la unidad "Pañol / Otros" de una sección, para
 * elementos que no pertenecen a ningún vehículo/puesto en particular. */
export async function ensurePanolUnitAction(sectionId: string) {
  try {
    await assertCanManageInventory();
    const supabase = createServerSupabase();
    const { data: existing } = await supabase
      .from("units")
      .select("id")
      .eq("section_id", sectionId)
      .eq("name", PANOL_UNIT_NAME)
      .maybeSingle();
    if (existing) return { error: null, unitId: existing.id };

    const { data: created, error } = await supabase
      .from("units")
      .insert({ name: PANOL_UNIT_NAME, section_id: sectionId } as any)
      .select("id")
      .single();
    if (error) return { error: error.message, unitId: null };
    revalidatePath("/inventory");
    return { error: null, unitId: created?.id as string | null };
  } catch (e: any) {
    return { error: e?.message || "Ocurrió un error inesperado.", unitId: null };
  }
}

export async function deleteUnitAction(id: string) {
  try {
    await assertCanManageInventory();
    const supabase = createServerSupabase();
    const { error } = await supabase.from("units").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/inventory");
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || "Ocurrió un error inesperado." };
  }
}

// ---------- Inventario de una unidad: asignar elemento + cantidad ----------
export async function addUnitInventoryAction(unitId: string, formData: FormData) {
  try {
    await assertCanManageInventory();
    const supabase = createServerSupabase();
    const item_id = String(formData.get("item_id") || "");
    const quantity = Number(formData.get("quantity") || 1);
    if (!item_id) return { error: "Elegí un elemento del catálogo." };
    if (!Number.isFinite(quantity) || quantity < 1) return { error: "La cantidad tiene que ser mayor a 0." };
    const { error } = await supabase
      .from("unit_inventory")
      .upsert({ unit_id: unitId, item_id, quantity } as any, { onConflict: "unit_id,item_id" });
    if (error) return { error: error.message };
    revalidatePath("/inventory");
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || "Ocurrió un error inesperado." };
  }
}

export async function updateUnitInventoryQuantityAction(id: string, quantity: number) {
  try {
    await assertCanManageInventory();
    if (!Number.isFinite(quantity) || quantity < 1) return { error: "La cantidad tiene que ser mayor a 0." };
    const supabase = createServerSupabase();
    const { error } = await supabase.from("unit_inventory").update({ quantity }).eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/inventory");
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || "Ocurrió un error inesperado." };
  }
}

export async function removeUnitInventoryAction(id: string) {
  try {
    await assertCanManageInventory();
    const supabase = createServerSupabase();
    const { error } = await supabase.from("unit_inventory").delete().eq("id", id);
    if (error) return { error: error.message };
    revalidatePath("/inventory");
    return { error: null };
  } catch (e: any) {
    return { error: e?.message || "Ocurrió un error inesperado." };
  }
}

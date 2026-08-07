"use server";

import { createAdminSupabase } from "@/lib/supabase/admin";
import { createServerSupabase } from "@/lib/supabase/server";
import { legajoToEmail, getCurrentProfile } from "@/lib/auth";
import type { RoleCode } from "@/lib/types/database.types";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role_code !== "admin") {
    throw new Error("Solo un administrador puede gestionar usuarios.");
  }
}

const VALID_ROLES: RoleCode[] = ["admin", "encargado_seccion", "encargado_subseccion", "bombero"];

export async function createUserAction(
  prevState: { error: string | null },
  formData: FormData
) {
  await assertAdmin();

  const legajo = String(formData.get("legajo") || "").trim();
  const full_name = String(formData.get("full_name") || "").trim();
  const password = String(formData.get("password") || "");
  const role_code_raw = String(formData.get("role_code") || "bombero");
  const role_code: RoleCode = VALID_ROLES.includes(role_code_raw as RoleCode) ? (role_code_raw as RoleCode) : "bombero";
  const section_id = String(formData.get("section_id") || "") || null;
  const subsection_id = String(formData.get("subsection_id") || "") || null;

  if (!legajo || !full_name || !password) {
    return { error: "Completá legajo, nombre y contraseña." };
  }

  const admin = createAdminSupabase();
  const server = createServerSupabase();

  // Verificar si el legajo ya existe
  const { data: existingUser } = await admin
    .from("profiles")
    .select("id")
    .eq("legajo", legajo)
    .maybeSingle();

  if (existingUser) {
    return { error: "El legajo ya existe, elegí otro." };
  }

  // Crear usuario en Auth (contraseña cifrada por Supabase)
  const { data: authUser, error: authError } = await admin.auth.admin.createUser({
    email: legajoToEmail(legajo),
    password,
    email_confirm: true,
  });

  if (authError || !authUser.user) {
    return { error: authError?.message || "No se pudo crear el usuario." };
  }

  // Buscar el id del rol elegido
  const { data: role } = await server.from("roles").select("id").eq("code", role_code).single();

  // Crear el perfil vinculado
  const { error: profileError } = await admin.from("profiles").insert({
    id: authUser.user.id,
    legajo,
    full_name,
    role_id: role?.id,
    section_id: role_code === "admin" ? null : section_id,
    subsection_id: (["bombero", "encargado_subseccion"] as RoleCode[]).includes(role_code) ? subsection_id : null,
    active: true,
  } as any);

  if (profileError) {
    // Si falla el perfil, no dejamos un usuario de Auth huérfano
    await admin.auth.admin.deleteUser(authUser.user.id);
    if (profileError.code === "23505") {
      return { error: "El legajo ya existe, elegí otro." };
    }
    return { error: profileError.message };
  }

  revalidatePath("/admin/users");
  return { error: null };
}

export async function updateUserActiveAction(userId: string, active: boolean) {
  await assertAdmin();
  const admin = createAdminSupabase();
  const { error } = await admin.from("profiles").update({ active: !active }).eq("id", userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { error: null };
}

export async function resetUserPasswordAction(userId: string, newPassword: string) {
  await assertAdmin();
  if (!newPassword || newPassword.length < 6) {
    return { error: "La contraseña tiene que tener al menos 6 caracteres." };
  }
  const admin = createAdminSupabase();
  // Cambia la contraseña directamente en Supabase Auth (queda cifrada ahí,
  // igual que al crear el usuario) — no pasa por la tabla profiles.
  const { error } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { error: null };
}

export async function deleteUserAction(userId: string) {
  await assertAdmin();
  const admin = createAdminSupabase();
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return { error: error.message };
  revalidatePath("/admin/users");
  return { error: null };
}

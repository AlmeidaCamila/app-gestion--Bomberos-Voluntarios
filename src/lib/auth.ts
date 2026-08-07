import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile, RoleCode } from "@/lib/types/database.types";

const AUTH_EMAIL_DOMAIN = process.env.AUTH_EMAIL_DOMAIN || "cuartel.local";

// El login es por legajo, pero Supabase Auth trabaja con email.
// Construimos un email sintético determinístico a partir del legajo
// (nunca se muestra al usuario, es solo el identificador interno de Auth).
export function legajoToEmail(legajo: string) {
  return `${legajo.trim().toLowerCase()}@${AUTH_EMAIL_DOMAIN}`;
}

export async function getCurrentProfile(): Promise<
  (Profile & { role_code: RoleCode; role_name: string }) | null
> {
  const supabase = createServerSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("*, roles(code, name)")
    .eq("id", auth.user.id)
    .single();

  if (error || !data) return null;
  const roles = (data as any).roles;
  return { ...(data as any), role_code: roles.code, role_name: roles.name };
}

export const ROLE_LABELS: Record<RoleCode, string> = {
  admin: "Administrador",
  encargado_seccion: "Encargado de Área",
  encargado_subseccion: "Subencargado",
  bombero: "Bombero",
};

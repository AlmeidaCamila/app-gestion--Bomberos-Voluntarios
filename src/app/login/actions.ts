"use server";

import { createServerSupabase } from "@/lib/supabase/server";
import { legajoToEmail } from "@/lib/auth";
import { redirect } from "next/navigation";

export async function loginAction(
  _prevState: { error: string | null },
  formData: FormData
): Promise<{ error: string | null }> {
  const legajo = String(formData.get("legajo") || "").trim();
  const password = String(formData.get("password") || "");

  if (!legajo || !password) {
    return { error: "Completá legajo y contraseña." };
  }

  const supabase = createServerSupabase();
  const { error } = await supabase.auth.signInWithPassword({
    email: legajoToEmail(legajo),
    password,
  });

  if (error) {
    return { error: "Legajo o contraseña incorrectos." };
  }

  redirect("/");
}

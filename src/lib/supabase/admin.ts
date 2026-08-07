import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// SOLO usar dentro de Server Actions / route handlers marcados 'use server'.
// Nunca importar este archivo desde un componente de cliente: expondría
// la service role key, que tiene acceso total saltando RLS.
export function createAdminSupabase() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

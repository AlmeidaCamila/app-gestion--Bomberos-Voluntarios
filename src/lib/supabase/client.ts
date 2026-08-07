import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Ver la nota en lib/supabase/server.ts sobre por qué casteamos en vez de
// pasar <Database> directo a createBrowserClient (desactualización de tipos
// entre @supabase/ssr@0.5.2 y la versión instalada de @supabase/supabase-js).
export function createClient(): SupabaseClient<Database> {
  const client = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  return client as unknown as SupabaseClient<Database>;
}

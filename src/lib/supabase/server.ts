import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

// Cliente "de servidor": usa la sesión del usuario logueado (cookies),
// por lo tanto todas las consultas pasan por RLS con su rol real.
// Es el que se usa en Server Components y Server Actions normales.
//
// NOTA sobre el cast final: @supabase/ssr@0.5.2 importa sus tipos desde una
// ruta interna de @supabase/supabase-js (`dist/module/lib/types`) que ya no
// existe en versiones nuevas del paquete (la que quedó instalada acá es la
// 2.112.0). Eso rompe la inferencia de tipos de createServerClient<Database>
// y todo colapsa a `never`. El cliente en tiempo de ejecución funciona
// perfecto — es solo la firma de TypeScript la que está desactualizada.
// Por eso creamos el cliente sin el genérico roto y lo casteamos al tipo
// real y correcto de SupabaseClient<Database> (de @supabase/supabase-js).
// Cuando actualicés @supabase/ssr a una versión que ya soporte supabase-js
// 2.x moderno, se puede volver a pasar <Database> directo a
// createServerClient y sacar este cast.
export function createServerSupabase(): SupabaseClient<Database> {
  const cookieStore = cookies();
  const client = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // se puede ignorar cuando se llama desde un Server Component puro
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch {}
        },
      },
    }
  );
  return client as unknown as SupabaseClient<Database>;
}

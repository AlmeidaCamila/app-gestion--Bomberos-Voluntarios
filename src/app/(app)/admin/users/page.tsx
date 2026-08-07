import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth";
import { Users } from "lucide-react";
import UserForm from "./UserForm";
import { UserRowActions } from "./UserRowActions";

export default async function AdminUsersPage() {
  const profile = await getCurrentProfile();
  const supabase = createServerSupabase();

  const [{ data: users }, { data: sections }, { data: subsections }] = await Promise.all([
    supabase.from("profiles").select("id, legajo, full_name, active, section_id, subsection_id, roles(code, name)"),
    supabase.from("sections").select("id, name"),
    supabase.from("subsections").select("id, name, section_id"),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-4 flex items-center gap-2 text-charcoal">
        <Users className="h-5 w-5" />
        <h2 className="font-display text-base font-bold uppercase tracking-wide">Usuarios</h2>
      </div>

      <UserForm sections={sections ?? []} subsections={subsections ?? []} />

      <div className="overflow-x-auto rounded-lg border border-line bg-white">
        <table className="w-full text-left text-xs">
          <thead className="bg-paper">
            <tr className="border-b border-line font-mono text-[10px] uppercase tracking-wide text-steel">
              <th className="px-3 py-2">Legajo</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Rol</th>
              <th className="px-3 py-2">Sección / Subsección</th>
              <th className="px-3 py-2">Estado / Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {users?.map((u: any) => {
              const sec = sections?.find((s) => s.id === u.section_id);
              const sub = subsections?.find((s) => s.id === u.subsection_id);
              return (
                <tr key={u.id}>
                  <td className="px-3 py-2 font-mono">{u.legajo}</td>
                  <td className="px-3 py-2 font-semibold text-charcoal">{u.full_name}</td>
                  <td className="px-3 py-2 text-steel">{u.roles?.name}</td>
                  <td className="px-3 py-2 text-steel">
                    {sec?.name}
                    {sub ? ` / ${sub.name}` : ""}
                  </td>
                  <td className="px-3 py-2">
                    <UserRowActions userId={u.id} active={u.active} isSelf={u.id === profile?.id} />
                  </td>
                </tr>
              );
            })}
            {!users?.length && (
              <tr>
                <td colSpan={5} className="px-3 py-8 text-center text-steel">
                  Todavía no hay usuarios cargados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

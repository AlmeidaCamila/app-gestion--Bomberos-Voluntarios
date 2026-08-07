import { createServerSupabase } from "@/lib/supabase/server";
import { Plus, Edit2, Trash2, LayoutGrid } from "lucide-react";
import { asFormAction } from "@/lib/actionHelpers";
import { EncargadoSelect } from "@/components/EncargadoSelect";
import {
  createSectionAction,
  updateSectionIconAction,
  deleteSectionAction,
  createSubsectionAction,
  deleteSubsectionAction,
  assignSectionEncargadoAction,
  assignSubsectionEncargadoAction,
} from "./actions";

export default async function AdminSectionsPage() {
  const supabase = createServerSupabase();
  const [
    { data: sections, error: sectionsError },
    { data: subsections, error: subsectionsError },
    { data: profiles, error: profilesError },
  ] = await Promise.all([
    supabase.from("sections").select("id, name, icon, encargado_id"),
    supabase.from("subsections").select("id, name, section_id, encargado_id"),
    supabase.from("profiles").select("id, full_name, roles(code)").eq("active", true),
  ]);

  if (sectionsError) console.error("[admin/sections] error al cargar secciones:", sectionsError.message);
  if (subsectionsError) console.error("[admin/sections] error al cargar subsecciones:", subsectionsError.message);
  if (profilesError) console.error("[admin/sections] error al cargar perfiles:", profilesError.message);

  // El Encargado de área asigna un "encargado_seccion"; la subsección asigna
  // un "encargado_subseccion". Antes el mismo listado (todos los perfiles
  // activos, sin filtrar por rol) se mostraba en los dos selects.
  const encargadosSeccion = (profiles || []).filter((p: any) => p.roles?.code === "encargado_seccion");
  const encargadosSubseccion = (profiles || []).filter((p: any) => p.roles?.code === "encargado_subseccion");

  return (
    <div className="mx-auto max-w-5xl">
      {/* Cabecera principal al estilo de la primera imagen */}
      <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-2 text-charcoal">
          <LayoutGrid className="h-5 w-5" />
          <h2 className="font-display text-lg font-bold uppercase tracking-wide">
            Secciones del Cuartel
          </h2>
        </div>

        {/* Formulario de Nueva Sección (Integrado de forma limpia) */}
        <form action={asFormAction(createSectionAction)} className="flex gap-2">
          <input
            name="name"
            placeholder="Nombre de la sección..."
            required
            className="w-full rounded-md border border-line px-3 py-2 text-sm outline-none focus:border-brand md:w-64"
          />
          <button className="flex items-center gap-1.5 whitespace-nowrap rounded-md bg-brand px-4 py-2 font-display text-xs font-bold uppercase text-white transition-colors hover:bg-brand/90">
            <Plus className="h-4 w-4" /> Nueva Sección
          </button>
        </form>
      </div>

      {/* Lista de Secciones */}
      <div className="space-y-6">
        {sections?.map((s) => (
          <div key={s.id} className="rounded-xl border border-line bg-white shadow-sm">
            {/* Cabecera de la Tarjeta */}
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <div className="flex items-center gap-3 text-charcoal">
                <form action={asFormAction(updateSectionIconAction, s.id)} className="flex items-center gap-1">
                  <input
                    name="icon"
                    defaultValue={s.icon || "🔥"}
                    maxLength={4}
                    title="Emoji de la sección"
                    className="w-9 rounded border border-line text-center text-lg outline-none focus:border-brand"
                  />
                  <button title="Guardar emoji" className="text-[11px] text-steel hover:text-brand">
                    ✓
                  </button>
                </form>
                <h3 className="font-display text-base font-bold uppercase">{s.name}</h3>
              </div>
              <div className="flex items-center gap-4">
                <button
                  disabled
                  title="Próximamente: editar el nombre de la sección"
                  className="flex items-center gap-1.5 font-display text-xs font-semibold uppercase text-steel opacity-40"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Editar nombre
                </button>
                <form action={asFormAction(deleteSectionAction, s.id)}>
                  <button className="flex items-center text-brand transition-colors hover:text-brand/80">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Cuerpo de la Tarjeta */}
            <div className="p-6">
              {/* Desplegable de Encargado de Área */}
              <div className="mb-8">
                <label className="mb-2 block font-mono text-[10px] uppercase tracking-wide text-steel">
                  Encargado de área
                </label>
                <EncargadoSelect
                  defaultValue={s.encargado_id || ""}
                  options={encargadosSeccion}
                  targetId={s.id}
                  action={assignSectionEncargadoAction}
                  className="w-full max-w-md rounded-md border border-line bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-brand"
                />
                {encargadosSeccion.length === 0 && (
                  <p className="mt-1 text-[11px] text-steel">
                    Todavía no creaste ningún usuario con rol &quot;Encargado de Área&quot; — se van a poder asignar acá
                    apenas exista uno.
                  </p>
                )}
              </div>

              {/* Subsecciones */}
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-display text-[13px] font-bold uppercase text-charcoal">
                  Subsecciones
                </h4>

                {/* Formulario rápido para agregar subsección */}
                <form action={asFormAction(createSubsectionAction, s.id)} className="flex items-center gap-2">
                  <input
                    name="name"
                    placeholder="Nombre..."
                    required
                    className="w-32 rounded border border-line px-2 py-1.5 text-xs outline-none focus:border-brand"
                  />
                  <button className="flex items-center gap-1.5 rounded border border-line px-3 py-1.5 font-display text-[11px] font-bold uppercase text-charcoal transition-colors hover:bg-paper2">
                    <Plus className="h-3.5 w-3.5" /> Agregar
                  </button>
                </form>
              </div>

              {/* Grilla de Subsecciones (Estilo Tarjeta Pequeña) */}
              {subsections?.filter((sd) => sd.section_id === s.id).length === 0 ? (
                <p className="text-sm text-steel">Sin subsecciones todavía.</p>
              ) : (
                <div className="flex flex-wrap gap-3">
                  {subsections
                    ?.filter((sd) => sd.section_id === s.id)
                    .map((sd) => (
                      <div key={sd.id} className="flex min-w-[200px] flex-col gap-2 rounded-lg bg-[#EFEFEF] p-2.5">
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-sm font-semibold text-charcoal">{sd.name}</span>
                          <form action={asFormAction(deleteSubsectionAction, sd.id)}>
                            <button className="text-steel transition-colors hover:text-brand">✕</button>
                          </form>
                        </div>
                        {/* Selector de encargado para la subsección */}
                        <EncargadoSelect
                          defaultValue={sd.encargado_id || ""}
                          options={encargadosSubseccion}
                          targetId={sd.id}
                          action={assignSubsectionEncargadoAction}
                          placeholder="Sin encargado"
                          className="w-full rounded border border-line bg-white px-2 py-1.5 text-xs text-charcoal outline-none"
                        />
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

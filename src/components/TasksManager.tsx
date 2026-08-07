"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Eye, Trash2, X, CheckCircle2 } from "lucide-react";
import { Drawer } from "@/components/Drawer";
import { AssignControl } from "@/components/AssignControl";
import { useToast } from "@/components/Toast";
import {
  createTaskAction,
  updateTaskAction,
  toggleTaskActiveAction,
  deleteTaskAction,
} from "@/app/(app)/tasks/actions";

interface Subsection { id: string; name: string; section_id: string; }
interface SectionLite { id: string; name: string; }
interface Priority { id: string; name: string; code: string; }
interface Frequency { days: number; label: string; }
interface Bombero { id: string; full_name: string; legajo: string; subsection_id: string | null; }
interface UnitLite { id: string; name: string; }
interface TaskRow {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  unit_id: string | null;
  requires_inventory_review: boolean;
  type: string;
  frequency_days: number | null;
  due_date: string | null;
  active: boolean;
  subsection_id: string;
  assigned_bombero_id: string | null;
  priority_id: string;
  priorities: { name: string; code: string } | null;
  task_statuses: { name: string; code: string } | null;
  subsections: { name: string; sections: { name: string } | null } | null;
}

const PRIORITY_DOT: Record<string, string> = {
  baja: "bg-steelLight",
  media: "bg-blue",
  alta: "bg-amber",
  critica: "bg-brand",
};

export function TasksManager({
  tasks,
  sections,
  subsections,
  priorities,
  frequencies,
  bomberos,
  units,
}: {
  tasks: TaskRow[];
  sections: SectionLite[];
  subsections: Subsection[];
  priorities: Priority[];
  frequencies: Frequency[];
  bomberos: Bombero[];
  units: UnitLite[];
}) {
  const [drawer, setDrawer] = useState<{ mode: "create" | "edit" | "view"; task?: TaskRow } | null>(null);
  const [search, setSearch] = useState("");
  const showToast = useToast();

  const filtered = useMemo(() => {
    if (!search.trim()) return tasks;
    const q = search.toLowerCase();
    return tasks.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.subsections?.name.toLowerCase().includes(q) ||
        t.subsections?.sections?.name.toLowerCase().includes(q)
    );
  }, [tasks, search]);

  function bomberoName(id: string | null) {
    if (!id) return null;
    return bomberos.find((b) => b.id === id)?.full_name || null;
  }

  async function handleToggle(t: TaskRow) {
    const res = await toggleTaskActiveAction(t.id, t.active);
    if (res.error) showToast(res.error, "error");
    else showToast(t.active ? "Tarea desactivada." : "Tarea activada.");
  }

  async function handleDelete(t: TaskRow) {
    if (!confirm(`¿Eliminar "${t.name}"? Esta acción no se puede deshacer.`)) return;
    const res = await deleteTaskAction(t.id);
    if (res.error) showToast(res.error, "error");
    else showToast("Tarea eliminada.");
  }

  return (
    <div>
      {/* Barra superior compacta: buscador + acción principal */}
      <div className="mb-3 flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar tarea, sección o subsección..."
          className="w-full rounded-md border border-line px-3 py-1.5 text-sm sm:max-w-xs"
        />
        <button
          onClick={() => setDrawer({ mode: "create" })}
          className="flex items-center justify-center gap-1.5 rounded-md bg-brand px-3.5 py-1.5 font-display text-xs font-bold uppercase text-white hover:bg-brand-dark"
        >
          <Plus className="h-4 w-4" /> Nueva tarea
        </button>
      </div>

      {/* Tabla compacta — desktop */}
      <div className="hidden overflow-x-auto rounded-lg border border-line bg-white md:block">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-line bg-paper font-mono text-[10px] uppercase text-steel">
              <th className="px-3 py-2 text-left">Tarea</th>
              <th className="px-3 py-2 text-left">Sección / Subsección</th>
              <th className="px-3 py-2 text-left">Responsable</th>
              <th className="px-3 py-2 text-left">Prioridad</th>
              <th className="px-3 py-2 text-left">Tipo</th>
              <th className="px-3 py-2 text-left">Estado</th>
              <th className="px-3 py-2 text-left">Vence</th>
              <th className="px-3 py-2 text-left">Activa</th>
              <th className="px-3 py-2 text-left"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t) => (
              <tr key={t.id} className={`border-b border-line last:border-0 ${!t.active ? "opacity-50" : ""}`}>
                <td className="max-w-[220px] truncate px-3 py-2 font-semibold text-charcoal">{t.name}</td>
                <td className="px-3 py-2 text-steel">
                  {t.subsections?.sections?.name} <span className="text-steelLight">/</span> {t.subsections?.name}
                </td>
                <td className="px-3 py-2">
                  <AssignControl
                    taskId={t.id}
                    currentBomberoId={t.assigned_bombero_id}
                    currentBomberoName={bomberoName(t.assigned_bombero_id)}
                    bomberos={bomberos.filter((b) => b.subsection_id === t.subsection_id)}
                    compact
                  />
                </td>
                <td className="px-3 py-2">
                  <span className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${PRIORITY_DOT[t.priorities?.code || ""] || "bg-steel"}`} />
                    {t.priorities?.name}
                  </span>
                </td>
                <td className="px-3 py-2 text-steel">{t.type === "ciclica" ? "Cíclica" : "Única"}</td>
                <td className="px-3 py-2 text-steel">{t.task_statuses?.name}</td>
                <td className="px-3 py-2 font-mono text-steel">
                  {t.due_date ? new Date(t.due_date).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" }) : "—"}
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => handleToggle(t)} className="underline">
                    {t.active ? "Sí" : "No"}
                  </button>
                </td>
                <td className="whitespace-nowrap px-3 py-2">
                  <div className="flex items-center gap-2 text-steel">
                    <button title="Ver" onClick={() => setDrawer({ mode: "view", task: t })} className="hover:text-charcoal">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button title="Editar" onClick={() => setDrawer({ mode: "edit", task: t })} className="hover:text-charcoal">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button title="Eliminar" onClick={() => handleDelete(t)} className="hover:text-brand">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={9} className="px-3 py-8 text-center text-steel">
                  No hay tareas que coincidan.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Tarjetas — mobile */}
      <div className="space-y-2.5 md:hidden">
        {!filtered.length && (
          <div className="rounded-lg border border-line bg-white p-6 text-center text-sm text-steel">
            No hay tareas que coincidan.
          </div>
        )}
        {filtered.map((t) => (
          <div key={t.id} className={`rounded-lg border border-line bg-white p-3.5 ${!t.active ? "opacity-50" : ""}`}>
            <div className="mb-1.5 flex items-start justify-between gap-2">
              <h4 className="text-sm font-bold uppercase text-charcoal">{t.name}</h4>
              <span className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${PRIORITY_DOT[t.priorities?.code || ""] || "bg-steel"}`} />
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px] text-steel">
              <div>
                Área: <span className="text-charcoal">{t.subsections?.sections?.name}</span>
              </div>
              <div>
                Estado: <span className="text-charcoal">{t.task_statuses?.name}</span>
              </div>
              <div className="col-span-2">
                Responsable: <span className="text-charcoal">{bomberoName(t.assigned_bombero_id) || "Sin asignar"}</span>
              </div>
            </div>
            <div className="mt-2.5 flex gap-2">
              <button
                onClick={() => setDrawer({ mode: "edit", task: t })}
                className="flex-1 rounded border border-line py-1.5 text-[11px] font-semibold uppercase text-charcoal"
              >
                Editar
              </button>
              <button
                onClick={() => setDrawer({ mode: "view", task: t })}
                className="flex-1 rounded border border-line py-1.5 text-[11px] font-semibold uppercase text-charcoal"
              >
                Ver
              </button>
              <button onClick={() => handleDelete(t)} className="rounded border border-brand px-2.5 text-brand">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Drawer
        open={!!drawer}
        onClose={() => setDrawer(null)}
        title={drawer?.mode === "create" ? "Nueva tarea" : drawer?.mode === "edit" ? "Editar tarea" : "Detalle de tarea"}
      >
        {drawer?.mode === "view" && drawer.task && <TaskView task={drawer.task} bomberoName={bomberoName} />}
        {(drawer?.mode === "create" || drawer?.mode === "edit") && (
          <TaskForm
            key={drawer.task?.id || "new"}
            mode={drawer.mode}
            task={drawer.task}
            sections={sections}
            subsections={subsections}
            priorities={priorities}
            frequencies={frequencies}
            bomberos={bomberos}
            units={units}
            onDone={() => setDrawer(null)}
          />
        )}
      </Drawer>
    </div>
  );
}

function TaskView({ task, bomberoName }: { task: TaskRow; bomberoName: (id: string | null) => string | null }) {
  return (
    <div className="space-y-3 text-sm">
      <div>
        <div className="font-mono text-[10px] uppercase text-steel">Nombre</div>
        <div className="font-semibold text-charcoal">{task.name}</div>
      </div>
      {task.description && (
        <div>
          <div className="font-mono text-[10px] uppercase text-steel">Descripción</div>
          <div className="text-charcoal">{task.description}</div>
        </div>
      )}
      <div>
        <div className="font-mono text-[10px] uppercase text-steel">Sección / Subsección</div>
        <div className="text-charcoal">
          {task.subsections?.sections?.name} / {task.subsections?.name}
        </div>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase text-steel">Responsable</div>
        <div className="text-charcoal">{bomberoName(task.assigned_bombero_id) || "Sin asignar"}</div>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase text-steel">Prioridad / Tipo</div>
        <div className="text-charcoal">
          {task.priorities?.name} · {task.type === "ciclica" ? `Cíclica (cada ${task.frequency_days} días)` : "Única ejecución"}
        </div>
      </div>
      <div>
        <div className="font-mono text-[10px] uppercase text-steel">Estado</div>
        <div className="text-charcoal">{task.task_statuses?.name}</div>
      </div>
      {task.due_date && (
        <div>
          <div className="font-mono text-[10px] uppercase text-steel">Vencimiento</div>
          <div className="text-charcoal">{new Date(task.due_date).toLocaleString("es-AR")}</div>
        </div>
      )}
    </div>
  );
}

function TaskForm({
  mode,
  task,
  sections,
  subsections,
  priorities,
  frequencies,
  bomberos,
  units,
  onDone,
}: {
  mode: "create" | "edit";
  task?: TaskRow;
  sections: SectionLite[];
  subsections: Subsection[];
  priorities: Priority[];
  frequencies: Frequency[];
  bomberos: Bombero[];
  units: UnitLite[];
  onDone: () => void;
}) {
  const initialSectionId = task?.subsections
    ? subsections.find((s) => s.id === task.subsection_id)?.section_id || ""
    : sections[0]?.id || "";

  const [sectionId, setSectionId] = useState(initialSectionId);
  const [subsectionId, setSubsectionId] = useState(task?.subsection_id || "");
  const [type, setType] = useState(task?.type || "unica");
  const [unitId, setUnitId] = useState(task?.unit_id || "");
  const [step, setStep] = useState<"section" | "details">(task ? "details" : "section");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const showToast = useToast();

  const filteredSubsections = subsections.filter((s) => s.section_id === sectionId);
  const filteredBomberos = bomberos.filter((b) => b.subsection_id === subsectionId);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = mode === "create" ? await createTaskAction(formData) : await updateTaskAction(task!.id, formData);
      if (res.error) {
        setError(res.error);
        return;
      }
      showToast(mode === "create" ? "Tarea creada correctamente." : "Tarea actualizada.");
      if (mode === "create") {
        setSuccess(true);
        setTimeout(() => onDone(), 900);
      } else {
        onDone();
      }
    });
  }

  if (success) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
        <CheckCircle2 className="h-10 w-10 text-green" />
        <p className="font-display text-sm font-bold uppercase text-charcoal">Tarea creada correctamente</p>
      </div>
    );
  }

  // Paso 1: elegir sección (solo en creación, para acotar subsecciones)
  if (step === "section") {
    return (
      <div>
        <p className="mb-3 text-xs text-steel">Elegí la sección para filtrar sus subsecciones.</p>
        <div className="grid grid-cols-2 gap-2">
          {sections.map((s) => (
            <button
              key={s.id}
              onClick={() => {
                setSectionId(s.id);
                setSubsectionId("");
                setStep("details");
              }}
              className="rounded-md border border-line px-3 py-3 text-left text-sm font-semibold text-charcoal hover:border-brand"
            >
              {s.name}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="space-y-3">
      {mode === "create" && (
        <button type="button" onClick={() => setStep("section")} className="mb-1 text-[11px] text-steel underline">
          ← Cambiar sección ({sections.find((s) => s.id === sectionId)?.name})
        </button>
      )}

      <Field label="Nombre">
        <input name="name" defaultValue={task?.name} required className="input" />
      </Field>
      <Field label="Descripción">
        <textarea name="description" defaultValue={task?.description || ""} rows={2} className="input" />
      </Field>
      <Field label="Subsección">
        <select
          name="subsection_id"
          value={subsectionId}
          onChange={(e) => setSubsectionId(e.target.value)}
          required
          className="input"
        >
          <option value="">Elegir subsección...</option>
          {filteredSubsections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        {!filteredSubsections.length && (
          <p className="mt-1 text-[11px] text-steel">Esta sección todavía no tiene subsecciones.</p>
        )}
      </Field>
      <Field label="Unidad o destino (texto libre, opcional)">
        <input name="unit" defaultValue={task?.unit || ""} className="input" />
      </Field>
      <Field label="Vincular a unidad de inventario (opcional)">
        <select name="unit_id" value={unitId} onChange={(e) => setUnitId(e.target.value)} className="input">
          <option value="">— Ninguna —</option>
          {units.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
      </Field>
      {unitId && (
        <label className="flex items-center gap-2 text-xs text-charcoal">
          <input
            type="checkbox"
            name="requires_inventory_review"
            defaultChecked={task?.requires_inventory_review || false}
          />
          Al finalizar, pedir revisión de inventario de la unidad
        </label>
      )}
      <Field label="Prioridad">
        <select name="priority_id" defaultValue={task?.priority_id} required className="input">
          <option value="">Elegir prioridad...</option>
          {priorities.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tipo de tarea">
        <select name="type" value={type} onChange={(e) => setType(e.target.value)} className="input">
          <option value="unica">Única ejecución</option>
          <option value="ciclica">Cíclica</option>
        </select>
      </Field>
      {type === "ciclica" && (
        <Field label="Frecuencia">
          <select name="frequency_days" defaultValue={task?.frequency_days || undefined} className="input">
            {frequencies.map((f) => (
              <option key={f.days} value={f.days}>
                {f.label}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Responsable (opcional)">
        <select
          name="assigned_bombero_id"
          defaultValue={task?.assigned_bombero_id || ""}
          className="input"
          disabled={!subsectionId}
        >
          <option value="">{mode === "create" ? "Sin asignar por ahora" : "Sin cambios"}</option>
          {filteredBomberos.map((b) => (
            <option key={b.id} value={b.id}>
              {b.full_name} ({b.legajo})
            </option>
          ))}
        </select>
      </Field>

      {error && <div className="rounded bg-red-50 px-3 py-2 text-xs text-brand-dark">{error}</div>}

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onDone}
          className="flex-1 rounded-md border border-line py-2 font-display text-xs font-bold uppercase text-charcoal"
        >
          Cancelar
        </button>
        <button
          disabled={pending}
          className="flex-1 rounded-md bg-brand py-2 font-display text-xs font-bold uppercase text-white disabled:opacity-60"
        >
          {pending ? "Guardando..." : mode === "create" ? "Crear tarea" : "Guardar cambios"}
        </button>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border: 1.5px solid #dcd8cf;
          border-radius: 6px;
          padding: 8px 10px;
          font-size: 13px;
        }
      `}</style>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase text-steel">{label}</span>
      {children}
    </label>
  );
}

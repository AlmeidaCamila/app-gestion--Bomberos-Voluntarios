"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Trash2, Search, PackagePlus, Warehouse } from "lucide-react";
import { useToast } from "@/components/Toast";
import {
  createInventoryItemAction,
  deleteInventoryItemAction,
  createUnitAction,
  ensurePanolUnitAction,
  deleteUnitAction,
  addUnitInventoryAction,
  removeUnitInventoryAction,
} from "@/app/(app)/inventory/actions";

interface Item { id: string; name: string; category: string | null; }
interface UnitRow { id: string; name: string; code: string | null; section_id: string; }
interface InvRow { id: string; unit_id: string; item_id: string; quantity: number; }
interface SectionLite { id: string; name: string; }

export function InventoryManager({
  canManageCatalog,
  units,
  items,
  unitInventory,
  sections,
}: {
  canManageCatalog: boolean;
  units: UnitRow[];
  items: Item[];
  unitInventory: InvRow[];
  sections: SectionLite[];
}) {
  const [search, setSearch] = useState("");
  const [sectionFilter, setSectionFilter] = useState("all");
  const showToast = useToast();
  const [pending, startTransition] = useTransition();

  const filteredUnits = useMemo(() => {
    return units.filter((u) => {
      if (sectionFilter !== "all" && u.section_id !== sectionFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      if (u.name.toLowerCase().includes(q)) return true;
      const invItemNames = unitInventory
        .filter((r) => r.unit_id === u.id)
        .map((r) => items.find((i) => i.id === r.item_id)?.name.toLowerCase() || "");
      return invItemNames.some((n) => n.includes(q));
    });
  }, [units, unitInventory, items, search, sectionFilter]);

  function run(promise: Promise<{ error: string | null }>, successMsg: string) {
    startTransition(async () => {
      const res = await promise;
      if (res.error) showToast(res.error, "error");
      else showToast(successMsg);
    });
  }

  function createPanol(sectionId: string) {
    startTransition(async () => {
      const res = await ensurePanolUnitAction(sectionId);
      if (res.error) showToast(res.error, "error");
      else showToast('Unidad "Pañol / Otros" lista.');
    });
  }

  return (
    <div className="space-y-5">
      {canManageCatalog && <CatalogPanel items={items} onRun={run} pending={pending} />}

      {/* Barra de filtros */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-steel" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar unidad o elemento..."
            className="w-full rounded-md border border-line py-1.5 pl-8 pr-3 text-sm"
          />
        </div>
        <select
          value={sectionFilter}
          onChange={(e) => setSectionFilter(e.target.value)}
          className="rounded-md border border-line px-2.5 py-1.5 text-sm"
        >
          <option value="all">Todas las secciones</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <NewUnitForm sections={sections} onCreated={() => showToast("Unidad creada.")} />
      </div>

      {/* Acceso rápido a Pañol/Otros por sección */}
      <div className="flex flex-wrap gap-2">
        {sections.map((s) => {
          const has = units.some((u) => u.section_id === s.id && u.name === "Pañol / Otros");
          if (has) return null;
          return (
            <button
              key={s.id}
              onClick={() => createPanol(s.id)}
              disabled={pending}
              className="flex items-center gap-1.5 rounded-md border border-dashed border-line px-2.5 py-1.5 text-[11px] text-steel hover:border-brand hover:text-brand"
            >
              <Warehouse className="h-3 w-3" /> Crear &quot;Pañol / Otros&quot; en {s.name}
            </button>
          );
        })}
      </div>

      {/* Lista compacta de unidades */}
      <div className="space-y-2.5">
        {!filteredUnits.length && (
          <div className="rounded-lg border border-line bg-white p-6 text-center text-sm text-steel">
            No hay unidades que coincidan.
          </div>
        )}
        {filteredUnits.map((u) => (
          <UnitRowItem key={u.id} unit={u} items={items} rows={unitInventory.filter((r) => r.unit_id === u.id)} onRun={run} />
        ))}
      </div>
    </div>
  );
}

function CatalogPanel({
  items,
  onRun,
  pending,
}: {
  items: Item[];
  onRun: (p: Promise<{ error: string | null }>, msg: string) => void;
  pending: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-line bg-white">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-4 py-3 font-display text-xs font-bold uppercase text-charcoal"
      >
        <span className="flex items-center gap-2">
          <PackagePlus className="h-4 w-4" /> Catálogo de elementos ({items.length})
        </span>
        <span className="text-steel">{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div className="border-t border-line p-4">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {items.map((it) => (
              <span key={it.id} className="flex items-center gap-1.5 rounded bg-paper2 px-2.5 py-1 text-xs">
                {it.name}
                {it.category && <span className="text-steel">· {it.category}</span>}
                <button
                  disabled={pending}
                  onClick={() => onRun(deleteInventoryItemAction(it.id), "Elemento eliminado del catálogo.")}
                  className="text-steel hover:text-brand"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <form
            action={(fd) => onRun(createInventoryItemAction(fd), "Elemento agregado al catálogo.")}
            className="flex flex-wrap gap-2"
          >
            <input name="name" placeholder="Nombre (ej: Manguera 45 mm)" required className="rounded border border-line px-2 py-1.5 text-xs" />
            <input name="category" placeholder="Categoría (opcional)" className="rounded border border-line px-2 py-1.5 text-xs" />
            <button className="rounded border border-line px-3 py-1.5 text-xs">Agregar</button>
          </form>
        </div>
      )}
    </div>
  );
}

function NewUnitForm({ sections, onCreated }: { sections: SectionLite[]; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 rounded-md bg-brand px-3.5 py-1.5 font-display text-xs font-bold uppercase text-white hover:bg-brand-dark"
      >
        <Plus className="h-4 w-4" /> Nueva unidad
      </button>
    );
  }

  return (
    <form
      action={(fd) =>
        startTransition(async () => {
          setError(null);
          const res = await createUnitAction(fd);
          if (res.error) setError(res.error);
          else {
            onCreated();
            setOpen(false);
          }
        })
      }
      className="flex flex-wrap items-center gap-2"
    >
      <input name="name" placeholder="Nombre (ej: Unidad 17)" required className="rounded border border-line px-2 py-1.5 text-xs" />
      <input name="code" placeholder="Código (opc.)" className="w-20 rounded border border-line px-2 py-1.5 text-xs" />
      <select name="section_id" required className="rounded border border-line px-2 py-1.5 text-xs">
        <option value="">Sección...</option>
        {sections.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
      <button disabled={pending} className="rounded bg-charcoal px-3 py-1.5 text-xs text-white disabled:opacity-60">
        {pending ? "..." : "Crear"}
      </button>
      <button type="button" onClick={() => setOpen(false)} className="text-xs text-steel underline">
        Cancelar
      </button>
      {error && <span className="w-full text-[11px] text-brand">{error}</span>}
    </form>
  );
}

function UnitRowItem({
  unit,
  items,
  rows,
  onRun,
}: {
  unit: UnitRow;
  items: Item[];
  rows: InvRow[];
  onRun: (p: Promise<{ error: string | null }>, msg: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border border-line bg-white">
      <button onClick={() => setExpanded((v) => !v)} className="flex w-full items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-left">
          <span className="text-sm font-semibold text-charcoal">{unit.name}</span>
          {unit.code && <span className="font-mono text-[10px] text-steel">({unit.code})</span>}
          <span className="font-mono text-[10px] text-steel">· {rows.length} elemento(s)</span>
        </div>
        <div className="flex items-center gap-3">
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`¿Eliminar la unidad "${unit.name}"?`)) onRun(deleteUnitAction(unit.id), "Unidad eliminada.");
            }}
            className="text-steel hover:text-brand"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
          <span className="text-steel">{expanded ? "−" : "+"}</span>
        </div>
      </button>
      {expanded && (
        <div className="border-t border-line p-3">
          <div className="mb-2 flex flex-wrap gap-1.5">
            {rows.map((r) => {
              const item = items.find((i) => i.id === r.item_id);
              return (
                <span key={r.id} className="flex items-center gap-1.5 rounded bg-paper2 px-2.5 py-1 text-xs">
                  {r.quantity}× {item?.name || "—"}
                  <button onClick={() => onRun(removeUnitInventoryAction(r.id), "Elemento quitado de la unidad.")} className="text-steel hover:text-brand">
                    ✕
                  </button>
                </span>
              );
            })}
            {!rows.length && <span className="text-xs text-steel">Sin elementos cargados todavía.</span>}
          </div>
          <form
            action={(fd) => onRun(addUnitInventoryAction(unit.id, fd), "Elemento agregado a la unidad.")}
            className="flex flex-wrap gap-2"
          >
            <select name="item_id" required className="rounded border border-line px-2 py-1 text-[11px]">
              <option value="">Elemento...</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
            </select>
            <input name="quantity" type="number" min={1} defaultValue={1} className="w-16 rounded border border-line px-2 py-1 text-[11px]" />
            <button className="rounded border border-line px-2 py-1 text-[11px]">Agregar a la unidad</button>
          </form>
        </div>
      )}
    </div>
  );
}

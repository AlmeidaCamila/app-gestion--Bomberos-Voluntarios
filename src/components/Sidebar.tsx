"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
// Importamos algunos iconos comunes para las secciones fijas y el menú móvil
import { Menu, LogOut } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  badge?: number;
  icon?: React.ReactNode; // ¡Agregamos soporte para que el layout le pase el icono!
}

export function Sidebar({
  items,
  userName,
  roleLabel,
  legajo,
  scopeLabel,
}: {
  items: NavItem[];
  userName: string;
  roleLabel: string;
  legajo: string;
  scopeLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      <button
        className="fixed left-4 top-4 z-40 flex items-center justify-center rounded-md border border-line bg-white p-2 text-charcoal md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Abrir menú"
      >
        <Menu size={20} />
      </button>
      
      {open && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />
      )}
      
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-[250px] flex-col bg-charcoal text-paper transition-transform md:sticky md:top-0 md:h-screen md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="border-b border-white/10 px-5 py-5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-charcoal2 text-base">
              🚒
            </div>
            <div>
              <h1 className="font-display text-base uppercase text-white">Tareas de Guardia</h1>
              <div className="font-mono text-[10px] text-steelLight">Gestión de tareas internas</div>
              <div className="font-mono text-[10px] text-steelLight">Cuartel Nº142</div>
              <div className="font-mono text-[10px] text-steelLight">Sierra de los Padres</div>
            </div>
          </div>
        </div>
        
        <div className="border-b border-white/10 px-5 py-3.5">
          <div className="text-sm font-semibold text-white">{userName}</div>
          <div className="font-mono text-[10px] uppercase tracking-wide text-amber">
            {roleLabel}
            {scopeLabel ? ` · ${scopeLabel}` : ""}
          </div>
          <div className="font-mono text-[10px] text-steelLight">Legajo {legajo}</div>
        </div>
        
        <nav className="flex-1 overflow-y-auto p-2.5">
          {items.map((it) => {
            const active = pathname === it.href;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                className={`mb-0.5 flex items-center gap-2.5 rounded-md px-3 py-2.5 font-display text-[13px] uppercase tracking-wide transition-colors ${
                  active ? "bg-brand text-white" : "text-steelLight hover:bg-white/5 hover:text-white"
                }`}
              >
                {/* Renderizamos el icono si existe */}
                {it.icon && (
                  <div className={`flex items-center justify-center ${active ? "text-white" : "text-steelLight opacity-70"}`}>
                    {it.icon}
                  </div>
                )}
                
                <span className="flex-1">{it.label}</span>
                
                {!!it.badge && (
                  <span className="rounded-full bg-amber px-1.5 py-0.5 font-mono text-[10px] text-charcoal font-bold">
                    {it.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        
        <div className="border-t border-white/10 px-5 py-3.5">
          <button
            onClick={logout}
            className="flex w-full items-center gap-2.5 font-mono text-xs uppercase tracking-wide text-steelLight transition-colors hover:text-white"
          >
            <LogOut size={16} />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}
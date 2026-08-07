import { redirect } from "next/navigation";
import { getCurrentProfile, ROLE_LABELS } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { Sidebar, type NavItem } from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import {
  LayoutGrid,
  Building2,
  Users,
  ClipboardList,
  ShieldCheck,
  Boxes,
  Bell,
  Star,
  Settings,
  History,
} from "lucide-react";

async function pendingValidationsCount() {
  const supabase = createServerSupabase();
  // RLS ya limita esto a las subsecciones que el usuario puede gestionar.
  const { count } = await supabase
    .from("tasks")
    .select("id, task_statuses!inner(code)", { count: "exact", head: true })
    .eq("task_statuses.code", "pendiente_validacion");
  return count || 0;
}

const ICON = {
  home: <LayoutGrid className="h-4 w-4" />,
  sections: <Building2 className="h-4 w-4" />,
  users: <Users className="h-4 w-4" />,
  tasks: <ClipboardList className="h-4 w-4" />,
  validations: <ShieldCheck className="h-4 w-4" />,
  inventory: <Boxes className="h-4 w-4" />,
  alerts: <Bell className="h-4 w-4" />,
  scores: <Star className="h-4 w-4" />,
  config: <Settings className="h-4 w-4" />,
  history: <History className="h-4 w-4" />,
};

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");

  const pv = ["admin", "encargado_seccion", "encargado_subseccion"].includes(profile.role_code)
    ? await pendingValidationsCount()
    : 0;

  let items: NavItem[] = [];
  if (profile.role_code === "admin") {
    items = [
      { href: "/", label: "Inicio", icon: ICON.home },
      { href: "/admin/sections", label: "Secciones", icon: ICON.sections },
      { href: "/admin/users", label: "Usuarios", icon: ICON.users },
      { href: "/tasks", label: "Gestión de Tareas", icon: ICON.tasks },
      { href: "/validations", label: "Validaciones", badge: pv, icon: ICON.validations },
      { href: "/inventory", label: "Inventario", icon: ICON.inventory },
      { href: "/alerts", label: "Novedades", icon: ICON.alerts },
      { href: "/scores", label: "Puntajes", icon: ICON.scores },
      { href: "/admin/config", label: "Configuración", icon: ICON.config },
      { href: "/history", label: "Historial", icon: ICON.history },
    ];
  } else if (profile.role_code === "encargado_seccion") {
    items = [
      { href: "/", label: "Mi Área", icon: ICON.home },
      { href: "/tasks", label: "Gestión de Tareas", icon: ICON.tasks },
      { href: "/validations", label: "Validaciones", badge: pv, icon: ICON.validations },
      { href: "/inventory", label: "Inventario", icon: ICON.inventory },
      { href: "/alerts", label: "Novedades", icon: ICON.alerts },
      { href: "/scores", label: "Puntajes", icon: ICON.scores },
      { href: "/history", label: "Historial", icon: ICON.history },
    ];
  } else if (profile.role_code === "encargado_subseccion") {
    items = [
      { href: "/", label: "Mi Subsección", icon: ICON.home },
      { href: "/tasks", label: "Gestión de Tareas", icon: ICON.tasks },
      { href: "/validations", label: "Validaciones", badge: pv, icon: ICON.validations },
      { href: "/inventory", label: "Inventario", icon: ICON.inventory },
      { href: "/alerts", label: "Novedades", icon: ICON.alerts },
      { href: "/scores", label: "Puntajes", icon: ICON.scores },
      { href: "/history", label: "Historial", icon: ICON.history },
    ];
  } else {
    items = [
      { href: "/", label: "Mis Tareas", icon: ICON.home },
      { href: "/scores", label: "Mi Puntaje", icon: ICON.scores },
      { href: "/history", label: "Mi Historial", icon: ICON.history },
    ];
  }

  return (
    <ToastProvider>
      <div className="flex min-h-screen">
        <Sidebar
          items={items}
          userName={profile.full_name}
          roleLabel={ROLE_LABELS[profile.role_code]}
          legajo={profile.legajo}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <main className="flex-1 px-4 py-4 md:px-6 md:py-5">{children}</main>
        </div>
      </div>
    </ToastProvider>
  );
}

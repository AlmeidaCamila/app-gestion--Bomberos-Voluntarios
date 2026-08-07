-- ============================================================
-- 0005_inventory.sql
-- Módulo de Inventario de Unidades. Reutiliza roles, secciones,
-- tareas, historial (task_submissions/validations) y configuración
-- ya existentes — no duplica lógica de asignación ni de validación.
-- ============================================================

-- ---------- Unidades del cuartel (vehículos/puestos) ----------
create table public.units (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  name text not null,               -- ej: "Unidad 17", "Autobomba 1"
  code text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Vincula una tarea con la unidad que debe revisar (además del campo
-- de texto libre `unit` que ya existía, que queda para casos sin
-- unidad estructurada, ej. "cocina").
alter table public.tasks add column unit_id uuid references public.units(id) on delete set null;

-- ---------- Catálogo de elementos (administrable, global) ----------
create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- ej: "Manguera 45 mm"
  category text,                      -- ej: "Mangueras", opcional, libre
  -- columnas pensadas para evolución futura (no usadas por la UI todavía):
  track_serial boolean not null default false,   -- ¿este ítem se controla por n° de serie?
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Estados de un elemento (config-driven, mismo patrón que task_statuses) ----------
create table public.item_states (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- 'correcto','faltante','danado','requiere_mantenimiento'
  name text not null,
  requires_alert boolean not null default false,
  color text not null default '#5b6470',
  sort_order int not null default 0
);

-- ---------- Inventario por unidad (qué elementos y cuántos tiene CADA unidad) ----------
create table public.unit_inventory (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references public.units(id) on delete cascade,
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  quantity int not null default 1,
  -- columnas pensadas para evolución futura (QR/código de barras/vencimientos/n° de serie):
  qr_code text,
  barcode text,
  serial_number text,
  expires_at date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (unit_id, item_id)
);
create trigger trg_unit_inventory_updated before update on public.unit_inventory for each row execute function public.set_updated_at();
create trigger trg_units_updated before update on public.units for each row execute function public.set_updated_at();

-- ---------- Revisión de inventario (una por cada vez que un bombero revisa una unidad) ----------
-- Se ata a la MISMA task_submission que ya usa el flujo normal de tareas,
-- así la aprobación/rechazo la sigue haciendo validate_submission() sin
-- lógica nueva.
create table public.inventory_reviews (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  submission_id uuid references public.task_submissions(id) on delete cascade,
  reviewed_by uuid not null references public.profiles(id),
  reviewed_at timestamptz not null default now()
);

-- ---------- Resultado de cada elemento dentro de una revisión ----------
create table public.inventory_review_items (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.inventory_reviews(id) on delete cascade,
  unit_inventory_id uuid not null references public.unit_inventory(id) on delete cascade,
  state_id uuid not null references public.item_states(id),
  observations text,
  created_at timestamptz not null default now()
);

-- ---------- Novedades / alertas automáticas ----------
create table public.inventory_alerts (
  id uuid primary key default gen_random_uuid(),
  review_item_id uuid not null references public.inventory_review_items(id) on delete cascade,
  unit_id uuid not null references public.units(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  status text not null default 'abierta' check (status in ('abierta','resuelta')),
  created_at timestamptz not null default now(),
  resolved_by uuid references public.profiles(id),
  resolved_at timestamptz,
  resolution_note text
);

-- ---------- Movimientos de inventario ----------
-- Tabla lista para la funcionalidad futura de transferencias entre
-- unidades / stock central. No la usa ninguna pantalla todavía.
create table public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id),
  from_unit_id uuid references public.units(id),
  to_unit_id uuid references public.units(id),
  quantity int not null default 1,
  movement_type text not null default 'transferencia', -- 'transferencia','alta','baja','stock_central'
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index idx_units_section on public.units(section_id);
create index idx_unit_inventory_unit on public.unit_inventory(unit_id);
create index idx_inventory_reviews_task on public.inventory_reviews(task_id);
create index idx_inventory_reviews_unit on public.inventory_reviews(unit_id);
create index idx_review_items_review on public.inventory_review_items(review_id);
create index idx_alerts_section_status on public.inventory_alerts(section_id, status);

create trigger trg_audit_units after insert or update or delete on public.units for each row execute function public.write_audit();
create trigger trg_audit_unit_inventory after insert or update or delete on public.unit_inventory for each row execute function public.write_audit();
create trigger trg_audit_alerts after update on public.inventory_alerts for each row execute function public.write_audit();

-- ============================================================
-- Trigger: al registrar el resultado de un elemento, si el estado
-- requiere alerta, generar automáticamente la novedad.
-- ============================================================
create or replace function public.on_review_item_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_requires_alert boolean;
  v_unit_id uuid;
  v_section_id uuid;
begin
  select requires_alert into v_requires_alert from public.item_states where id = new.state_id;
  if v_requires_alert then
    select ir.unit_id, u.section_id into v_unit_id, v_section_id
    from public.inventory_reviews ir
    join public.units u on u.id = ir.unit_id
    where ir.id = new.review_id;

    insert into public.inventory_alerts(review_item_id, unit_id, section_id, status)
    values (new.id, v_unit_id, v_section_id, 'abierta');
  end if;
  return new;
end;
$$;
create trigger trg_review_item_alert after insert on public.inventory_review_items for each row execute function public.on_review_item_created();

-- ============================================================
-- Función central: enviar una revisión de inventario a validación.
-- Reutiliza submit_task() para no duplicar la lógica de "entrega".
-- ============================================================
create or replace function public.submit_inventory_review(
  p_task_id uuid,
  p_unit_id uuid,
  p_observations text,
  p_items jsonb  -- [{ "unit_inventory_id": "...", "state_code": "correcto", "observations": "..." }, ...]
)
returns public.inventory_reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.task_submissions;
  v_review public.inventory_reviews;
  v_item jsonb;
  v_state_id uuid;
begin
  -- 1. Entrega estándar (misma tabla/flujo que cualquier otra tarea)
  select public.submit_task(p_task_id, p_observations) into v_submission;

  -- 2. Revisión de inventario ligada a esa misma entrega
  insert into public.inventory_reviews(task_id, unit_id, submission_id, reviewed_by)
  values (p_task_id, p_unit_id, v_submission.id, auth.uid())
  returning * into v_review;

  -- 3. Resultado de cada elemento
  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select id into v_state_id from public.item_states where code = (v_item->>'state_code');
    insert into public.inventory_review_items(review_id, unit_inventory_id, state_id, observations)
    values (v_review.id, (v_item->>'unit_inventory_id')::uuid, v_state_id, v_item->>'observations');
  end loop;

  return v_review;
end;
$$;

-- ============================================================
-- Función: resolver una novedad
-- ============================================================
create or replace function public.resolve_alert(p_alert_id uuid, p_note text)
returns public.inventory_alerts
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alert public.inventory_alerts;
  v_section_id uuid;
begin
  select section_id into v_section_id from public.inventory_alerts where id = p_alert_id;
  if not public.can_manage_inventory(v_section_id) then
    raise exception 'no autorizado para resolver esta novedad';
  end if;

  update public.inventory_alerts set
    status = 'resuelta',
    resolved_by = auth.uid(),
    resolved_at = now(),
    resolution_note = p_note
  where id = p_alert_id
  returning * into v_alert;
  return v_alert;
end;
$$;

-- ============================================================
-- Seed: estados de elemento (config, no es "dato de ejemplo" del
-- inventario en sí — es el mismo tipo de catálogo que task_statuses).
-- ============================================================
insert into public.item_states (code, name, requires_alert, color, sort_order) values
  ('correcto', 'Correcto', false, '#2f7d54', 1),
  ('faltante', 'Faltante', true, '#c62828', 2),
  ('danado', 'Dañado', true, '#c62828', 3),
  ('requiere_mantenimiento', 'Requiere mantenimiento', true, '#d99a1b', 4);

-- ============================================================
-- RLS
-- ============================================================
alter table public.units enable row level security;
alter table public.inventory_items enable row level security;
alter table public.item_states enable row level security;
alter table public.unit_inventory enable row level security;
alter table public.inventory_reviews enable row level security;
alter table public.inventory_review_items enable row level security;
alter table public.inventory_alerts enable row level security;
alter table public.inventory_movements enable row level security;

-- Encargado de Área o Subencargado de esa sección (subencargado hereda
-- la sección a través de su subsección) — igual que pide el pedido:
-- "El Encargado de Área y el Subencargado podrán administrar".
create or replace function public.can_manage_inventory(p_section_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select
    public.is_admin()
    or (public.current_role_code() = 'encargado_seccion'
        and p_section_id = (select section_id from public.profiles where id = auth.uid()))
    or (public.current_role_code() = 'encargado_subseccion'
        and p_section_id = (select sd.section_id from public.subsections sd
                             join public.profiles p on p.subsection_id = sd.id
                             where p.id = auth.uid()));
$$;

-- catálogo de elementos: lectura para todos, escritura solo admin
create policy "items_read" on public.inventory_items for select using (auth.role() = 'authenticated');
create policy "items_write_admin" on public.inventory_items for all using (public.is_admin()) with check (public.is_admin());
create policy "item_states_read" on public.item_states for select using (auth.role() = 'authenticated');
create policy "item_states_write_admin" on public.item_states for all using (public.is_admin()) with check (public.is_admin());

-- unidades
create policy "units_read" on public.units for select using (auth.role() = 'authenticated');
create policy "units_write" on public.units for all using (public.can_manage_inventory(section_id)) with check (public.can_manage_inventory(section_id));

-- inventario por unidad
create policy "unit_inventory_read" on public.unit_inventory for select using (auth.role() = 'authenticated');
create policy "unit_inventory_write" on public.unit_inventory for all using (
  public.can_manage_inventory((select section_id from public.units where id = unit_id))
) with check (
  public.can_manage_inventory((select section_id from public.units where id = unit_id))
);

-- revisiones: el bombero ve/crea las propias; encargados ven las de su alcance
create policy "reviews_select" on public.inventory_reviews for select using (
  reviewed_by = auth.uid()
  or unit_id in (select id from public.units where public.can_manage_inventory(section_id))
);
create policy "reviews_insert_own" on public.inventory_reviews for insert with check (reviewed_by = auth.uid());

create policy "review_items_select" on public.inventory_review_items for select using (
  review_id in (select id from public.inventory_reviews where
    reviewed_by = auth.uid() or unit_id in (select id from public.units where public.can_manage_inventory(section_id))
  )
);
create policy "review_items_insert" on public.inventory_review_items for insert with check (
  review_id in (select id from public.inventory_reviews where reviewed_by = auth.uid())
);

-- novedades: gestionables por encargados de la sección; el trigger las crea (security definer)
create policy "alerts_select" on public.inventory_alerts for select using (public.can_manage_inventory(section_id));
create policy "alerts_update" on public.inventory_alerts for update using (public.can_manage_inventory(section_id)) with check (public.can_manage_inventory(section_id));

-- movimientos (futuro): mismo criterio que unidades
create policy "movements_read" on public.inventory_movements for select using (auth.role() = 'authenticated');
create policy "movements_write" on public.inventory_movements for insert with check (
  public.can_manage_inventory((select section_id from public.units where id = coalesce(from_unit_id, to_unit_id)))
);

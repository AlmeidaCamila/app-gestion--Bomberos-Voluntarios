-- ============================================================
-- 0001_schema.sql
-- Esquema completo: usuarios, roles, secciones, tareas,
-- asignaciones, validaciones, puntuación, configuración y auditoría.
-- ============================================================
create extension if not exists "pgcrypto";

-- ---------- ROLES ----------
create table public.roles (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,           -- 'admin' | 'encargado_seccion' | 'encargado_subseccion' | 'bombero'
  name text not null,
  created_at timestamptz not null default now()
);

-- ---------- PERFILES (extiende auth.users) ----------
-- El login se hace por legajo + contraseña. Internamente Supabase Auth
-- requiere un email; usamos uno sintético `${legajo}@cuartel.local`
-- (ver src/lib/auth.ts). El cifrado de contraseñas lo maneja Supabase Auth
-- (bcrypt), nunca se guarda ni se ve en texto plano desde la app.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  legajo text unique not null,
  full_name text not null,
  role_id uuid not null references public.roles(id),
  section_id uuid,        -- FK agregada más abajo (orden de creación de tablas)
  subsection_id uuid,     -- FK agregada más abajo
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- SECCIONES / SUBSECCIONES ----------
create table public.sections (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default 'flame',
  encargado_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.subsections (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.sections(id) on delete cascade,
  name text not null,
  encargado_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_section_fk foreign key (section_id) references public.sections(id) on delete set null,
  add constraint profiles_subsection_fk foreign key (subsection_id) references public.subsections(id) on delete set null;

-- ---------- CONFIGURACIÓN: catálogos editables (nunca fijos en código) ----------
create table public.task_statuses (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- 'pendiente','en_proceso','pendiente_validacion','finalizada'
  name text not null,
  sort_order int not null default 0,
  is_terminal boolean not null default false
);

create table public.priorities (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,          -- 'baja','media','alta','critica'
  name text not null,
  score_multiplier numeric not null default 1,
  color text not null default '#5b6470',
  sort_order int not null default 0
);

create table public.task_frequencies (
  id uuid primary key default gen_random_uuid(),
  days int unique not null,
  label text not null,
  active boolean not null default true,
  sort_order int not null default 0
);

create table public.performance_levels (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  min_points int not null,
  max_points int,                     -- null = sin límite superior
  color text not null default '#d99a1b',
  sort_order int not null default 0
);

create table public.scoring_config (
  id uuid primary key default gen_random_uuid(),
  points_approved int not null default 10,
  points_rejected int not null default -3,
  points_early_bonus int not null default 2,
  points_overdue_penalty int not null default -5,
  active boolean not null default true,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

create table public.general_settings (
  key text primary key,
  value jsonb not null,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

-- ---------- TAREAS ----------
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  subsection_id uuid not null references public.subsections(id) on delete cascade,
  unit text,                                          -- unidad o destino (opcional)
  priority_id uuid not null references public.priorities(id),
  type text not null check (type in ('unica','ciclica')),
  frequency_days int references public.task_frequencies(days),
  status_id uuid not null references public.task_statuses(id),
  assigned_bombero_id uuid references public.profiles(id) on delete set null,
  assigned_at timestamptz,
  assigned_by uuid references public.profiles(id),
  due_date timestamptz,                                -- vencimiento semanal
  last_executed_at timestamptz,
  next_execution_at timestamptz,                        -- próxima aparición (tareas cíclicas)
  last_rejection_reason text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- ASIGNACIONES (auditoría de cada asignación/reasignación) ----------
create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  bombero_id uuid not null references public.profiles(id),
  assigned_by uuid not null references public.profiles(id),
  assigned_at timestamptz not null default now(),
  due_date timestamptz,
  note text
);

-- ---------- ENTREGAS (cuando el bombero marca finalizada) ----------
create table public.task_submissions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  assignment_id uuid references public.assignments(id) on delete set null,
  bombero_id uuid not null references public.profiles(id),
  submitted_at timestamptz not null default now(),
  observations text,
  created_at timestamptz not null default now()
);

-- ---------- VALIDACIONES ----------
create table public.validations (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.task_submissions(id) on delete cascade,
  validator_id uuid not null references public.profiles(id),
  decision text not null check (decision in ('aprobada','rechazada')),
  rejection_reason text,
  validated_at timestamptz not null default now(),
  points_awarded int not null default 0
);

-- ---------- PUNTAJES (materializado por bombero + sección) ----------
create table public.scores (
  id uuid primary key default gen_random_uuid(),
  bombero_id uuid not null references public.profiles(id) on delete cascade,
  section_id uuid not null references public.sections(id) on delete cascade,
  points int not null default 0,
  tasks_assigned int not null default 0,
  tasks_completed int not null default 0,
  tasks_approved int not null default 0,
  tasks_rejected int not null default 0,
  updated_at timestamptz not null default now(),
  unique (bombero_id, section_id)
);

-- ---------- AUDITORÍA (todas las acciones relevantes) ----------
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,             -- ej: 'task.create','task.assign','validation.approve'
  entity text not null,             -- ej: 'tasks','profiles','sections'
  entity_id uuid,
  metadata jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);

-- ---------- Índices ----------
create index idx_profiles_section on public.profiles(section_id);
create index idx_profiles_subsection on public.profiles(subsection_id);
create index idx_subsections_section on public.subsections(section_id);
create index idx_tasks_subsection on public.tasks(subsection_id);
create index idx_tasks_assigned_bombero on public.tasks(assigned_bombero_id);
create index idx_tasks_status on public.tasks(status_id);
create index idx_submissions_task on public.task_submissions(task_id);
create index idx_validations_submission on public.validations(submission_id);
create index idx_scores_bombero_section on public.scores(bombero_id, section_id);
create index idx_audit_actor on public.audit_log(actor_id);
create index idx_audit_entity on public.audit_log(entity, entity_id);

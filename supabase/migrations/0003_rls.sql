-- ============================================================
-- 0003_rls.sql
-- Row Level Security: toda la autorización se valida en el
-- servidor (Postgres), no solo en la UI.
-- ============================================================
alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.sections enable row level security;
alter table public.subsections enable row level security;
alter table public.task_statuses enable row level security;
alter table public.priorities enable row level security;
alter table public.task_frequencies enable row level security;
alter table public.performance_levels enable row level security;
alter table public.scoring_config enable row level security;
alter table public.general_settings enable row level security;
alter table public.tasks enable row level security;
alter table public.assignments enable row level security;
alter table public.task_submissions enable row level security;
alter table public.validations enable row level security;
alter table public.scores enable row level security;
alter table public.audit_log enable row level security;

-- ---------- Catálogos de solo-lectura para cualquier usuario autenticado ----------
create policy "roles_read" on public.roles for select using (auth.role() = 'authenticated');
create policy "statuses_read" on public.task_statuses for select using (auth.role() = 'authenticated');
create policy "priorities_read" on public.priorities for select using (auth.role() = 'authenticated');
create policy "frequencies_read" on public.task_frequencies for select using (auth.role() = 'authenticated');
create policy "levels_read" on public.performance_levels for select using (auth.role() = 'authenticated');
create policy "scoring_config_read" on public.scoring_config for select using (auth.role() = 'authenticated');
create policy "general_settings_read" on public.general_settings for select using (auth.role() = 'authenticated');

-- solo admin puede escribir configuración
create policy "statuses_write" on public.task_statuses for all using (public.is_admin()) with check (public.is_admin());
create policy "priorities_write" on public.priorities for all using (public.is_admin()) with check (public.is_admin());
create policy "frequencies_write" on public.task_frequencies for all using (public.is_admin()) with check (public.is_admin());
create policy "levels_write" on public.performance_levels for all using (public.is_admin()) with check (public.is_admin());
create policy "scoring_config_write" on public.scoring_config for all using (public.is_admin()) with check (public.is_admin());
create policy "general_settings_write" on public.general_settings for all using (public.is_admin()) with check (public.is_admin());
create policy "roles_write" on public.roles for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Perfiles ----------
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or (public.current_role_code() = 'encargado_seccion' and section_id = (select section_id from public.profiles where id = auth.uid()))
  or (public.current_role_code() = 'encargado_subseccion' and subsection_id = (select subsection_id from public.profiles where id = auth.uid()))
);
create policy "profiles_write_admin" on public.profiles for all using (public.is_admin()) with check (public.is_admin());
create policy "profiles_update_self" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- ---------- Secciones ----------
create policy "sections_read" on public.sections for select using (auth.role() = 'authenticated');
create policy "sections_write_admin" on public.sections for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Subsecciones ----------
create policy "subsections_read" on public.subsections for select using (auth.role() = 'authenticated');
create policy "subsections_write" on public.subsections for all using (
  public.is_admin() or id in (select public.manageable_subsection_ids())
  or (public.current_role_code() = 'encargado_seccion' and section_id = (select section_id from public.profiles where id = auth.uid()))
) with check (
  public.is_admin()
  or (public.current_role_code() = 'encargado_seccion' and section_id = (select section_id from public.profiles where id = auth.uid()))
);

-- ---------- Tareas ----------
create policy "tasks_select" on public.tasks for select using (
  subsection_id in (select public.visible_subsection_ids())
);
create policy "tasks_write" on public.tasks for all using (
  subsection_id in (select public.manageable_subsection_ids())
) with check (
  subsection_id in (select public.manageable_subsection_ids())
);

-- ---------- Asignaciones ----------
create policy "assignments_select" on public.assignments for select using (
  bombero_id = auth.uid()
  or task_id in (select id from public.tasks where subsection_id in (select public.visible_subsection_ids()))
);
create policy "assignments_insert" on public.assignments for insert with check (
  task_id in (select id from public.tasks where subsection_id in (select public.manageable_subsection_ids()))
);

-- ---------- Entregas (task_submissions) ----------
create policy "submissions_select" on public.task_submissions for select using (
  bombero_id = auth.uid()
  or task_id in (select id from public.tasks where subsection_id in (select public.visible_subsection_ids()))
);
create policy "submissions_insert_own" on public.task_submissions for insert with check (
  bombero_id = auth.uid()
  and task_id in (select id from public.tasks where assigned_bombero_id = auth.uid())
);

-- ---------- Validaciones ----------
create policy "validations_select" on public.validations for select using (
  submission_id in (select id from public.task_submissions where
    bombero_id = auth.uid()
    or task_id in (select id from public.tasks where subsection_id in (select public.visible_subsection_ids()))
  )
);
create policy "validations_insert" on public.validations for insert with check (
  submission_id in (select id from public.task_submissions where task_id in (
    select id from public.tasks where subsection_id in (select public.manageable_subsection_ids())
  ))
);

-- ---------- Puntajes ----------
create policy "scores_select" on public.scores for select using (
  bombero_id = auth.uid()
  or public.is_admin()
  or (public.current_role_code() = 'encargado_seccion' and section_id = (select section_id from public.profiles where id = auth.uid()))
  or (public.current_role_code() = 'encargado_subseccion' and bombero_id in (
        select id from public.profiles where subsection_id = (select subsection_id from public.profiles where id = auth.uid())
     ))
);
-- Los puntajes solo se escriben desde validate_submission() (security definer). Sin policy de insert/update para clientes.

-- ---------- Auditoría: solo administradores ----------
create policy "audit_select_admin" on public.audit_log for select using (public.is_admin());

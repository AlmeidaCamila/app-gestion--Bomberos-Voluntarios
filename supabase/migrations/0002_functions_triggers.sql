-- ============================================================
-- 0002_functions_triggers.sql
-- Funciones helper para RLS, triggers de updated_at, auditoría
-- automática y la función central de validación (aprobar/rechazar).
-- ============================================================

-- ---------- Helper: perfil del usuario autenticado ----------
create or replace function public.current_profile()
returns public.profiles
language sql stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

create or replace function public.current_role_code()
returns text
language sql stable
security definer
set search_path = public
as $$
  select r.code from public.profiles p
  join public.roles r on r.id = p.role_id
  where p.id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select public.current_role_code() = 'admin';
$$;

-- subsecciones que el usuario actual puede gestionar (según su rol)
create or replace function public.manageable_subsection_ids()
returns setof uuid
language sql stable
security definer
set search_path = public
as $$
  select sd.id from public.subsections sd
  join public.profiles p on p.id = auth.uid()
  join public.roles r on r.id = p.role_id
  where
    r.code = 'admin'
    or (r.code = 'encargado_seccion' and sd.section_id = p.section_id)
    or (r.code = 'encargado_subseccion' and sd.id = p.subsection_id);
$$;

-- subsecciones visibles (lectura) para el usuario actual, incluye alcance de bombero
create or replace function public.visible_subsection_ids()
returns setof uuid
language sql stable
security definer
set search_path = public
as $$
  select sd.id from public.subsections sd
  join public.profiles p on p.id = auth.uid()
  join public.roles r on r.id = p.role_id
  where
    r.code = 'admin'
    or (r.code = 'encargado_seccion' and sd.section_id = p.section_id)
    or (r.code = 'encargado_subseccion' and sd.id = p.subsection_id)
    or (r.code = 'bombero' and (sd.id = p.subsection_id or (p.subsection_id is null and sd.section_id = p.section_id)));
$$;

-- ---------- updated_at automático ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_sections_updated before update on public.sections for each row execute function public.set_updated_at();
create trigger trg_subsections_updated before update on public.subsections for each row execute function public.set_updated_at();
create trigger trg_tasks_updated before update on public.tasks for each row execute function public.set_updated_at();

-- ---------- Auditoría automática ----------
create or replace function public.write_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_action text;
begin
  v_action := lower(TG_TABLE_NAME) || '.' || lower(TG_OP);
  insert into public.audit_log(actor_id, action, entity, entity_id, metadata)
  values (
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    coalesce(new.id, old.id),
    jsonb_build_object('old', to_jsonb(old), 'new', to_jsonb(new))
  );
  return coalesce(new, old);
end;
$$;

create trigger trg_audit_tasks after insert or update or delete on public.tasks for each row execute function public.write_audit();
create trigger trg_audit_profiles after insert or update or delete on public.profiles for each row execute function public.write_audit();
create trigger trg_audit_sections after insert or update or delete on public.sections for each row execute function public.write_audit();
create trigger trg_audit_subsections after insert or update or delete on public.subsections for each row execute function public.write_audit();
create trigger trg_audit_validations after insert on public.validations for each row execute function public.write_audit();
create trigger trg_audit_assignments after insert on public.assignments for each row execute function public.write_audit();

-- ============================================================
-- Función central: asignar tarea
-- ============================================================
create or replace function public.assign_task(p_task_id uuid, p_bombero_id uuid)
returns public.tasks
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task public.tasks;
  v_status_pendiente uuid;
begin
  select id into v_status_pendiente from public.task_statuses where code = 'pendiente';

  insert into public.assignments(task_id, bombero_id, assigned_by, due_date)
  values (p_task_id, p_bombero_id, auth.uid(), now() + interval '7 days');

  update public.tasks set
    assigned_bombero_id = p_bombero_id,
    assigned_at = now(),
    assigned_by = auth.uid(),
    due_date = now() + interval '7 days',
    status_id = case when status_id = (select id from public.task_statuses where code='finalizada') then v_status_pendiente else status_id end
  where id = p_task_id
  returning * into v_task;

  return v_task;
end;
$$;

-- ============================================================
-- Función central: el bombero finaliza (envía a validación)
-- ============================================================
create or replace function public.submit_task(p_task_id uuid, p_observations text)
returns public.task_submissions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_submission public.task_submissions;
  v_status_revision uuid;
  v_assignment_id uuid;
begin
  select id into v_status_revision from public.task_statuses where code = 'pendiente_validacion';
  select id into v_assignment_id from public.assignments where task_id = p_task_id order by assigned_at desc limit 1;

  insert into public.task_submissions(task_id, assignment_id, bombero_id, observations)
  values (p_task_id, v_assignment_id, auth.uid(), p_observations)
  returning * into v_submission;

  update public.tasks set status_id = v_status_revision where id = p_task_id;

  return v_submission;
end;
$$;

-- ============================================================
-- Función central: aprobar / rechazar (dispara puntaje)
-- ============================================================
create or replace function public.validate_submission(p_submission_id uuid, p_decision text, p_rejection_reason text)
returns public.validations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_validation public.validations;
  v_submission public.task_submissions;
  v_task public.tasks;
  v_subsection public.subsections;
  v_priority public.priorities;
  v_cfg public.scoring_config;
  v_points int := 0;
  v_status_pendiente uuid;
  v_status_finalizada uuid;
  v_early boolean;
  v_overdue boolean;
begin
  if p_decision not in ('aprobada','rechazada') then
    raise exception 'decision inválida';
  end if;
  if p_decision = 'rechazada' and (p_rejection_reason is null or length(trim(p_rejection_reason)) = 0) then
    raise exception 'el motivo de rechazo es obligatorio';
  end if;

  select * into v_submission from public.task_submissions where id = p_submission_id;
  select * into v_task from public.tasks where id = v_submission.task_id;
  select * into v_subsection from public.subsections where id = v_task.subsection_id;
  select * into v_priority from public.priorities where id = v_task.priority_id;
  select * into v_cfg from public.scoring_config where active = true order by updated_at desc limit 1;

  select id into v_status_pendiente from public.task_statuses where code = 'pendiente';
  select id into v_status_finalizada from public.task_statuses where code = 'finalizada';

  v_overdue := v_task.due_date is not null and v_submission.submitted_at > v_task.due_date;
  v_early := v_task.due_date is not null and v_submission.submitted_at < v_task.due_date;

  if p_decision = 'aprobada' then
    v_points := round(coalesce(v_cfg.points_approved,10) * coalesce(v_priority.score_multiplier,1));
    if v_early then v_points := v_points + coalesce(v_cfg.points_early_bonus,0); end if;
    if v_overdue then v_points := v_points + coalesce(v_cfg.points_overdue_penalty,0); end if;
  else
    v_points := coalesce(v_cfg.points_rejected,-3);
  end if;

  insert into public.validations(submission_id, validator_id, decision, rejection_reason, points_awarded)
  values (p_submission_id, auth.uid(), p_decision, p_rejection_reason, v_points)
  returning * into v_validation;

  if p_decision = 'aprobada' then
    update public.tasks set
      last_executed_at = now(),
      last_rejection_reason = null,
      next_execution_at = case when type = 'ciclica' then now() + make_interval(days => frequency_days) else next_execution_at end,
      assigned_at = case when type = 'ciclica' then now() + make_interval(days => frequency_days) else assigned_at end,
      due_date = case when type = 'ciclica' then now() + make_interval(days => frequency_days) + interval '7 days' else due_date end,
      status_id = case when type = 'ciclica' then v_status_pendiente else v_status_finalizada end
    where id = v_task.id;
  else
    update public.tasks set
      status_id = v_status_pendiente,
      last_rejection_reason = p_rejection_reason,
      assigned_at = now(),
      due_date = now() + interval '7 days'
    where id = v_task.id;
  end if;

  -- actualizar puntaje materializado
  insert into public.scores(bombero_id, section_id, points, tasks_completed, tasks_approved, tasks_rejected)
  values (
    v_submission.bombero_id, v_subsection.section_id, greatest(v_points,0),
    1, case when p_decision='aprobada' then 1 else 0 end, case when p_decision='rechazada' then 1 else 0 end
  )
  on conflict (bombero_id, section_id) do update set
    points = public.scores.points + v_points,
    tasks_completed = public.scores.tasks_completed + 1,
    tasks_approved = public.scores.tasks_approved + case when p_decision='aprobada' then 1 else 0 end,
    tasks_rejected = public.scores.tasks_rejected + case when p_decision='rechazada' then 1 else 0 end,
    updated_at = now();

  return v_validation;
end;
$$;

-- mantener tasks_assigned al día cuando se crea una asignación
create or replace function public.on_assignment_created()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_section_id uuid;
begin
  select section_id into v_section_id from public.subsections sd
    join public.tasks t on t.subsection_id = sd.id where t.id = new.task_id;

  insert into public.scores(bombero_id, section_id, tasks_assigned)
  values (new.bombero_id, v_section_id, 1)
  on conflict (bombero_id, section_id) do update set
    tasks_assigned = public.scores.tasks_assigned + 1,
    updated_at = now();
  return new;
end;
$$;
create trigger trg_assignment_created after insert on public.assignments for each row execute function public.on_assignment_created();

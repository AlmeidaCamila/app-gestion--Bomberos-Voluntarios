-- ============================================================
-- 0010_block_reassign_in_review.sql
-- Una vez que un bombero entrega una tarea y queda en
-- "pendiente_validacion", ya tiene una entrega/historial de trabajo
-- ligada a esa asignación. Reasignarla a otra persona en ese estado
-- pisaría ese contexto, así que se bloquea hasta que se apruebe o
-- rechace la entrega (validate_submission ya vuelve a dejar la tarea
-- en 'pendiente' o 'finalizada', momento en el que se puede reasignar
-- de nuevo con normalidad).
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
  v_current_status_code text;
begin
  if not exists (
    select 1 from public.tasks
    where id = p_task_id and subsection_id in (select public.manageable_subsection_ids())
  ) then
    raise exception 'no autorizado para asignar esta tarea';
  end if;

  select ts.code into v_current_status_code
  from public.tasks t join public.task_statuses ts on ts.id = t.status_id
  where t.id = p_task_id;

  if v_current_status_code = 'pendiente_validacion' then
    raise exception 'la tarea está en revisión, no se puede reasignar hasta que se apruebe o rechace';
  end if;

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

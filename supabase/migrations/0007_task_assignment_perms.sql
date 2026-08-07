-- ============================================================
-- 0007_task_assignment_perms.sql
-- assign_task() es security definer y hasta ahora no validaba quién
-- la llama (a diferencia de can_manage_inventory() para novedades).
-- Encargados de Área y Subencargados ya pueden gestionar tareas de
-- sus subsecciones vía RLS en la tabla `tasks`, pero la función de
-- asignación central quedaba abierta a cualquier usuario autenticado.
-- Se agrega el mismo tipo de chequeo explícito que ya usa el módulo
-- de inventario, para que quede auditable y no dependa solo de que
-- la función bypasee RLS.
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
  if not exists (
    select 1 from public.tasks
    where id = p_task_id and subsection_id in (select public.manageable_subsection_ids())
  ) then
    raise exception 'no autorizado para asignar esta tarea';
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

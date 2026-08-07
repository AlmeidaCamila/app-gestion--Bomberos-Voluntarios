-- ============================================================
-- 0006_task_inventory_flag.sql
-- Una tarea puede tener una unidad asignada (ej. "limpiar la
-- unidad") sin que eso implique que también hay que revisar su
-- inventario. Se desacopla con un flag explícito.
-- ============================================================

alter table public.tasks
  add column requires_inventory_review boolean not null default false;

-- ============================================================
-- Fix: submit_inventory_review() enviaba la revisión con un error
-- "invalid input syntax for type uuid" porque `select
-- public.submit_task(...) into v_submission` no distribuye las
-- columnas del tipo compuesto devuelto por la función sobre la
-- variable de fila — deja el registro entero (como texto) en el
-- primer campo, que luego se usaba como si fuera v_submission.id.
-- La forma correcta de asignar el resultado de una función que
-- devuelve un tipo compuesto es con `:=`, no con `SELECT ... INTO`.
-- ============================================================
create or replace function public.submit_inventory_review(
  p_task_id uuid,
  p_unit_id uuid,
  p_observations text,
  p_items jsonb
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
  v_submission := public.submit_task(p_task_id, p_observations);

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

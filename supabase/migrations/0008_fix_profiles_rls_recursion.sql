-- ============================================================
-- 0008_fix_profiles_rls_recursion.sql
-- "profiles_select" consultaba public.profiles DESDE una policy
-- definida sobre public.profiles (para saber la sección/subsección
-- del que llama). Postgres no permite esa auto-referencia directa:
-- tira "infinite recursion detected in policy for relation
-- profiles". Como la app no revisaba `error` en esas consultas, el
-- fallo quedaba silencioso — la lista de bomberos quedaba vacía
-- para encargados y subencargados (admin no lo sufría porque su
-- rama de la policy corta antes, en is_admin()).
--
-- Se resuelve igual que ya se hace en el resto del esquema
-- (current_role_code(), is_admin(), manageable_subsection_ids()...):
-- envolviendo la sub-consulta en una función SECURITY DEFINER, que
-- no queda sujeta a RLS.
-- ============================================================

create or replace function public.same_section_as_caller(p_section_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select p_section_id is not null
    and p_section_id = (select section_id from public.profiles where id = auth.uid());
$$;

create or replace function public.same_subsection_as_caller(p_subsection_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select p_subsection_id is not null
    and p_subsection_id = (select subsection_id from public.profiles where id = auth.uid());
$$;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or (public.current_role_code() = 'encargado_seccion' and public.same_section_as_caller(section_id))
  or (public.current_role_code() = 'encargado_subseccion' and public.same_subsection_as_caller(subsection_id))
);

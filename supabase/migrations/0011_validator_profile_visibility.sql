-- ============================================================
-- 0011_validator_profile_visibility.sql
-- El historial muestra quién validó cada entrega
-- (validations.profiles:validator_id(full_name)), pero un bombero
-- solo podía leer su propio perfil vía RLS — el embed del validador
-- (un encargado, otra persona) quedaba bloqueado y PostgREST lo
-- devolvía en null, así que "Validado por" salía vacío.
--
-- Se agrega un permiso acotado: un usuario puede ver el perfil de
-- cualquiera que haya validado (aprobado/rechazado) una de sus
-- propias entregas — ni más ni menos que eso.
-- ============================================================
create or replace function public.validated_my_submission(p_profile_id uuid)
returns boolean
language sql stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.validations v
    join public.task_submissions ts on ts.id = v.submission_id
    where v.validator_id = p_profile_id and ts.bombero_id = auth.uid()
  );
$$;

drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or (public.current_role_code() = 'encargado_seccion' and public.same_section_as_caller(section_id))
  or (public.current_role_code() = 'encargado_subseccion' and public.same_subsection_as_caller(subsection_id))
  or public.validated_my_submission(id)
);

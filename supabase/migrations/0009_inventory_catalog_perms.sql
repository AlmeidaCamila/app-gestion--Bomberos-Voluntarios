-- ============================================================
-- 0009_inventory_catalog_perms.sql
-- El catálogo de elementos (inventory_items) estaba restringido a
-- solo Administrador. Encargados de Área y Subencargados ya pueden
-- crear unidades y cargar el inventario de cada unidad, pero no
-- podían dar de alta nuevos tipos de elemento en el catálogo — se
-- pide habilitarlo también para esos dos roles.
-- ============================================================
drop policy if exists "items_write_admin" on public.inventory_items;
create policy "items_write" on public.inventory_items for all using (
  public.is_admin() or public.current_role_code() in ('encargado_seccion', 'encargado_subseccion')
) with check (
  public.is_admin() or public.current_role_code() in ('encargado_seccion', 'encargado_subseccion')
);

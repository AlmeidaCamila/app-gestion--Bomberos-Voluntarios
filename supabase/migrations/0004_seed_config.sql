-- ============================================================
-- 0004_seed_config.sql
-- Datos de arranque: SOLO catálogos de configuración (roles,
-- estados, prioridades, frecuencias, niveles, parámetros).
-- NO se cargan secciones, subsecciones, tareas ni usuarios de
-- ejemplo — eso se hace desde la app, como pediste.
-- ============================================================

insert into public.roles (code, name) values
  ('admin', 'Administrador'),
  ('encargado_seccion', 'Encargado de Área'),
  ('encargado_subseccion', 'Subencargado'),
  ('bombero', 'Bombero');

insert into public.task_statuses (code, name, sort_order, is_terminal) values
  ('pendiente', 'Pendiente', 1, false),
  ('en_proceso', 'En proceso', 2, false),
  ('pendiente_validacion', 'Pendiente de validación', 3, false),
  ('finalizada', 'Finalizada', 4, true);

insert into public.priorities (code, name, score_multiplier, color, sort_order) values
  ('baja', 'Baja', 0.75, '#9aa3ad', 1),
  ('media', 'Media', 1.0, '#4478c6', 2),
  ('alta', 'Alta', 1.25, '#d99a1b', 3),
  ('critica', 'Crítica', 1.5, '#c62828', 4);

insert into public.task_frequencies (days, label, sort_order) values
  (7, 'Cada 7 días', 1),
  (15, 'Cada 15 días', 2),
  (30, 'Cada 30 días', 3),
  (90, 'Cada 90 días', 4);

insert into public.performance_levels (name, min_points, max_points, color, sort_order) values
  ('Inicial', 0, 100, '#9aa3ad', 1),
  ('Competente', 101, 300, '#4478c6', 2),
  ('Destacado', 301, 500, '#d99a1b', 3),
  ('Excelencia', 501, null, '#2f7d54', 4);

insert into public.scoring_config (points_approved, points_rejected, points_early_bonus, points_overdue_penalty, active) values
  (10, -3, 2, -5, true);

insert into public.general_settings (key, value, description) values
  ('operational_week_days', '7', 'Duración en días de la semana operativa'),
  ('due_alert_days_before', '2', 'Días antes del vencimiento para mostrar alertas'),
  ('history_retention_days', '365', 'Días que permanece una tarea visible en el historial'),
  ('max_observation_length', '500', 'Cantidad máxima de caracteres en observaciones');

-- ---------- Primer administrador ----------
-- Creá el usuario de Supabase Auth primero (ver README.md, paso 4),
-- después vinculá su perfil acá reemplazando el UUID:
--
-- insert into public.profiles (id, legajo, full_name, role_id, active)
-- values (
--   '00000000-0000-0000-0000-000000000000', -- uuid del usuario creado en Supabase Auth
--   '0001', 'Administrador',
--   (select id from public.roles where code = 'admin'),
--   true
-- );

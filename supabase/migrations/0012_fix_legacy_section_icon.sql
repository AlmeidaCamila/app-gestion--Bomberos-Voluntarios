-- ============================================================
-- 0012_fix_legacy_section_icon.sql
-- El default original de sections.icon era el string 'flame' (nombre
-- de ícono de lucide, de un diseño previo que nunca se implementó).
-- Ahora que el campo se edita como emoji real, ese texto quedaba
-- mostrado literalmente ("flam...", cortado por el maxLength del
-- input). Se corrigen las secciones existentes que todavía tengan
-- ese valor de placeholder.
-- ============================================================
update public.sections set icon = '🔥' where icon = 'flame';
alter table public.sections alter column icon set default '🔥';

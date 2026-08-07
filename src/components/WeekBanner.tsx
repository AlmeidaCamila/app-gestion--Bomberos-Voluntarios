function currentWeekRange() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const fmt = (d: Date) => d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" });
  return `${fmt(monday)} – ${fmt(sunday)}`;
}

export function WeekBanner() {
  return (
    <div className="mb-4 flex items-center gap-2 rounded-lg bg-charcoal px-3.5 py-2.5 font-mono text-[11px] uppercase tracking-wide text-white">
      📅 Semana actual: <b className="text-amber">{currentWeekRange()}</b>
    </div>
  );
}

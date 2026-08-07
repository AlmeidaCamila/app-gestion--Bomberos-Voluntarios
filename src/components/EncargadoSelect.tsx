"use client";

import { useState, useTransition } from "react";

export function EncargadoSelect({
  defaultValue,
  options,
  onAssign,
  placeholder = "— Sin asignar —",
  className,
}: {
  defaultValue: string;
  options: { id: string; full_name: string }[];
  onAssign: (encargadoId: string) => Promise<unknown>;
  placeholder?: string;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue);
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value;
        setValue(next);
        startTransition(async () => {
          await onAssign(next);
        });
      }}
      className={className || "w-full rounded-md border border-line bg-white px-3 py-2 text-sm text-charcoal outline-none focus:border-brand"}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.full_name}
        </option>
      ))}
    </select>
  );
}

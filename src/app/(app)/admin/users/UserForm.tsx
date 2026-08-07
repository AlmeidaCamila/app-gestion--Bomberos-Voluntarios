"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { createUserAction } from "./actions";
import { useToast } from "@/components/Toast";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-md bg-brand px-4 py-2.5 font-display text-xs font-bold uppercase text-white hover:bg-brand-dark disabled:opacity-60 md:col-span-2"
    >
      {pending ? "Creando..." : "Crear usuario"}
    </button>
  );
}

export default function UserForm({ sections, subsections }: { sections: any[]; subsections: any[] }) {
  const [selectedSection, setSelectedSection] = useState("");
  const [state, formAction] = useFormState(createUserAction, { error: null });
  const formRef = useRef<HTMLFormElement>(null);
  const submitCount = useRef(0);
  const showToast = useToast();

  const filteredSubsections = subsections.filter((s) => s.section_id === selectedSection);

  // Detecta una creación exitosa (error === null luego de un submit real, no
  // en el render inicial) para mostrar el toast y limpiar el formulario.
  useEffect(() => {
    if (submitCount.current === 0) {
      submitCount.current++;
      return;
    }
    if (state.error === null) {
      showToast("Usuario creado correctamente.");
      formRef.current?.reset();
      setSelectedSection("");
    } else {
      showToast(state.error, "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <div className="mb-6 rounded-xl border border-line bg-white p-5 shadow-sm">
      <h3 className="mb-3 font-display text-sm font-bold uppercase text-charcoal">Nuevo usuario</h3>

      <form
        ref={formRef}
        action={(fd) => {
          submitCount.current++;
          formAction(fd);
        }}
        className="grid grid-cols-1 gap-3 md:grid-cols-2"
      >
        <input name="legajo" placeholder="Legajo" required className="rounded-md border border-line px-3 py-2 text-sm" />
        <input name="full_name" placeholder="Nombre y apellido" required className="rounded-md border border-line px-3 py-2 text-sm" />
        <input name="password" type="password" placeholder="Contraseña" required className="rounded-md border border-line px-3 py-2 text-sm" />
        <select name="role_code" className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="bombero">Bombero</option>
          <option value="encargado_subseccion">Subencargado</option>
          <option value="encargado_seccion">Encargado de Área</option>
          <option value="admin">Administrador</option>
        </select>
        <select
          name="section_id"
          value={selectedSection}
          onChange={(e) => setSelectedSection(e.target.value)}
          className="rounded-md border border-line px-3 py-2 text-sm"
        >
          <option value="">— Sección —</option>
          {sections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <select name="subsection_id" className="rounded-md border border-line px-3 py-2 text-sm">
          <option value="">— Subsección —</option>
          {filteredSubsections.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>

        <SubmitButton />
      </form>
    </div>
  );
}

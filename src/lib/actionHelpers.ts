/**
 * Adaptador para usar una Server Action que devuelve datos (ej: {error})
 * directamente en el atributo `action` de un <form> nativo.
 *
 * React tipa `form.action` como `(formData: FormData) => void | Promise<void>`.
 * Nuestras Server Actions devuelven `{error: string | null}` para poder
 * mostrar mensajes de error — eso es útil con `useFormState`, pero rompe el
 * tipado cuando se las pasa "peladas" a un form sin capturar el resultado
 * (como en los toggles/eliminar rápidos de las tablas admin).
 *
 * `asFormAction` no cambia ningún comportamiento: solo tipa correctamente el
 * descarte intencional del valor de retorno para esos casos.
 */
export function asFormAction(
  action: (...args: any[]) => Promise<unknown>,
  ...boundArgs: any[]
): (formData: FormData) => Promise<void> {
  return async (formData: FormData) => {
    await action(...boundArgs, formData);
  };
}

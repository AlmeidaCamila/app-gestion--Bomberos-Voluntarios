/**
 * Adaptador para usar una Server Action que devuelve datos (ej: {error})
 * directamente en el atributo `action` de un <form> nativo, incluso con
 * argumentos adicionales "pegados" (ej: el id de la fila).
 *
 * Importante: usa `.bind()`, no una función nueva armada acá adentro
 * (`async (formData) => { await action(...) }`). Next.js solo reconoce una
 * Server Action al cruzar de Server a Client Component si la referencia
 * original se preserva — con `.bind()` se preserva, con una closure nueva
 * no, y eso tiraba "Functions cannot be passed directly to Client
 * Components" en producción (silencioso en dev, pero rompía el build
 * serverless igual).
 *
 * React tipa `form.action` como `(formData: FormData) => void | Promise<void>`;
 * nuestras Server Actions devuelven `{error: string | null}`, de ahí el cast.
 */
export function asFormAction(
  action: (...args: any[]) => Promise<unknown>,
  ...boundArgs: any[]
): (formData: FormData) => Promise<void> {
  return (action as (...args: any[]) => Promise<void>).bind(null, ...boundArgs);
}

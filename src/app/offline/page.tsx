/**
 * Fallback del service worker cuando no hay red. Fuera del grupo `(app)`
 * a propósito: el guard de sesión necesita la DB, y si estamos acá justamente
 * no hay con qué consultarla.
 */
export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">Sin conexión</h1>
      <p className="max-w-sm text-black/60 dark:text-white/60">
        GesTool trabaja contra la base de datos de la bodega, así que necesita red. Volvé a
        intentar cuando tengas señal.
      </p>
    </main>
  );
}

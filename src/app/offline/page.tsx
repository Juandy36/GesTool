/**
 * Fallback del service worker cuando no hay red. Fuera del grupo `(app)`
 * a propósito: el guard de sesión necesita la DB, y si estamos acá justamente
 * no hay con qué consultarla.
 */
import Icono from "@/app/iconos";

export default function OfflinePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-3.5 bg-surface-alt p-6 text-center">
      <span className="flex size-13 items-center justify-center rounded-[14px] border border-border bg-surface text-faint">
        <Icono nombre="sinRed" size={26} grosor={1.7} />
      </span>
      <h1 className="text-[15px] font-semibold">Sin conexión</h1>
      <p className="max-w-70 text-[12.5px] leading-relaxed text-muted">
        No se pudo conectar. GesTool trabaja contra la base de datos de la bodega, así que
        necesita red para mostrar datos actualizados.
      </p>
    </main>
  );
}

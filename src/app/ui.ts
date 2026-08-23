/**
 * Clases compartidas del rediseño. Están acá y no repetidas en cada vista
 * porque las seis tablas de la app son la misma tabla: si el alto de fila o el
 * borde cambian, cambian en un solo lugar.
 */
export const tabla = {
  marco: "overflow-x-auto rounded-[10px] border border-border",
  base: "w-full border-collapse text-left text-[12.5px]",
  encabezado: "border-b border-border bg-surface-alt",
  th: "px-3 py-[7px] text-[11.5px] font-semibold tracking-[0.03em] whitespace-nowrap text-muted uppercase",
  fila: "border-b border-border last:border-0",
  td: "px-3 py-[7px]",
  /** Celda de estado vacío: ocupa toda la tabla y va centrada. */
  vacio: "px-4 py-9 text-center",
};

export const btnPrimario =
  "inline-flex items-center justify-center gap-[7px] rounded-[7px] bg-invert px-3.5 py-2 text-[12.5px] font-medium text-invert-text disabled:opacity-50";

export const btnGhost =
  "inline-flex items-center justify-center gap-[7px] rounded-[7px] border border-border bg-surface px-3.5 py-2 text-[12.5px] font-medium text-text disabled:opacity-50";

export const campo =
  "rounded-[7px] border border-border bg-surface px-2.5 py-2 text-[13px] text-text";

export const campoChico =
  "rounded-md border border-border bg-surface px-2 py-1.5 text-xs text-text";

export const tarjeta = "rounded-[10px] border border-border bg-surface p-4";

export const etiqueta = "text-xs font-medium";

export const titulo = "text-xl font-semibold";

export const subtitulo = "text-[13.5px] font-semibold";

/** Aviso de error de un formulario. */
export const error = "text-[12.5px] text-danger";

/** Tarjeta centrada de /login y /cambiar-password. */
export const tarjetaAuth =
  "w-full max-w-[340px] rounded-xl border border-border bg-surface p-7 shadow-sm";

/** Fondo de las pantallas sin sesión: se despega la tarjeta del lienzo. */
export const fondoAuth = "flex min-h-dvh items-center justify-center bg-surface-alt p-6";

import { ETIQUETA_NIVEL, type NivelStock } from "@/lib/stock";

const COLOR: Record<NivelStock, string> = {
  CRITICO: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  BAJO: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  NORMAL: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

/** Semáforo del inventario. Vive fuera de `inventario/` porque el dashboard lo usa igual. */
export default function BadgeStock({ nivel }: { nivel: NivelStock }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLOR[nivel]}`}>
      {ETIQUETA_NIVEL[nivel]}
    </span>
  );
}

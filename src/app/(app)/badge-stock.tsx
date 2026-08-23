import { ETIQUETA_NIVEL, type NivelStock } from "@/lib/stock";

const COLOR: Record<NivelStock, string> = {
  CRITICO: "bg-danger-soft text-danger",
  BAJO: "bg-warn-soft text-warn",
  NORMAL: "bg-ok-soft text-ok",
};

/** Semáforo del inventario. Vive fuera de `inventario/` porque el dashboard lo usa igual. */
export default function BadgeStock({ nivel }: { nivel: NivelStock }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${COLOR[nivel]}`}
    >
      {ETIQUETA_NIVEL[nivel]}
    </span>
  );
}

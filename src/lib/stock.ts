export type NivelStock = "CRITICO" | "BAJO" | "NORMAL";

/**
 * Semáforo de stock. Se deriva siempre de `stock` vs los umbrales del ítem;
 * nunca es un campo guardado en la DB.
 */
export function nivelStock(item: {
  stock: number;
  umbralMinimo: number;
  umbralCritico: number;
}): NivelStock {
  if (item.stock <= item.umbralCritico) return "CRITICO";
  if (item.stock <= item.umbralMinimo) return "BAJO";
  return "NORMAL";
}

export const ETIQUETA_NIVEL: Record<NivelStock, string> = {
  CRITICO: "Crítico",
  BAJO: "Bajo mínimo",
  NORMAL: "Normal",
};

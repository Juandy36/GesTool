import type { Prisma } from "@/generated/prisma/client";

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

/**
 * Descuento atómico de stock. El `gte` es la verificación: si otra salida se
 * adelantó no actualiza ninguna fila y devuelve `false`, así que el inventario
 * nunca queda negativo. Un `SELECT` previo dejaría esa ventana abierta.
 */
export async function descontarStock(
  tx: Pick<Prisma.TransactionClient, "item">,
  itemId: string,
  cantidad: number,
): Promise<boolean> {
  const { count } = await tx.item.updateMany({
    where: { id: itemId, stock: { gte: cantidad } },
    data: { stock: { decrement: cantidad } },
  });
  return count > 0;
}

/**
 * Ítems activos en alerta: los que el semáforo marca BAJO o CRITICO, o sea
 * `stock <= umbralMinimo`. Es la misma frontera que `nivelStock`, escrita como
 * comparación entre columnas para contarlos sin traerlos todos.
 */
export async function contarBajoMinimo(db: Pick<Prisma.TransactionClient, "item">) {
  return db.item.count({
    where: { activo: true, stock: { lte: db.item.fields.umbralMinimo } },
  });
}

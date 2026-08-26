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
 *
 * `activo: true` va en el mismo `where` por lo mismo: la baja es lógica, la fila
 * sigue viva y la foreign key aguanta, así que sin esta condición un POST armado
 * a mano — o una pestaña vieja cuyo selector todavía lista el ítem — movía stock
 * de algo dado de baja. Ese ítem no sale ni en /inventario ni en el Excel (los
 * dos filtran `activo`), así que el desvío quedaba invisible para siempre.
 */
export async function descontarStock(
  tx: Pick<Prisma.TransactionClient, "item">,
  itemId: string,
  cantidad: number,
): Promise<boolean> {
  const { count } = await tx.item.updateMany({
    where: { id: itemId, activo: true, stock: { gte: cantidad } },
    data: { stock: { decrement: cantidad } },
  });
  return count > 0;
}

/** Contraparte para las entradas: mismo filtro por `activo`, sin tope de stock. */
export async function sumarStock(
  tx: Pick<Prisma.TransactionClient, "item">,
  itemId: string,
  cantidad: number,
): Promise<boolean> {
  const { count } = await tx.item.updateMany({
    where: { id: itemId, activo: true },
    data: { stock: { increment: cantidad } },
  });
  return count > 0;
}

/**
 * Ítems activos en alerta: los que el semáforo marca BAJO o CRITICO, o sea
 * `stock <= umbralMinimo`. Es la misma frontera que `nivelStock`, escrita como
 * comparación entre columnas para no traerlos todos a memoria.
 *
 * Va como filtro y no como consulta armada porque el header solo los cuenta y
 * el dashboard los lista: una sola definición de la frontera para los dos.
 */
export function enAlerta(db: Pick<Prisma.TransactionClient, "item">): Prisma.ItemWhereInput {
  return { activo: true, stock: { lte: db.item.fields.umbralMinimo } };
}

export async function contarBajoMinimo(db: Pick<Prisma.TransactionClient, "item">) {
  return db.item.count({ where: enAlerta(db) });
}

/**
 * Ítems en alerta ordenados por urgencia de reposición: los críticos primero
 * aunque falten pocas unidades (están por quedarse en cero) y dentro de cada
 * nivel, mayor faltante hasta el mínimo. Va en JS y no en SQL porque el
 * faltante es una resta entre columnas, y son los ítems en alerta nomás.
 */
export function porUrgencia<T extends { stock: number; umbralMinimo: number; umbralCritico: number }>(
  items: T[],
) {
  return items
    .map((item) => ({ ...item, nivel: nivelStock(item), faltante: item.umbralMinimo - item.stock }))
    .sort(
      (a, b) =>
        Number(b.nivel === "CRITICO") - Number(a.nivel === "CRITICO") || b.faltante - a.faltante,
    );
}

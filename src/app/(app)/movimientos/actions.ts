"use server";

import { revalidatePath } from "next/cache";
// Entradas y salidas las registran ambos roles: el guard es "hay sesión", no
// `soloAdmin()`. Se valida en el servidor igual, esconder el form no es control de acceso.
import { usuarioActual } from "@/lib/rbac";
import { auditar } from "@/lib/auditoria";
import { prisma } from "@/lib/prisma";
import { descontarStock } from "@/lib/stock";
import { Prisma } from "@/generated/prisma/client";
import { entradaSchema, salidaSchema } from "./schemas";

const SIN_STOCK = "__sin_stock__";
const ITEM_INEXISTENTE = "El ítem seleccionado ya no existe.";

function esItemInexistente(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2003" || error.code === "P2025")
  );
}

/** Movimiento inmutable + stock del ítem, en una sola transacción. */
export async function registrarEntrada(_prev: string | undefined, formData: FormData) {
  const usuarioId = await usuarioActual();
  if (!usuarioId) return "Sesión expirada. Vuelve a iniciar sesión.";

  const parsed = entradaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0].message;
  const { itemId, cantidad, fecha, proveedor, quienEntrega } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      await tx.entrada.create({
        data: { itemId, cantidad, fecha, proveedor, quienEntrega, usuarioId },
      });
      const item = await tx.item.update({
        where: { id: itemId },
        data: { stock: { increment: cantidad } },
      });
      // Dentro de la transacción: si el movimiento se revierte, la auditoría también.
      await auditar(tx, "ENTRADA_REGISTRADA", `Entrada de ${cantidad} x ${item.codigo} desde ${proveedor}.`, usuarioId);
    });
  } catch (error) {
    if (esItemInexistente(error)) return ITEM_INEXISTENTE;
    throw error;
  }

  revalidatePath("/entradas");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
}

export async function registrarSalida(_prev: string | undefined, formData: FormData) {
  const usuarioId = await usuarioActual();
  if (!usuarioId) return "Sesión expirada. Vuelve a iniciar sesión.";

  const parsed = salidaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0].message;
  const { itemId, cantidad, fecha, trabajador } = parsed.data;

  try {
    await prisma.$transaction(async (tx) => {
      // Verificación y descuento en una sola sentencia condicional: si falla,
      // la excepción revierte la transacción entera y no queda salida huérfana.
      if (!(await descontarStock(tx, itemId, cantidad))) throw new Error(SIN_STOCK);

      await tx.salida.create({ data: { itemId, cantidad, fecha, trabajador, usuarioId } });
      const item = await tx.item.findUniqueOrThrow({ where: { id: itemId }, select: { codigo: true } });
      await auditar(tx, "SALIDA_REGISTRADA", `Salida de ${cantidad} x ${item.codigo} para ${trabajador}.`, usuarioId);
    });
  } catch (error) {
    if (error instanceof Error && error.message === SIN_STOCK) {
      // Solo en el camino de error se paga la consulta extra para el mensaje.
      const item = await prisma.item.findUnique({ where: { id: itemId }, select: { stock: true } });
      return item
        ? `Stock insuficiente: solo quedan ${item.stock} unidad(es) de ese ítem.`
        : ITEM_INEXISTENTE;
    }
    if (esItemInexistente(error)) return ITEM_INEXISTENTE;
    throw error;
  }

  revalidatePath("/salidas");
  revalidatePath("/inventario");
  revalidatePath("/dashboard");
}

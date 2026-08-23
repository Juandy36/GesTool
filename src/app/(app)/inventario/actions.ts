"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { soloAdmin, usuarioActual } from "@/lib/rbac";
import { auditar } from "@/lib/auditoria";
import { Prisma } from "@/generated/prisma/client";

/**
 * Toda acción de acá escribe la fila de `Auditoria` dentro de la misma
 * transacción que el cambio, igual que los movimientos: si algo falla —
 * incluida la propia auditoría — no queda ni el cambio ni el registro a medias.
 *
 * `usuarioActual()` se resuelve *antes* de abrir la transacción: lee la sesión,
 * no la DB, y no hay por qué mantener una transacción abierta esperándola.
 */

/** `stock` no aparece a propósito: solo lo mueven las entradas y salidas. */
const itemSchema = z
  .object({
    id: z.string().trim().optional(),
    codigo: z.string().trim().min(1, "El código es obligatorio.").max(40),
    nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
    tipo: z.enum(["MATERIAL", "HERRAMIENTA"]),
    categoriaId: z.string().trim().min(1, "Elige una categoría."),
    umbralMinimo: z.coerce.number().int().min(0, "El umbral mínimo no puede ser negativo."),
    umbralCritico: z.coerce.number().int().min(0, "El umbral crítico no puede ser negativo."),
  })
  .refine((d) => d.umbralCritico <= d.umbralMinimo, {
    message: "El umbral crítico debe ser menor o igual que el mínimo.",
  });

export async function guardarItem(_prev: string | undefined, formData: FormData) {
  const denegado = await soloAdmin();
  if (denegado) return denegado;

  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0].message;
  const { id, ...datos } = parsed.data;
  const autor = await usuarioActual();

  try {
    await prisma.$transaction(async (tx) => {
      if (id) await tx.item.update({ where: { id }, data: datos });
      else await tx.item.create({ data: datos });

      await auditar(
        tx,
        id ? "ITEM_EDITADO" : "ITEM_CREADO",
        `Ítem ${datos.codigo} (${datos.nombre}) ${id ? "editado" : "creado"}.`,
        autor,
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return `Ya existe un ítem con el código ${datos.codigo}.`;
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003")
      return "La categoría seleccionada ya no existe.";
    throw error;
  }

  revalidatePath("/inventario");
}

/** Baja lógica: el registro se conserva, solo deja de listarse. */
export async function darDeBajaItem(_prev: string | undefined, formData: FormData) {
  const denegado = await soloAdmin();
  if (denegado) return denegado;

  const id = z.string().trim().min(1).safeParse(formData.get("id"));
  if (!id.success) return "Ítem inválido.";
  const autor = await usuarioActual();

  await prisma.$transaction(async (tx) => {
    const item = await tx.item.update({ where: { id: id.data }, data: { activo: false } });
    await auditar(tx, "ITEM_BAJA", `Ítem ${item.codigo} (${item.nombre}) dado de baja.`, autor);
  });

  revalidatePath("/inventario");
}

const nombreCategoria = z.string().trim().min(1, "El nombre es obligatorio.").max(80);

export async function crearCategoria(_prev: string | undefined, formData: FormData) {
  const denegado = await soloAdmin();
  if (denegado) return denegado;

  const nombre = nombreCategoria.safeParse(formData.get("nombre"));
  if (!nombre.success) return nombre.error.issues[0].message;
  const autor = await usuarioActual();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.categoria.create({ data: { nombre: nombre.data } });
      await auditar(tx, "CATEGORIA_CREADA", `Categoría "${nombre.data}" creada.`, autor);
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return `Ya existe la categoría ${nombre.data}.`;
    throw error;
  }

  revalidatePath("/inventario");
}

export async function renombrarCategoria(_prev: string | undefined, formData: FormData) {
  const denegado = await soloAdmin();
  if (denegado) return denegado;

  const parsed = z
    .object({ id: z.string().trim().min(1), nombre: nombreCategoria })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0].message;
  const autor = await usuarioActual();

  try {
    await prisma.$transaction(async (tx) => {
      // Lectura extra solo para la auditoría: "renombrada a X" sin el nombre
      // viejo no le sirve a nadie. Va dentro de la transacción para que el
      // nombre que se registra sea el que realmente se reemplazó.
      const antes = await tx.categoria.findUnique({
        where: { id: parsed.data.id },
        select: { nombre: true },
      });

      await tx.categoria.update({
        where: { id: parsed.data.id },
        data: { nombre: parsed.data.nombre },
      });

      await auditar(
        tx,
        "CATEGORIA_RENOMBRADA",
        `Categoría "${antes?.nombre ?? "?"}" renombrada a "${parsed.data.nombre}".`,
        autor,
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return `Ya existe la categoría ${parsed.data.nombre}.`;
    throw error;
  }

  revalidatePath("/inventario");
}

const CATEGORIA_EN_USO = "__categoria_en_uso__";

export async function eliminarCategoria(_prev: string | undefined, formData: FormData) {
  const denegado = await soloAdmin();
  if (denegado) return denegado;

  const id = z.string().trim().min(1).safeParse(formData.get("id"));
  if (!id.success) return "Categoría inválida.";
  const autor = await usuarioActual();

  try {
    await prisma.$transaction(async (tx) => {
      // Los ítems dados de baja siguen apuntando a su categoría, así que también
      // cuentan. El conteo va dentro de la transacción: si alguien mueve un ítem
      // acá en el medio, la FK `Restrict` corta igual, pero así el mensaje que
      // ve el usuario no miente.
      const enUso = await tx.item.count({ where: { categoriaId: id.data } });
      if (enUso > 0) throw new Error(`${CATEGORIA_EN_USO}${enUso}`);

      const categoria = await tx.categoria.delete({ where: { id: id.data } });
      await auditar(tx, "CATEGORIA_ELIMINADA", `Categoría "${categoria.nombre}" eliminada.`, autor);
    });
  } catch (error) {
    if (error instanceof Error && error.message.startsWith(CATEGORIA_EN_USO)) {
      const enUso = error.message.slice(CATEGORIA_EN_USO.length);
      return `No se puede eliminar: ${enUso} ítem(s) usan esta categoría. Muévelos primero.`;
    }
    throw error;
  }

  revalidatePath("/inventario");
}

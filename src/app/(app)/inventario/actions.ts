"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { soloAdmin } from "@/lib/rbac";
import { Prisma } from "@/generated/prisma/client";

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

  try {
    if (id) await prisma.item.update({ where: { id }, data: datos });
    else await prisma.item.create({ data: datos });
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

  await prisma.item.update({ where: { id: id.data }, data: { activo: false } });
  revalidatePath("/inventario");
}

const nombreCategoria = z.string().trim().min(1, "El nombre es obligatorio.").max(80);

export async function crearCategoria(_prev: string | undefined, formData: FormData) {
  const denegado = await soloAdmin();
  if (denegado) return denegado;

  const nombre = nombreCategoria.safeParse(formData.get("nombre"));
  if (!nombre.success) return nombre.error.issues[0].message;

  try {
    await prisma.categoria.create({ data: { nombre: nombre.data } });
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

  try {
    await prisma.categoria.update({
      where: { id: parsed.data.id },
      data: { nombre: parsed.data.nombre },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return `Ya existe la categoría ${parsed.data.nombre}.`;
    throw error;
  }

  revalidatePath("/inventario");
}

export async function eliminarCategoria(_prev: string | undefined, formData: FormData) {
  const denegado = await soloAdmin();
  if (denegado) return denegado;

  const id = z.string().trim().min(1).safeParse(formData.get("id"));
  if (!id.success) return "Categoría inválida.";

  // Los ítems dados de baja siguen apuntando a su categoría, así que también cuentan.
  const enUso = await prisma.item.count({ where: { categoriaId: id.data } });
  if (enUso > 0)
    return `No se puede eliminar: ${enUso} ítem(s) usan esta categoría. Muévelos primero.`;

  await prisma.categoria.delete({ where: { id: id.data } });
  revalidatePath("/inventario");
}

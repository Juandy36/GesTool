"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auditar } from "@/lib/auditoria";
import { prisma } from "@/lib/prisma";
import { soloAdmin, usuarioActual } from "@/lib/rbac";
import { Prisma } from "@/generated/prisma/client";
import { nuevoUsuarioSchema, resetPasswordSchema } from "./schemas";

/**
 * Las dos acciones dejan `debeCambiarPassword: true`: la clave que escribe el
 * admin es de un solo uso, el dueño de la cuenta la cambia al entrar y el guard
 * de `(app)/layout.tsx` lo fuerza.
 *
 * El alta y la auditoría van en la misma transacción, igual que los
 * movimientos: una credencial que se crea o se cambia sin dejar rastro es
 * justo lo que el libro de auditoría existe para impedir.
 */
export async function crearUsuario(_prev: string | undefined, formData: FormData) {
  const denegado = await soloAdmin();
  if (denegado) return denegado;

  const parsed = nuevoUsuarioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0].message;
  const { password, ...datos } = parsed.data;

  const passwordHash = await bcrypt.hash(password, 10);
  const autor = await usuarioActual();

  try {
    await prisma.$transaction(async (tx) => {
      await tx.usuario.create({ data: { ...datos, passwordHash, debeCambiarPassword: true } });
      await auditar(
        tx,
        "USUARIO_CREADO",
        `Usuario "${datos.usuario}" (${datos.nombre}) creado con rol ${datos.rol}.`,
        autor,
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return `Ya existe el usuario "${datos.usuario}".`;
    throw error;
  }

  revalidatePath("/usuarios");
}

export async function restablecerPassword(_prev: string | undefined, formData: FormData) {
  const denegado = await soloAdmin();
  if (denegado) return denegado;

  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0].message;

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);
  const autor = await usuarioActual();

  try {
    await prisma.$transaction(async (tx) => {
      const usuario = await tx.usuario.update({
        where: { id: parsed.data.id },
        data: { passwordHash, debeCambiarPassword: true },
      });
      // La sesión abierta del afectado sigue viva hasta que expire el JWT:
      // esto desbloquea a alguien, no lo expulsa.
      await auditar(
        tx,
        "USUARIO_PASSWORD_RESET",
        `Contraseña de "${usuario.usuario}" restablecida por un administrador.`,
        autor,
      );
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025")
      return "Ese usuario ya no existe.";
    throw error;
  }

  revalidatePath("/usuarios");
  // El formulario está en /usuarios/<id>/restablecer: al terminar se vuelve a la lista.
  redirect("/usuarios");
}

"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import { sesionViva } from "@/lib/rbac";

const schema = z
  .object({
    actual: z.string().min(1, "Ingresa tu contraseña actual."),
    nueva: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres."),
    confirmacion: z.string(),
  })
  .refine((d) => d.nueva === d.confirmacion, {
    message: "La confirmación no coincide con la nueva contraseña.",
  })
  .refine((d) => d.nueva !== d.actual, {
    message: "La nueva contraseña debe ser distinta de la actual.",
  });

export async function cambiarPassword(_prev: string | undefined, formData: FormData) {
  // `sesionViva()` y no `auth()`: revalida contra la base que la cuenta siga
  // activa, que es lo que el JWT no hace solo. Tampoco `sesionOperativa()`:
  // acá `debeCambiarPassword` está puesto a propósito, es a quien esta
  // pantalla existe para atender.
  const session = await sesionViva();
  if (!session) return "Sesión expirada. Vuelve a iniciar sesión.";

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0].message;

  // `sesionViva()` ya confirmó que la cuenta está activa; esto solo trae el hash.
  const usuario = await prisma.usuario.findUnique({ where: { id: session.user.id } });
  if (!usuario) return "Sesión expirada. Vuelve a iniciar sesión.";

  if (!(await bcrypt.compare(parsed.data.actual, usuario.passwordHash)))
    return "La contraseña actual es incorrecta.";

  const passwordHash = await bcrypt.hash(parsed.data.nueva, 10);

  // Rotación y auditoría en la misma transacción: una credencial que cambia sin
  // dejar rastro es justo lo que el libro de auditoría existe para impedir.
  await prisma.$transaction(async (tx) => {
    await tx.usuario.update({
      where: { id: usuario.id },
      data: { passwordHash, debeCambiarPassword: false },
    });
    await auditar(tx, "CAMBIO_PASSWORD", `${usuario.nombre} cambió su contraseña.`, usuario.id);
  });

  // El flag vive en el JWT: cerrar sesión es la forma simple de refrescarlo.
  await signOut({ redirectTo: "/login" });
}

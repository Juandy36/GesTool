"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";

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
  const session = await auth();
  if (!session) return "Sesión expirada. Vuelve a iniciar sesión.";

  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return parsed.error.issues[0].message;

  const usuario = await prisma.usuario.findUnique({ where: { id: session.user.id } });
  if (!usuario || !usuario.activo) return "Sesión expirada. Vuelve a iniciar sesión.";

  if (!(await bcrypt.compare(parsed.data.actual, usuario.passwordHash)))
    return "La contraseña actual es incorrecta.";

  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      passwordHash: await bcrypt.hash(parsed.data.nueva, 10),
      debeCambiarPassword: false,
    },
  });

  // El flag vive en el JWT: cerrar sesión es la forma simple de refrescarlo.
  await signOut({ redirectTo: "/login" });
}

import { z } from "zod";

/** Aparte de `actions.ts` porque un módulo `"use server"` solo puede exportar funciones async. */

// Mismo mínimo que exige `/cambiar-password`: una contraseña inicial que el
// propio flujo de cambio rechazaría no sirve de nada.
const password = z.string().min(8, "La contraseña debe tener al menos 8 caracteres.");

export const nuevoUsuarioSchema = z.object({
  usuario: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "El usuario debe tener al menos 3 caracteres.")
    .max(40)
    .regex(/^[a-z0-9._-]+$/, "Solo letras, números, punto, guion y guion bajo."),
  nombre: z.string().trim().min(1, "El nombre es obligatorio.").max(120),
  rol: z.enum(["ADMIN", "BODEGUERO"]),
  password,
});

export const resetPasswordSchema = z.object({
  id: z.cuid("Usuario inválido."),
  password,
});

export type DatosNuevoUsuario = z.infer<typeof nuevoUsuarioSchema>;

import { z } from "zod";

/**
 * Vive aparte de `actions.ts` porque un módulo `"use server"` solo puede
 * exportar funciones async. Así el mismo esquema valida en el cliente (antes
 * de enviar) y en el servidor (que es el que manda).
 */
const comun = {
  itemId: z.cuid("Elige un ítem."),
  cantidad: z.coerce.number().int().positive("La cantidad debe ser mayor que cero."),
  fecha: z.coerce.date("Fecha inválida."),
};

export const entradaSchema = z.object({
  ...comun,
  proveedor: z.string().trim().min(1, "El proveedor es obligatorio.").max(120),
  quienEntrega: z.string().trim().min(1, "Indica quién entrega la mercancía.").max(120),
});

export const salidaSchema = z.object({
  ...comun,
  trabajador: z.string().trim().min(1, "El nombre del trabajador es obligatorio.").max(120),
});

export type DatosEntrada = z.infer<typeof entradaSchema>;
export type DatosSalida = z.infer<typeof salidaSchema>;

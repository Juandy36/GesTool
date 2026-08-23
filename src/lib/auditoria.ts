import type { Prisma } from "@/generated/prisma/client";
import type { AccionAuditoria } from "@/generated/prisma/enums";

/**
 * Registra un evento en el libro de auditoria. Recibe el cliente como primer
 * parametro igual que `descontarStock`: las acciones de movimiento pasan su
 * `tx` para que la fila entre en la misma transaccion que el movimiento, y el
 * resto pasa `prisma` directo.
 *
 * `usuarioId` es opcional porque un LOGIN_FALLIDO con usuario inexistente no
 * tiene a quien apuntar.
 */
export async function auditar(
  db: Pick<Prisma.TransactionClient, "auditoria">,
  accion: AccionAuditoria,
  detalle: string,
  usuarioId?: string | null,
) {
  await db.auditoria.create({ data: { accion, detalle, usuarioId: usuarioId ?? null } });
}

/** Cómo se lee cada acción en la tabla de reportes y en el Excel. */
export const ETIQUETA_ACCION: Record<AccionAuditoria, string> = {
  LOGIN: "Inicio de sesión",
  LOGIN_FALLIDO: "Intento fallido",
  CAMBIO_PASSWORD: "Cambio de contraseña",
  ITEM_CREADO: "Ítem creado",
  ITEM_EDITADO: "Ítem editado",
  ITEM_BAJA: "Ítem dado de baja",
  CATEGORIA_CREADA: "Categoría creada",
  CATEGORIA_RENOMBRADA: "Categoría renombrada",
  CATEGORIA_ELIMINADA: "Categoría eliminada",
  ENTRADA_REGISTRADA: "Entrada registrada",
  SALIDA_REGISTRADA: "Salida registrada",
  USUARIO_CREADO: "Usuario creado",
  USUARIO_PASSWORD_RESET: "Contraseña restablecida",
};

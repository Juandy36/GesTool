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


import { cache } from "react";
import type { Session } from "next-auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * Decisión de acceso, sin dependencias: recibe la sesión y devuelve el mensaje
 * de error, o `null` si puede. Aparte para poder probarla sin levantar Next.
 */
export function puedeAdministrar(session: Session | null): string | null {
  if (!session) return "Sesión expirada. Vuelve a iniciar sesión.";
  if (session.user.rol !== "ADMIN") return "Solo un administrador puede hacer esto.";
  return null;
}

/**
 * Sesión cuya cuenta sigue viva en la base, o `null`.
 *
 * La sesión es un JWT sin adapter: nada la revalida contra la DB, así que el
 * token sobrevive a que borren o desactiven la cuenta. Confiar en él a secas
 * tenía tres consecuencias, todas del mismo origen:
 *
 *  - `auditar()` recibía un `usuarioId` muerto y reventaba con la foreign key
 *    `Auditoria_usuarioId_fkey`, con el error crudo de Prisma en pantalla.
 *  - Registrar un movimiento fallaba contra la FK de Entrada/Salida y el catch
 *    lo reportaba como "El ítem seleccionado ya no existe", que es mentira.
 *  - Un admin desactivado conservaba sus permisos hasta que expirara el token.
 *
 * `cache()` la memoiza por request: las actions que llaman a `soloAdmin()` y
 * después a `usuarioActual()` pagan una sola consulta.
 */
export const sesionViva = cache(async (): Promise<Session | null> => {
  const session = await auth();
  if (!session) return null;

  const cuenta = await prisma.usuario.findUnique({
    where: { id: session.user.id },
    select: { activo: true },
  });
  return cuenta?.activo ? session : null;
});

/**
 * Guard de rol para server actions. Se valida siempre en el servidor: esconder
 * el botón en la UI no es control de acceso.
 */
export async function soloAdmin(): Promise<string | null> {
  return puedeAdministrar(await sesionViva());
}

/**
 * Id del usuario de la sesión, o `null` si el token ya no corresponde a una
 * cuenta viva. Para auditar quién hizo la acción; el control de acceso es
 * `soloAdmin()`, esto no decide nada.
 */
export async function usuarioActual(): Promise<string | null> {
  return (await sesionViva())?.user.id ?? null;
}

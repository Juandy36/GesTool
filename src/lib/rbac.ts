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
 *
 * Ojo: no mira `debeCambiarPassword` a propósito. El guard de `(app)/layout.tsx`
 * necesita distinguir "no hay sesión" (va a /login) de "falta cambiar la clave"
 * (va a /cambiar-password), y `/cambiar-password` sirve justo a quien tiene el
 * flag puesto. Para todo lo demás está `sesionOperativa()`.
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
 * Sesión viva que además ya pasó el cambio de contraseña obligatorio.
 *
 * El flag se forzaba en un solo lugar, `(app)/layout.tsx`, y los endpoints de
 * `/api/**` viven fuera de ese grupo de rutas: una cuenta recién creada, con la
 * clave de un solo uso que el admin anotó en un papel, se bajaba el inventario
 * entero — y el libro de auditoría, si era ADMIN — sin haberla cambiado nunca.
 * Vale también para las server actions: por la UI no se llega con el flag
 * puesto, pero por un POST armado a mano sí.
 *
 * El flag viaja en el JWT, así que esto no agrega ninguna consulta.
 */
export async function sesionOperativa(): Promise<Session | null> {
  const session = await sesionViva();
  return session && !session.user.debeCambiarPassword ? session : null;
}

/**
 * Guard de rol para server actions. Se valida siempre en el servidor: esconder
 * el botón en la UI no es control de acceso.
 */
export async function soloAdmin(): Promise<string | null> {
  return puedeAdministrar(await sesionOperativa());
}

/**
 * Id del usuario de la sesión, o `null` si el token ya no corresponde a una
 * cuenta viva y en condiciones de operar. Para auditar quién hizo la acción; el
 * control de acceso es `soloAdmin()`, esto no decide nada.
 */
export async function usuarioActual(): Promise<string | null> {
  return (await sesionOperativa())?.user.id ?? null;
}

import type { Session } from "next-auth";
import { auth } from "@/auth";

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
 * Guard de rol para server actions. Se valida siempre en el servidor: esconder
 * el botón en la UI no es control de acceso.
 */
export async function soloAdmin(): Promise<string | null> {
  return puedeAdministrar(await auth());
}

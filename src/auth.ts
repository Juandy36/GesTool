import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import "next-auth/jwt";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auditar } from "@/lib/auditoria";
import type { Rol } from "@/generated/prisma/enums";

const credencialesSchema = z.object({
  usuario: z.string().trim().min(1),
  password: z.string().min(1),
});

/**
 * Hash contra el que se compara cuando el usuario no existe, para que el tiempo
 * de respuesta no delate cuáles cuentas existen.
 *
 * Se calcula, no se escribe a mano: la constante que había antes tenía 66
 * caracteres y un hash bcrypt tiene 60, así que `compare` la rechazaba por
 * formato y volvía en 0 ms sin ejecutar una sola ronda — justo el canal de
 * timing que esta línea existe para tapar. Un `hashSync` al arrancar el proceso
 * cuesta una vez lo mismo que un login y no se puede tipear mal.
 */
const HASH_DUMMY = bcrypt.hashSync("cuenta-inexistente", 10);

/**
 * Freno de fuerza bruta. `/api/auth/callback/credentials` se puede llamar sin
 * autenticación y cada intento fallido escribe una fila de auditoría: sin techo
 * se pueden probar contraseñas gratis y, peor, ~500 intentos empujan todo
 * evento real fuera de las 500 filas que muestra /reportes.
 *
 * ponytail: contador en memoria y por usuario. Se pierde al reiniciar y no se
 * comparte entre instancias — alcanza para una bodega en un solo proceso. El
 * techo real es que un atacante que rota nombres de usuario sigue escribiendo
 * hasta MAX_FALLOS filas por nombre nuevo: eso se corta con límite por IP en el
 * borde (nginx / Cloudflare / el proxy del hosting), no acá adentro.
 */
const VENTANA_MS = 15 * 60_000;
const MAX_FALLOS = 10;
const fallos = new Map<string, { n: number; desde: number }>();

function bloqueado(usuario: string) {
  const registro = fallos.get(usuario);
  if (!registro) return false;
  if (Date.now() - registro.desde > VENTANA_MS) {
    fallos.delete(usuario);
    return false;
  }
  return registro.n >= MAX_FALLOS;
}

function sumarFallo(usuario: string) {
  const ahora = Date.now();
  // Barrido perezoso: sin esto el Map crece sin techo con usuarios inventados.
  if (fallos.size > 1000)
    for (const [clave, valor] of fallos)
      if (ahora - valor.desde > VENTANA_MS) fallos.delete(clave);

  const registro = fallos.get(usuario);
  if (!registro || ahora - registro.desde > VENTANA_MS) {
    fallos.set(usuario, { n: 1, desde: ahora });
    return 1;
  }
  registro.n += 1;
  return registro.n;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: {
        usuario: { label: "Usuario", type: "text" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credencialesSchema.safeParse(credentials);
        if (!parsed.success) return null;
        const intentado = parsed.data.usuario;

        // Antes de tocar la base: un usuario bloqueado no gasta consulta, ni
        // bcrypt, ni fila de auditoría. Ahí se corta la inundación del libro.
        if (bloqueado(intentado)) return null;

        const usuario = await prisma.usuario.findUnique({ where: { usuario: intentado } });
        // Se compara igual sin usuario para no filtrar cuáles existen por tiempo de respuesta.
        const ok = await bcrypt.compare(parsed.data.password, usuario?.passwordHash ?? HASH_DUMMY);

        if (!usuario || !usuario.activo || !ok) {
          const n = sumarFallo(intentado);
          // El motivo solo lo ve un admin en la auditoría, no vuelve al que intenta entrar.
          const motivo = !usuario ? "usuario inexistente" : !usuario.activo ? "cuenta inactiva" : "contraseña incorrecta";
          const bloqueo =
            n >= MAX_FALLOS ? ` Bloqueado ${VENTANA_MS / 60_000} minutos tras ${n} intentos.` : "";
          await auditar(prisma, "LOGIN_FALLIDO", `Intento fallido con "${intentado}": ${motivo}.${bloqueo}`, usuario?.id);
          return null;
        }

        fallos.delete(intentado);
        await auditar(prisma, "LOGIN", `Inició sesión ${usuario.nombre} (${usuario.usuario}).`, usuario.id);

        return {
          id: usuario.id,
          name: usuario.nombre,
          usuario: usuario.usuario,
          rol: usuario.rol,
          debeCambiarPassword: usuario.debeCambiarPassword,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.usuario = user.usuario;
        token.rol = user.rol;
        token.debeCambiarPassword = user.debeCambiarPassword;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub!;
      session.user.usuario = token.usuario;
      session.user.rol = token.rol;
      session.user.debeCambiarPassword = token.debeCambiarPassword;
      return session;
    },
  },
});

declare module "next-auth" {
  interface User {
    usuario: string;
    rol: Rol;
    debeCambiarPassword: boolean;
  }
  interface Session {
    user: {
      id: string;
      name: string;
      usuario: string;
      rol: Rol;
      debeCambiarPassword: boolean;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    usuario: string;
    rol: Rol;
    debeCambiarPassword: boolean;
  }
}

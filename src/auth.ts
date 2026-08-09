import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import "next-auth/jwt";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Rol } from "@/generated/prisma/enums";

const credencialesSchema = z.object({
  usuario: z.string().trim().min(1),
  password: z.string().min(1),
});

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

        const usuario = await prisma.usuario.findUnique({
          where: { usuario: parsed.data.usuario },
        });
        // Se compara igual sin usuario para no filtrar cuáles existen por tiempo de respuesta.
        const hash = usuario?.passwordHash ?? "$2a$10$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv";
        const ok = await bcrypt.compare(parsed.data.password, hash);

        if (!usuario || !usuario.activo || !ok) return null;

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

/**
 * Snapshot y restauración de las credenciales de un usuario. Existe para que
 * los checks e2e puedan rotar contraseñas de verdad sin dejar el entorno
 * inservible para la corrida siguiente.
 *
 * No es parte de la app: solo lo usan los scripts de `scripts/`.
 *
 *   tsx scripts/credenciales.ts guardar   <usuario> <archivo>
 *   tsx scripts/credenciales.ts poner     <usuario> <clave> <true|false>
 *   tsx scripts/credenciales.ts restaurar <archivo>
 *   tsx scripts/credenciales.ts crear     <usuario> <clave> <ADMIN|BODEGUERO>
 *   tsx scripts/credenciales.ts borrar    <usuario>
 */
import "dotenv/config";
import { readFileSync, writeFileSync } from "node:fs";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const [orden, ...args] = process.argv.slice(2);

async function main() {
  switch (orden) {
    case "guardar": {
      const [usuario, archivo] = args;
      const datos = await prisma.usuario.findUniqueOrThrow({
        where: { usuario },
        // El hash tal cual: restaurar no necesita conocer la contraseña en claro.
        select: { usuario: true, passwordHash: true, debeCambiarPassword: true },
      });
      writeFileSync(archivo, JSON.stringify(datos), "utf8");
      return;
    }
    case "poner": {
      const [usuario, clave, flag] = args;
      await prisma.usuario.update({
        where: { usuario },
        data: { passwordHash: await bcrypt.hash(clave, 10), debeCambiarPassword: flag === "true" },
      });
      return;
    }
    case "crear": {
      const [usuario, clave, rol] = args;
      // Cuenta desechable para los checks: entra sin pasar por el cambio de
      // contraseña obligatorio y no tiene movimientos que impidan borrarla.
      const datos = {
        nombre: `Cuenta de prueba ${usuario}`,
        passwordHash: await bcrypt.hash(clave, 10),
        rol: rol === "ADMIN" ? ("ADMIN" as const) : ("BODEGUERO" as const),
        debeCambiarPassword: false,
        activo: true,
      };
      await prisma.usuario.upsert({ where: { usuario }, update: datos, create: { usuario, ...datos } });
      return;
    }
    case "borrar": {
      await prisma.auditoria.deleteMany({ where: { usuario: { usuario: args[0] } } });
      await prisma.usuario.deleteMany({ where: { usuario: args[0] } });
      return;
    }
    case "restaurar": {
      const { usuario, ...datos } = JSON.parse(readFileSync(args[0], "utf8"));
      await prisma.usuario.update({ where: { usuario }, data: datos });
      return;
    }
    default:
      throw new Error(`orden desconocida: ${orden}`);
  }
}

main()
  .catch((e) => {
    console.error(String(e).split("\n")[0]);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

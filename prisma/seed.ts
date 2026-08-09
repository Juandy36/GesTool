import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const usuario = process.env.SEED_ADMIN_USUARIO ?? "admin";
const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

async function main() {
  const admin = await prisma.usuario.upsert({
    where: { usuario },
    update: {},
    create: {
      usuario,
      nombre: "Administrador",
      passwordHash: await bcrypt.hash(password, 10),
      rol: "ADMIN",
      debeCambiarPassword: true,
    },
  });
  console.log(`Admin listo: ${admin.usuario} (cambio de contraseña obligatorio en el primer acceso)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

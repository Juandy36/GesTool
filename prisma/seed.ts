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

  // Catálogo de ejemplo para poder ver la tabla y el semáforo funcionando.
  // El stock va aquí solo porque todavía no existe el módulo de entradas.
  const categorias = ["Eléctricos", "Ferretería", "Herramientas manuales", "Seguridad"];
  const ids = new Map<string, string>();
  for (const nombre of categorias) {
    const c = await prisma.categoria.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
    ids.set(nombre, c.id);
  }

  const demo = [
    ["CBL-001", "Cable THHN 12 AWG (metro)", "MATERIAL", "Eléctricos", 240, 100, 40],
    ["BRK-020", "Breaker 20A", "MATERIAL", "Eléctricos", 8, 15, 5],
    ["TOM-110", "Tomacorriente doble", "MATERIAL", "Eléctricos", 3, 20, 8],
    ["TOR-038", 'Tornillo autoperforante 3/8"', "MATERIAL", "Ferretería", 1200, 300, 100],
    ["TUB-050", 'Tubo PVC 1/2" (unidad)', "MATERIAL", "Ferretería", 45, 50, 20],
    ["MAR-001", "Martillo de uña 16 oz", "HERRAMIENTA", "Herramientas manuales", 12, 5, 2],
    ["TAL-014", "Taladro percutor 1/2\"", "HERRAMIENTA", "Herramientas manuales", 2, 4, 2],
    ["LLA-set", "Juego de llaves mixtas", "HERRAMIENTA", "Herramientas manuales", 6, 3, 1],
    ["CAS-001", "Casco de seguridad", "MATERIAL", "Seguridad", 30, 15, 6],
    ["GUA-009", "Guantes de carnaza (par)", "MATERIAL", "Seguridad", 14, 25, 10],
  ] as const;

  for (const [codigo, nombre, tipo, categoria, stock, umbralMinimo, umbralCritico] of demo) {
    await prisma.item.upsert({
      where: { codigo },
      update: {},
      create: {
        codigo,
        nombre,
        tipo,
        categoriaId: ids.get(categoria)!,
        stock,
        umbralMinimo,
        umbralCritico,
      },
    });
  }
  console.log(`Catálogo de ejemplo: ${categorias.length} categorías, ${demo.length} ítems`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

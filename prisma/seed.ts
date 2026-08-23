import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const usuario = process.env.SEED_ADMIN_USUARIO ?? "admin";
const password = process.env.SEED_ADMIN_PASSWORD ?? "admin123";

/**
 * Medianoche UTC del día *local* N días atrás, que es exactamente lo que manda
 * un `<input type="date">`. Tomar los componentes en UTC dejaba las fechas un
 * día adelante en husos al oeste de Greenwich, y "hoy" del dashboard no veía
 * los movimientos del día.
 */
function diasAtras(n: number) {
  const [y, m, d] = new Date().toLocaleDateString("en-CA").split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d - n));
}

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

  // `check-inventario.sh` saltea en silencio todos sus checks de rol si no
  // existe un bodeguero, así que se siembra uno.
  const bodeguero = await prisma.usuario.upsert({
    where: { usuario: "bodeguero" },
    update: {},
    create: {
      usuario: "bodeguero",
      nombre: "Bodeguero de turno",
      passwordHash: await bcrypt.hash(password, 10),
      rol: "BODEGUERO",
      debeCambiarPassword: true,
    },
  });
  console.log(`Bodeguero listo: ${bodeguero.usuario}`);

  const categorias = ["Eléctricos", "Ferretería", "Herramientas manuales", "Seguridad"];
  const ids = new Map<string, string>();
  for (const nombre of categorias) {
    const c = await prisma.categoria.upsert({ where: { nombre }, update: {}, create: { nombre } });
    ids.set(nombre, c.id);
  }

  // El stock arranca en 0 y sale de los movimientos de abajo: la regla del
  // dominio es que nunca se setea a mano, y el seed no es la excepción.
  // codigo, nombre, tipo, categoría, umbralMinimo, umbralCritico, entrada, salidas
  const demo = [
    ["CBL-001", "Cable THHN 12 AWG (metro)", "MATERIAL", "Eléctricos", 100, 40, 300, [60]],
    ["BRK-020", "Breaker 20A", "MATERIAL", "Eléctricos", 15, 5, 50, [30, 12]],
    ["TOM-110", "Tomacorriente doble", "MATERIAL", "Eléctricos", 20, 8, 40, [25, 12]],
    ["TOR-038", 'Tornillo autoperforante 3/8"', "MATERIAL", "Ferretería", 300, 100, 1500, [300]],
    ["TUB-050", 'Tubo PVC 1/2" (unidad)', "MATERIAL", "Ferretería", 50, 20, 100, [40, 15]],
    ["MAR-001", "Martillo de uña 16 oz", "HERRAMIENTA", "Herramientas manuales", 5, 2, 15, [3]],
    ["TAL-014", 'Taladro percutor 1/2"', "HERRAMIENTA", "Herramientas manuales", 4, 2, 6, [2, 2]],
    ["LLA-set", "Juego de llaves mixtas", "HERRAMIENTA", "Herramientas manuales", 3, 1, 8, [2]],
    ["CAS-001", "Casco de seguridad", "MATERIAL", "Seguridad", 15, 6, 40, [10]],
    ["GUA-009", "Guantes de carnaza (par)", "MATERIAL", "Seguridad", 25, 10, 60, [30, 16]],
  ] as const;

  const itemIds = new Map<string, string>();
  for (const [codigo, nombre, tipo, categoria, umbralMinimo, umbralCritico] of demo) {
    const item = await prisma.item.upsert({
      where: { codigo },
      update: {},
      create: {
        codigo,
        nombre,
        tipo,
        categoriaId: ids.get(categoria)!,
        stock: 0,
        umbralMinimo,
        umbralCritico,
      },
    });
    itemIds.set(codigo, item.id);
  }

  // Los movimientos no tienen clave única, así que un segundo `db:seed` los
  // duplicaría y el stock quedaría al doble. Se siembran solo una vez.
  if ((await prisma.entrada.count()) > 0) {
    console.log(`Catálogo: ${categorias.length} categorías, ${demo.length} ítems (movimientos ya sembrados, se omiten)`);
    return;
  }

  const proveedores = ["Eléctricos del Norte", "Ferretería Central", "Suministros Andinos"];
  const entregan = ["Carlos Ruiz", "Marta Gómez", "Luis Fernández"];
  const trabajadores = ["Andrés Pérez", "Diana Rojas", "Jorge Salinas", "Paola Méndez"];

  let entradas = 0;
  let salidas = 0;

  for (const [i, fila] of demo.entries()) {
    const [codigo, , , , , , entrada, saca] = fila;
    const itemId = itemIds.get(codigo)!;

    // El stock se mueve con increment/decrement, no se escribe el total: así
    // siempre es la suma de los movimientos aunque las cifras de arriba cambien.
    await prisma.entrada.create({
      data: {
        itemId,
        cantidad: entrada,
        fecha: diasAtras(12),
        proveedor: proveedores[i % proveedores.length],
        quienEntrega: entregan[i % entregan.length],
        usuarioId: admin.id,
      },
    });
    await prisma.item.update({ where: { id: itemId }, data: { stock: { increment: entrada } } });
    entradas++;

    for (const [j, cantidad] of saca.entries()) {
      // La última salida de cada ítem queda con fecha de hoy para que el
      // dashboard tenga movimientos del día.
      await prisma.salida.create({
        data: {
          itemId,
          cantidad,
          fecha: j === saca.length - 1 ? diasAtras(0) : diasAtras(5),
          trabajador: trabajadores[(i + j) % trabajadores.length],
          usuarioId: j % 2 === 0 ? bodeguero.id : admin.id,
        },
      });
      await prisma.item.update({ where: { id: itemId }, data: { stock: { decrement: cantidad } } });
      salidas++;
    }
  }

  console.log(
    `Catálogo: ${categorias.length} categorías, ${demo.length} ítems, ${entradas} entradas y ${salidas} salidas`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

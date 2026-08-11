import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { nivelStock } from "@/lib/stock";
import TablaInventario from "./tabla";

export default async function InventarioPage() {
  // El layout de (app) ya garantiza que hay sesión.
  const session = (await auth())!;
  const esAdmin = session.user.rol === "ADMIN";

  const [items, categorias] = await Promise.all([
    prisma.item.findMany({
      where: { activo: true },
      include: { categoria: { select: { nombre: true } } },
      orderBy: { nombre: "asc" },
    }),
    prisma.categoria.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  const filas = items.map((item) => ({
    id: item.id,
    codigo: item.codigo,
    nombre: item.nombre,
    tipo: item.tipo,
    categoriaId: item.categoriaId,
    categoria: item.categoria.nombre,
    stock: item.stock,
    umbralMinimo: item.umbralMinimo,
    umbralCritico: item.umbralCritico,
    nivel: nivelStock(item),
  }));

  return (
    <TablaInventario
      filas={filas}
      categorias={categorias.map((c) => ({ id: c.id, nombre: c.nombre }))}
      esAdmin={esAdmin}
    />
  );
}

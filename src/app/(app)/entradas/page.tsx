import { fechaLocal } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import VistaMovimientos from "../movimientos/vista";

/** Solo el tramo reciente: el histórico completo se consulta por exportación. */
const ULTIMAS = 200;

export default async function EntradasPage() {
  const [items, entradas] = await Promise.all([
    prisma.item.findMany({
      where: { activo: true },
      select: { id: true, codigo: true, nombre: true, stock: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.entrada.findMany({
      take: ULTIMAS,
      orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      include: {
        item: { select: { codigo: true, nombre: true } },
        usuario: { select: { nombre: true } },
      },
    }),
  ]);

  return (
    <VistaMovimientos
      tipo="ENTRADA"
      items={items}
      hoy={fechaLocal()}
      movimientos={entradas.map((e) => ({
        id: e.id,
        fecha: e.fecha.toISOString().slice(0, 10),
        codigo: e.item.codigo,
        item: e.item.nombre,
        cantidad: e.cantidad,
        proveedor: e.proveedor,
        quienEntrega: e.quienEntrega,
        usuario: e.usuario.nombre,
      }))}
    />
  );
}

import { fechaLocal } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import VistaMovimientos from "../movimientos/vista";

/** Solo el tramo reciente: el histórico completo se consulta por exportación. */
const ULTIMAS = 200;

export default async function SalidasPage() {
  const [items, salidas] = await Promise.all([
    prisma.item.findMany({
      where: { activo: true },
      select: { id: true, codigo: true, nombre: true, stock: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.salida.findMany({
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
      tipo="SALIDA"
      items={items}
      hoy={fechaLocal()}
      movimientos={salidas.map((s) => ({
        id: s.id,
        fecha: s.fecha.toISOString().slice(0, 10),
        codigo: s.item.codigo,
        item: s.item.nombre,
        cantidad: s.cantidad,
        trabajador: s.trabajador,
        usuario: s.usuario.nombre,
      }))}
    />
  );
}

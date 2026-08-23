import Link from "next/link";
import { ETIQUETA_ACCION } from "@/lib/auditoria";
import { instanteLocal } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { soloAdmin } from "@/lib/rbac";
import { enAlerta, porUrgencia } from "@/lib/stock";
import BadgeStock from "../badge-stock";
import TablaAuditoria, { type FilaAuditoria } from "./tabla-auditoria";

/**
 * ponytail: el tramo reciente alcanza para revisar "qué pasó" y filtrarlo en el
 * cliente. Cuando el libro pase de unos pocos miles de filas, mover los filtros
 * al servidor con el estado en la URL.
 */
const ULTIMOS_EVENTOS = 500;

export default async function ReportesPage() {
  // La auditoría es solo para admin (funciones.md); el reporte de stock lo ve
  // cualquiera que pueda entrar, porque es para salir a comprar.
  const sinAuditoria = await soloAdmin();

  const [alerta, eventos] = await Promise.all([
    prisma.item.findMany({
      where: enAlerta(prisma),
      include: { categoria: { select: { nombre: true } } },
    }),
    sinAuditoria
      ? []
      : prisma.auditoria.findMany({
          take: ULTIMOS_EVENTOS,
          orderBy: { creadoEn: "desc" },
          include: { usuario: { select: { nombre: true } } },
        }),
  ]);

  const reposicion = porUrgencia(alerta);

  const filas: FilaAuditoria[] = eventos.map((e) => ({
    id: e.id,
    cuando: instanteLocal(e.creadoEn),
    accion: ETIQUETA_ACCION[e.accion],
    // Un LOGIN_FALLIDO con usuario inexistente no apunta a nadie.
    usuarioId: e.usuarioId ?? "sin",
    usuario: e.usuario?.nombre ?? "—",
    detalle: e.detalle,
  }));

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Reportes</h1>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Stock bajo mínimo</h2>
          <Link href="/inventario" className="text-sm underline underline-offset-4">
            Ir al inventario →
          </Link>
        </div>

        <div className="overflow-x-auto rounded border border-black/10 dark:border-white/15">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-black/10 dark:border-white/15">
              <tr>
                <th className="px-3 py-2 font-medium">Nivel</th>
                <th className="px-3 py-2 font-medium">Código</th>
                <th className="px-3 py-2 font-medium">Ítem</th>
                <th className="px-3 py-2 font-medium">Categoría</th>
                <th className="px-3 py-2 font-medium">Stock</th>
                <th className="px-3 py-2 font-medium">Mínimo</th>
                <th className="px-3 py-2 font-medium">Crítico</th>
                <th className="px-3 py-2 font-medium">Faltante</th>
              </tr>
            </thead>
            <tbody>
              {reposicion.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-center text-black/60 dark:text-white/60">
                    Nada por reponer: todos los ítems están sobre su mínimo.
                  </td>
                </tr>
              ) : (
                reposicion.map((item) => (
                  <tr key={item.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                    <td className="px-3 py-2">
                      <BadgeStock nivel={item.nivel} />
                    </td>
                    <td className="px-3 py-2 font-medium">{item.codigo}</td>
                    <td className="px-3 py-2">{item.nombre}</td>
                    <td className="px-3 py-2">{item.categoria.nombre}</td>
                    <td className="px-3 py-2">{item.stock}</td>
                    <td className="px-3 py-2">{item.umbralMinimo}</td>
                    <td className="px-3 py-2">{item.umbralCritico}</td>
                    <td className="px-3 py-2 font-medium">{item.faltante}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Registro de auditoría</h2>
        {sinAuditoria ? (
          <p className="text-sm text-black/60 dark:text-white/60">{sinAuditoria}</p>
        ) : (
          <TablaAuditoria filas={filas} />
        )}
      </section>
    </div>
  );
}

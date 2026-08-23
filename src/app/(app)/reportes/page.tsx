import Link from "next/link";
import { ETIQUETA_ACCION } from "@/lib/auditoria";
import { instanteLocal } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { soloAdmin } from "@/lib/rbac";
import { enAlerta, porUrgencia } from "@/lib/stock";
import { subtitulo, tabla, titulo } from "@/app/ui";
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
    <div className="space-y-7">
      <h1 className={titulo}>Reportes</h1>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2.5">
          <h2 className={subtitulo}>Stock bajo mínimo</h2>
          <Link href="/inventario" className="text-xs underline underline-offset-[3px]">
            Ir al inventario →
          </Link>
        </div>

        <div className={tabla.marco}>
          <table className={tabla.base}>
            <thead className={tabla.encabezado}>
              <tr>
                <th className={tabla.th}>Nivel</th>
                <th className={tabla.th}>Código</th>
                <th className={tabla.th}>Ítem</th>
                <th className={tabla.th}>Categoría</th>
                <th className={tabla.th}>Stock</th>
                <th className={tabla.th}>Mínimo</th>
                <th className={tabla.th}>Crítico</th>
                <th className={tabla.th}>Faltante</th>
              </tr>
            </thead>
            <tbody>
              {reposicion.length === 0 ? (
                <tr>
                  <td colSpan={8} className={tabla.vacio}>
                    <span className="text-[13px] text-faint">
                      Nada por reponer: todos los ítems están sobre su mínimo.
                    </span>
                  </td>
                </tr>
              ) : (
                reposicion.map((item) => (
                  <tr key={item.id} className={tabla.fila}>
                    <td className={tabla.td}>
                      <BadgeStock nivel={item.nivel} />
                    </td>
                    <td className={`${tabla.td} font-medium`}>{item.codigo}</td>
                    <td className={tabla.td}>{item.nombre}</td>
                    <td className={tabla.td}>{item.categoria.nombre}</td>
                    <td className={tabla.td}>{item.stock}</td>
                    <td className={tabla.td}>{item.umbralMinimo}</td>
                    <td className={tabla.td}>{item.umbralCritico}</td>
                    <td className={`${tabla.td} font-medium`}>{item.faltante}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className={subtitulo}>Registro de auditoría</h2>
        {sinAuditoria ? (
          <p className="text-[13px] text-faint">{sinAuditoria}</p>
        ) : (
          <TablaAuditoria filas={filas} />
        )}
      </section>
    </div>
  );
}

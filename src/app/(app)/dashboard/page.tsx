import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fechaLocal } from "@/lib/fechas";
import { enAlerta, porUrgencia } from "@/lib/stock";
import Icono from "@/app/iconos";
import { btnGhost, subtitulo, titulo } from "@/app/ui";
import BadgeStock from "../badge-stock";
import TablaMovimientos, { type MovimientoGlobal } from "./tabla-movimientos";

const ULTIMOS = 10;

export default async function DashboardPage() {
  // Se filtra por `fecha` (la del movimiento) y no por `creadoEn`: lo del día es
  // lo fechado hoy aunque se cargue tarde. La fecha local se pasa a medianoche
  // UTC, que es como la guarda el `<input type="date">` del formulario.
  const hoy = new Date(`${fechaLocal()}T00:00:00.000Z`);
  const manana = new Date(hoy.getTime() + 86_400_000);
  const delDia = { fecha: { gte: hoy, lt: manana } };

  const [total, bajos, entradasHoy, salidasHoy, alerta, entradas, salidas] = await Promise.all([
    prisma.item.count({ where: { activo: true } }),
    prisma.item.count({ where: enAlerta(prisma) }),
    prisma.entrada.count({ where: delDia }),
    prisma.salida.count({ where: delDia }),
    prisma.item.findMany({
      where: enAlerta(prisma),
      select: { id: true, codigo: true, nombre: true, stock: true, umbralMinimo: true, umbralCritico: true },
    }),
    prisma.entrada.findMany({
      take: ULTIMOS,
      orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      include: {
        item: { select: { codigo: true, nombre: true } },
        usuario: { select: { nombre: true } },
      },
    }),
    prisma.salida.findMany({
      take: ULTIMOS,
      orderBy: [{ fecha: "desc" }, { creadoEn: "desc" }],
      include: {
        item: { select: { codigo: true, nombre: true } },
        usuario: { select: { nombre: true } },
      },
    }),
  ]);

  const reposicion = porUrgencia(alerta);

  const ultimos: MovimientoGlobal[] = [
    ...entradas.map((e) => ({
      id: `E${e.id}`,
      tipo: "ENTRADA" as const,
      creadoEn: e.creadoEn,
      fecha: e.fecha.toISOString().slice(0, 10),
      item: `${e.item.codigo} · ${e.item.nombre}`,
      cantidad: e.cantidad,
      usuario: e.usuario.nombre,
      detalle: `${e.proveedor} · entrega ${e.quienEntrega}`,
    })),
    ...salidas.map((s) => ({
      id: `S${s.id}`,
      tipo: "SALIDA" as const,
      creadoEn: s.creadoEn,
      fecha: s.fecha.toISOString().slice(0, 10),
      item: `${s.item.codigo} · ${s.item.nombre}`,
      cantidad: s.cantidad,
      usuario: s.usuario.nombre,
      detalle: s.trabajador,
    })),
  ]
    // Cada tabla trae sus 10 más recientes; intercalarlas y recortar deja los 10
    // globales, sin importar cómo se repartan entre entradas y salidas.
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || +b.creadoEn - +a.creadoEn)
    .slice(0, ULTIMOS);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h1 className={titulo}>Dashboard</h1>
        <a href="/api/inventario/export" className={btnGhost}>
          <Icono nombre="descargar" size={14} grosor={2} />
          Exportar a Excel
        </a>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Total de ítems" valor={total} pie="Activos en el catálogo" href="/inventario" />
        <Kpi
          titulo="Bajos en stock"
          valor={bajos}
          pie="En el mínimo o por debajo"
          href="/reportes"
          alerta={bajos > 0}
        />
        <Kpi titulo="Entradas de hoy" valor={entradasHoy} pie="Recepciones del día" href="/entradas" />
        <Kpi titulo="Salidas de hoy" valor={salidasHoy} pie="Entregas del día" href="/salidas" />
      </div>

      <section className="overflow-hidden rounded-[10px] border border-warn-line">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-warn-line bg-warn-soft px-4 py-3">
          <h2 className={`${subtitulo} text-warn`}>Reposición urgente</h2>
          <Link href="/reportes" className="text-xs text-warn underline underline-offset-[3px]">
            Ver reporte completo →
          </Link>
        </div>

        {reposicion.length === 0 ? (
          <p className="px-4 py-6 text-[13px] text-muted">
            Nada por reponer: todos los ítems están sobre su mínimo.
          </p>
        ) : (
          <ul className="text-[13px]">
            {reposicion.map((item) => (
              <li
                key={item.id}
                className="flex flex-wrap items-center gap-x-3.5 gap-y-1 border-b border-border px-4 py-2.5 last:border-0"
              >
                <BadgeStock nivel={item.nivel} />
                <span className="w-[70px] shrink-0 font-semibold">{item.codigo}</span>
                <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
                <span className="whitespace-nowrap text-muted">
                  stock {item.stock} / mín {item.umbralMinimo}
                </span>
                <span className="font-semibold whitespace-nowrap">faltan {item.faltante}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2.5">
        <h2 className={subtitulo}>Últimos movimientos</h2>
        <TablaMovimientos filas={ultimos} />
      </section>
    </div>
  );
}

function Kpi({
  titulo,
  valor,
  pie,
  href,
  alerta,
}: {
  titulo: string;
  valor: number;
  pie: string;
  href: string;
  alerta?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`block rounded-[10px] border p-4 ${
        alerta ? "border-warn-line bg-warn-soft" : "border-border bg-surface hover:bg-surface-alt"
      }`}
    >
      <p className={`text-[12.5px] ${alerta ? "text-warn" : "text-muted"}`}>{titulo}</p>
      <p
        className={`mt-2 text-[32px] leading-none font-semibold tracking-[-0.02em] ${
          alerta ? "text-warn" : ""
        }`}
      >
        {valor}
      </p>
      <p className={`mt-2 text-[11.5px] ${alerta ? "text-warn/80" : "text-faint"}`}>{pie}</p>
    </Link>
  );
}

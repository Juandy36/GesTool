import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { fechaLocal } from "@/lib/fechas";
import { enAlerta, porUrgencia } from "@/lib/stock";
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
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <a
          href="/api/inventario/export"
          className="rounded border border-black/20 px-3 py-2 text-sm dark:border-white/25"
        >
          Exportar a Excel
        </a>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi titulo="Total de ítems" valor={total} pie="Activos en el catálogo" href="/inventario" />
        <Kpi
          titulo="Bajos en stock"
          valor={bajos}
          pie="En el mínimo o por debajo"
          href="/inventario"
          alerta={bajos > 0}
        />
        <Kpi titulo="Entradas de hoy" valor={entradasHoy} pie="Recepciones del día" href="/entradas" />
        <Kpi titulo="Salidas de hoy" valor={salidasHoy} pie="Entregas del día" href="/salidas" />
      </div>

      <section className="rounded border border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-300 px-4 py-3 dark:border-amber-900">
          <h2 className="font-semibold">Reposición urgente</h2>
          <Link href="/reportes" className="text-sm underline underline-offset-4">
            Ver reporte completo →
          </Link>
        </div>

        {reposicion.length === 0 ? (
          <p className="px-4 py-6 text-sm text-black/60 dark:text-white/60">
            Nada por reponer: todos los ítems están sobre su mínimo.
          </p>
        ) : (
          <ul className="divide-y divide-amber-200 text-sm dark:divide-amber-900">
            {reposicion.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3">
                <BadgeStock nivel={item.nivel} />
                <span className="font-medium">{item.codigo}</span>
                <span className="min-w-0 flex-1 truncate">{item.nombre}</span>
                <span className="text-black/60 dark:text-white/60">
                  stock {item.stock} / mínimo {item.umbralMinimo}
                </span>
                <span className="font-medium">faltan {item.faltante}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold">Últimos movimientos</h2>
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
      className={`block rounded border p-4 hover:bg-black/5 dark:hover:bg-white/10 ${
        alerta
          ? "border-amber-300 text-amber-900 dark:border-amber-900 dark:text-amber-300"
          : "border-black/10 dark:border-white/15"
      }`}
    >
      <p className="text-sm text-black/60 dark:text-white/60">{titulo}</p>
      <p className="text-3xl font-semibold">{valor}</p>
      <p className="mt-1 text-xs text-black/50 dark:text-white/50">{pie}</p>
    </Link>
  );
}

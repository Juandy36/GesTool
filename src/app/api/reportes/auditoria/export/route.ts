import ExcelJS from "exceljs";
import { ETIQUETA_ACCION } from "@/lib/auditoria";
import { fechaLocal, inicioDelDiaLocal, instanteLocal } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { soloAdmin } from "@/lib/rbac";
import type { Prisma } from "@/generated/prisma/client";

/** `?usuario=<id|sin>&desde=yyyy-mm-dd&hasta=yyyy-mm-dd`, todos opcionales. */
const DIA = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: Request) {
  // La auditoría es solo para admin, igual que la vista de /reportes.
  const denegado = await soloAdmin();
  if (denegado) return new Response(denegado, { status: 403 });

  const params = new URL(request.url).searchParams;
  const usuario = params.get("usuario");
  const desde = params.get("desde");
  const hasta = params.get("hasta");

  const where: Prisma.AuditoriaWhereInput = {};
  if (usuario) where.usuarioId = usuario === "sin" ? null : usuario;

  // Los límites llegan como día local; `creadoEn` es un instante. Se traducen a
  // [inicio del día desde, inicio del día siguiente a hasta) para que el rango
  // seleccione los mismos eventos que el filtro de la tabla.
  if ((desde && DIA.test(desde)) || (hasta && DIA.test(hasta))) {
    where.creadoEn = {
      ...(desde && DIA.test(desde) ? { gte: inicioDelDiaLocal(desde) } : {}),
      ...(hasta && DIA.test(hasta) ? { lt: inicioDelDiaLocal(hasta, 1) } : {}),
    };
  }

  const eventos = await prisma.auditoria.findMany({
    where,
    orderBy: { creadoEn: "desc" },
    include: { usuario: { select: { nombre: true, usuario: true } } },
  });

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Auditoría");
  hoja.columns = [
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Hora", key: "hora", width: 8 },
    { header: "Usuario", key: "usuario", width: 26 },
    { header: "Acción", key: "accion", width: 24 },
    { header: "Detalle", key: "detalle", width: 70 },
  ];
  hoja.getRow(1).font = { bold: true };

  for (const evento of eventos) {
    const [fecha, hora] = instanteLocal(evento.creadoEn).split(" ");
    hoja.addRow({
      fecha,
      hora,
      // Un LOGIN_FALLIDO con usuario inexistente no apunta a nadie.
      usuario: evento.usuario ? `${evento.usuario.nombre} (${evento.usuario.usuario})` : "—",
      accion: ETIQUETA_ACCION[evento.accion],
      detalle: evento.detalle,
    });
  }

  // Se genera al vuelo y se manda al cliente: nunca se escribe a disco.
  const buffer = await libro.xlsx.writeBuffer();

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="auditoria-${fechaLocal()}.xlsx"`,
    },
  });
}

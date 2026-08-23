import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ETIQUETA_NIVEL, nivelStock } from "@/lib/stock";

/** Exportar el inventario está permitido para admin y bodeguero. */
export async function GET() {
  const session = await auth();
  if (!session) return new Response("No autenticado", { status: 401 });

  const items = await prisma.item.findMany({
    where: { activo: true },
    include: { categoria: { select: { nombre: true } } },
    orderBy: { nombre: "asc" },
  });

  const libro = new ExcelJS.Workbook();
  const hoja = libro.addWorksheet("Inventario");
  hoja.columns = [
    { header: "Código", key: "codigo", width: 16 },
    { header: "Nombre", key: "nombre", width: 40 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Categoría", key: "categoria", width: 24 },
    { header: "Stock", key: "stock", width: 10 },
    { header: "Umbral mínimo", key: "umbralMinimo", width: 16 },
    { header: "Umbral crítico", key: "umbralCritico", width: 16 },
    { header: "Estado", key: "estado", width: 16 },
  ];
  hoja.getRow(1).font = { bold: true };

  for (const item of items) {
    hoja.addRow({
      codigo: item.codigo,
      nombre: item.nombre,
      tipo: item.tipo === "MATERIAL" ? "Material" : "Herramienta",
      categoria: item.categoria.nombre,
      stock: item.stock,
      umbralMinimo: item.umbralMinimo,
      umbralCritico: item.umbralCritico,
      estado: ETIQUETA_NIVEL[nivelStock(item)],
    });
  }

  // Se genera al vuelo y se manda al cliente: nunca se escribe a disco.
  const buffer = await libro.xlsx.writeBuffer();
  const fecha = new Date().toISOString().slice(0, 10);

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="inventario-${fecha}.xlsx"`,
    },
  });
}

"use client";

import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { comoDdMmAaaa } from "@/lib/fechas";
import Icono from "@/app/iconos";
import { tabla } from "@/app/ui";

/** `fecha` viaja como ISO `yyyy-mm-dd`, igual que en el histórico: sin zona horaria. */
export type MovimientoGlobal = {
  id: string;
  tipo: "ENTRADA" | "SALIDA";
  fecha: string;
  item: string;
  cantidad: number;
  usuario: string;
  detalle: string;
};

// Sin features: el servidor ya trae los 10 en orden y no hay filtro ni sort acá.
const features = tableFeatures({});
const helper = createColumnHelper<typeof features, MovimientoGlobal>();

const columns = helper.columns([
  helper.accessor("tipo", {
    header: "Tipo",
    cell: ({ getValue }) => {
      const entrada = getValue() === "ENTRADA";
      return (
        <span
          className={`rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
            entrada ? "bg-ok-soft text-ok" : "bg-danger-soft text-danger"
          }`}
        >
          {entrada ? "Entrada" : "Salida"}
        </span>
      );
    },
  }),
  helper.accessor("item", { header: "Ítem" }),
  helper.accessor("cantidad", { header: "Cantidad" }),
  helper.accessor("fecha", {
    header: "Fecha",
    cell: ({ getValue }) => comoDdMmAaaa(getValue()),
  }),
  helper.accessor("usuario", { header: "Registró" }),
  helper.accessor("detalle", { header: "Detalle" }),
]);

export default function TablaMovimientos({ filas }: { filas: MovimientoGlobal[] }) {
  const table = useTable({ features, columns, data: filas });

  return (
    <div className={tabla.marco}>
      <table className={tabla.base}>
        <thead className={tabla.encabezado}>
          {table.getHeaderGroups().map((grupo) => (
            <tr key={grupo.id}>
              {grupo.headers.map((header) => (
                <th key={header.id} className={tabla.th}>
                  <table.FlexRender header={header} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className={tabla.vacio}>
                <div className="flex flex-col items-center gap-2 text-faint">
                  <Icono nombre="lista" size={22} grosor={1.6} />
                  <span className="text-[13px]">Todavía no hay movimientos registrados.</span>
                </div>
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className={tabla.fila}>
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className={tabla.td}>
                    <table.FlexRender cell={cell} />
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

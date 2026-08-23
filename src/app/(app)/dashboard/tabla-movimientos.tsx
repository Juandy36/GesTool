"use client";

import { createColumnHelper, tableFeatures, useTable } from "@tanstack/react-table";
import { comoDdMmAaaa } from "@/lib/fechas";

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
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
            entrada
              ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"
              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
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
    <div className="overflow-x-auto rounded border border-black/10 dark:border-white/15">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-black/10 dark:border-white/15">
          {table.getHeaderGroups().map((grupo) => (
            <tr key={grupo.id}>
              {grupo.headers.map((header) => (
                <th key={header.id} className="px-3 py-2 font-medium">
                  <table.FlexRender header={header} />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {filas.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-3 py-6 text-center text-black/60 dark:text-white/60"
              >
                Todavía no hay movimientos registrados.
              </td>
            </tr>
          ) : (
            table.getRowModel().rows.map((row) => (
              <tr key={row.id} className="border-b border-black/5 last:border-0 dark:border-white/10">
                {row.getAllCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-2">
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

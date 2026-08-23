"use client";

import { useMemo, useState } from "react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { comoDdMmAaaa } from "@/lib/fechas";

/**
 * `cuando` es el instante ya en hora local, `yyyy-mm-dd HH:mm`. Se filtra y se
 * ordena como texto: nunca se rehidrata un `Date` acá, así que no hay dónde
 * meter un desfase de zona horaria.
 */
export type FilaAuditoria = {
  id: string;
  cuando: string;
  accion: string;
  /** Id real, o `"sin"` para los eventos que no apuntan a nadie. Ningún cuid es "sin". */
  usuarioId: string;
  usuario: string;
  detalle: string;
};

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { text: sortFn_text },
});

const helper = createColumnHelper<typeof features, FilaAuditoria>();

const columns = helper.columns([
  helper.accessor("cuando", {
    header: "Cuándo",
    cell: ({ getValue }) => {
      const [dia, hora] = getValue().split(" ");
      return `${comoDdMmAaaa(dia)} ${hora}`;
    },
  }),
  helper.accessor("usuario", { header: "Usuario" }),
  helper.accessor("accion", { header: "Acción" }),
  helper.accessor("detalle", { header: "Detalle" }),
]);

const campo = "rounded border border-black/20 px-2 py-1 text-sm dark:border-white/25";

export default function TablaAuditoria({ filas }: { filas: FilaAuditoria[] }) {
  const [usuario, setUsuario] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  // Distintos de las filas que hay, no de la tabla de usuarios: así el select
  // no ofrece a alguien sin eventos, e incluye el "—" de los intentos fallidos
  // con usuario inexistente. Se filtra por id y no por nombre porque dos
  // personas pueden llamarse igual.
  const usuarios = useMemo(
    () =>
      [...new Map(filas.map((f) => [f.usuarioId, f.usuario]))].sort((a, b) =>
        a[1].localeCompare(b[1]),
      ),
    [filas],
  );

  const visibles = useMemo(() => {
    // Los inputs date dan `yyyy-mm-dd` local y `cuando` arranca con ese mismo
    // formato: comparar los primeros 10 caracteres alcanza y es exacto.
    return filas.filter((f) => {
      const dia = f.cuando.slice(0, 10);
      return (
        (!usuario || f.usuarioId === usuario) &&
        (!desde || dia >= desde) &&
        (!hasta || dia <= hasta)
      );
    });
  }, [filas, usuario, desde, hasta]);

  // El Excel sale con los filtros puestos: el servidor repite el mismo recorte
  // sobre el libro completo, no solo sobre las filas que se trajo la página.
  const exportar = `/api/reportes/auditoria/export?${new URLSearchParams(
    Object.entries({ usuario, desde, hasta }).filter(([, v]) => v),
  )}`;

  const table = useTable(
    {
      features,
      columns,
      data: visibles,
      initialState: { sorting: [{ id: "cuando", desc: true }] },
    },
    (state) => ({ sorting: state.sorting }),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="space-y-1">
          <span className="block text-sm font-medium">Usuario</span>
          <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className={campo}>
            <option value="">Todos</option>
            {usuarios.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="block text-sm font-medium">Desde</span>
          <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className={campo} />
        </label>

        <label className="space-y-1">
          <span className="block text-sm font-medium">Hasta</span>
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className={campo} />
        </label>

        {(usuario || desde || hasta) && (
          <button
            type="button"
            onClick={() => {
              setUsuario("");
              setDesde("");
              setHasta("");
            }}
            className="pb-1 text-sm underline underline-offset-4"
          >
            Limpiar filtros
          </button>
        )}

        <a
          href={exportar}
          className="ml-auto rounded border border-black/20 px-3 py-2 text-sm dark:border-white/25"
        >
          Exportar a Excel
        </a>
      </div>

      <div className="overflow-x-auto rounded border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 dark:border-white/15">
            {table.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id}>
                {grupo.headers.map((header) => {
                  const orden = header.column.getIsSorted();
                  return (
                    <th key={header.id} className="px-3 py-2 font-medium">
                      <button
                        type="button"
                        onClick={() => header.column.toggleSorting()}
                        className="flex items-center gap-1"
                      >
                        <table.FlexRender header={header} />
                        {orden === "asc" ? "▲" : orden === "desc" ? "▼" : ""}
                      </button>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {visibles.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-3 py-6 text-center text-black/60 dark:text-white/60">
                  Ningún evento coincide con los filtros.
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

      <p className="text-sm text-black/60 dark:text-white/60">
        {visibles.length} de {filas.length} evento(s). Registro inmutable: se escribe y no se edita.
      </p>
    </div>
  );
}

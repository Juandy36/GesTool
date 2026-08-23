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
import Icono from "@/app/iconos";
import { btnGhost, campoChico, etiqueta, tabla, tarjeta } from "@/app/ui";

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
      <div className={`${tarjeta} flex flex-wrap items-end gap-2.5`}>
        <label className="space-y-1">
          <span className={`block ${etiqueta}`}>Usuario</span>
          <select value={usuario} onChange={(e) => setUsuario(e.target.value)} className={campoChico}>
            <option value="">Todos</option>
            {usuarios.map(([id, nombre]) => (
              <option key={id} value={id}>
                {nombre}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className={`block ${etiqueta}`}>Desde</span>
          <input type="date" value={desde} max={hasta || undefined} onChange={(e) => setDesde(e.target.value)} className={campoChico} />
        </label>

        <label className="space-y-1">
          <span className={`block ${etiqueta}`}>Hasta</span>
          <input type="date" value={hasta} min={desde || undefined} onChange={(e) => setHasta(e.target.value)} className={campoChico} />
        </label>

        {(usuario || desde || hasta) && (
          <button
            type="button"
            onClick={() => {
              setUsuario("");
              setDesde("");
              setHasta("");
            }}
            className="pb-2 text-xs underline underline-offset-[3px]"
          >
            Limpiar filtros
          </button>
        )}

        <a
          href={exportar}
          className={`${btnGhost} ml-auto`}
        >
          <Icono nombre="descargar" size={14} grosor={2} />
          Exportar a Excel
        </a>
      </div>

      <div className={tabla.marco}>
        <table className={tabla.base}>
          <thead className={tabla.encabezado}>
            {table.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id}>
                {grupo.headers.map((header) => {
                  const orden = header.column.getIsSorted();
                  return (
                    <th key={header.id} className={tabla.th}>
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
                <td colSpan={columns.length} className={tabla.vacio}>
                  <div className="flex flex-col items-center gap-2 text-faint">
                    <Icono nombre="lista" size={22} grosor={1.6} />
                    <span className="text-[13px]">Ningún evento coincide con los filtros.</span>
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

      <p className="text-xs text-faint">
        {visibles.length} de {filas.length} evento(s). Registro inmutable: se escribe y no se edita.
      </p>
    </div>
  );
}

"use client";

import { useActionState, useMemo, useState } from "react";
import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { comoDdMmAaaa } from "@/lib/fechas";
import Icono from "@/app/iconos";
import { btnPrimario, campo as campoBase, error as claseError, etiqueta, tabla, tarjeta, titulo } from "@/app/ui";
import { registrarEntrada, registrarSalida } from "./actions";
import { entradaSchema, salidaSchema } from "./schemas";

export type ItemOpcion = { id: string; codigo: string; nombre: string; stock: number };

/** `fecha` viaja como ISO `yyyy-mm-dd`: ordena bien como texto y no arrastra zona horaria. */
export type Movimiento = {
  id: string;
  fecha: string;
  codigo: string;
  item: string;
  cantidad: number;
  proveedor?: string;
  quienEntrega?: string;
  trabajador?: string;
  usuario: string;
};

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

const helper = createColumnHelper<typeof features, Movimiento>();

const INICIAL = "" as string | undefined;

const campo = `${campoBase} w-full`;

export default function VistaMovimientos({
  tipo,
  items,
  movimientos,
  hoy,
}: {
  tipo: "ENTRADA" | "SALIDA";
  items: ItemOpcion[];
  movimientos: Movimiento[];
  /** Lo calcula el servidor para que el `defaultValue` no difiera en la hidratación. */
  hoy: string;
}) {
  const esEntrada = tipo === "ENTRADA";
  const [error, formAction, pendiente] = useActionState(
    esEntrada ? registrarEntrada : registrarSalida,
    INICIAL,
  );
  const [errorCliente, setErrorCliente] = useState<string>();

  function validar(e: React.FormEvent<HTMLFormElement>) {
    const datos = Object.fromEntries(new FormData(e.currentTarget));
    const parsed = (esEntrada ? entradaSchema : salidaSchema).safeParse(datos);

    let mensaje = parsed.success ? undefined : parsed.error.issues[0].message;
    if (parsed.success && !esEntrada) {
      // El servidor lo verifica igual dentro de la transacción; esto solo evita
      // el viaje y que el formulario se limpie por un error previsible.
      const item = items.find((i) => i.id === parsed.data.itemId);
      if (item && parsed.data.cantidad > item.stock)
        mensaje = `Stock insuficiente: solo quedan ${item.stock} unidad(es) de ${item.nombre}.`;
    }

    setErrorCliente(mensaje);
    if (mensaje) e.preventDefault();
  }

  const columns = useMemo(() => {
    const detalle = esEntrada
      ? [
          helper.accessor("proveedor", {
            header: "Proveedor",
            cell: ({ getValue }) => getValue() ?? "",
          }),
          helper.accessor("quienEntrega", {
            header: "Entregado por",
            cell: ({ getValue }) => getValue() ?? "",
          }),
        ]
      : [
          helper.accessor("trabajador", {
            header: "Trabajador",
            cell: ({ getValue }) => getValue() ?? "",
          }),
        ];

    // Sin columna de acciones a propósito: el histórico es de solo lectura.
    return helper.columns([
      helper.accessor("fecha", {
        header: "Fecha",
        cell: ({ getValue }) => comoDdMmAaaa(getValue()),
      }),
      helper.accessor("codigo", { header: "Código" }),
      helper.accessor("item", { header: "Ítem" }),
      helper.accessor("cantidad", { header: "Cantidad" }),
      ...detalle,
      helper.accessor("usuario", { header: "Registró" }),
    ]);
  }, [esEntrada]);

  const table = useTable(
    {
      features,
      data: movimientos,
      columns,
      initialState: { sorting: [{ id: "fecha", desc: true }] },
    },
    (state) => ({ sorting: state.sorting }),
  );

  const filas = table.getRowModel().rows;
  const mensajeError = errorCliente ?? error;

  return (
    <div className="space-y-5">
      <h1 className={titulo}>{esEntrada ? "Entradas" : "Salidas"}</h1>

      <form action={formAction} onSubmit={validar} className={`${tarjeta} grid gap-3 sm:grid-cols-2`}>
        <label className="block space-y-1 sm:col-span-2">
          <span className={etiqueta}>Ítem</span>
          <select name="itemId" defaultValue="" required className={campo}>
            <option value="" disabled>
              Elegir…
            </option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.codigo} · {i.nombre} (stock: {i.stock})
              </option>
            ))}
          </select>
        </label>

        <label className="block space-y-1">
          <span className={etiqueta}>Cantidad</span>
          <input
            name="cantidad"
            type="number"
            min={1}
            step={1}
            defaultValue={1}
            required
            className={campo}
          />
        </label>

        <label className="block space-y-1">
          <span className={etiqueta}>Fecha</span>
          <input name="fecha" type="date" defaultValue={hoy} required className={campo} />
        </label>

        {esEntrada ? (
          <>
            <label className="block space-y-1">
              <span className={etiqueta}>Proveedor</span>
              <input name="proveedor" maxLength={120} required className={campo} />
            </label>
            <label className="block space-y-1">
              <span className={etiqueta}>Quién entrega</span>
              <input name="quienEntrega" maxLength={120} required className={campo} />
            </label>
          </>
        ) : (
          <label className="block space-y-1 sm:col-span-2">
            <span className={etiqueta}>Trabajador</span>
            <input name="trabajador" maxLength={120} required className={campo} />
          </label>
        )}

        {mensajeError && (
          <p role="alert" className={`${claseError} sm:col-span-2`}>
            {mensajeError}
          </p>
        )}

        <button
          type="submit"
          disabled={pendiente || items.length === 0}
          className={`${btnPrimario} py-2.5 sm:col-span-2`}
        >
          {pendiente ? "Registrando…" : esEntrada ? "Registrar entrada" : "Registrar salida"}
        </button>

        {items.length === 0 && (
          <p className="text-xs text-faint sm:col-span-2">
            No hay ítems activos en el catálogo todavía.
          </p>
        )}
      </form>

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
            {filas.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={tabla.vacio}>
                  <div className="flex flex-col items-center gap-2 text-faint">
                    <Icono nombre="lista" size={22} grosor={1.6} />
                    <span className="text-[13px]">
                      Todavía no hay {esEntrada ? "entradas" : "salidas"} registradas.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              filas.map((row) => (
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
        {movimientos.length} movimiento(s). Histórico inmutable: no se edita ni se borra.
      </p>
    </div>
  );
}

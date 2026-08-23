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

const campo = "w-full rounded border border-black/20 px-3 py-2 dark:border-white/25";

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
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{esEntrada ? "Entradas" : "Salidas"}</h1>

      <form
        action={formAction}
        onSubmit={validar}
        className="grid gap-3 rounded border border-black/10 p-4 sm:grid-cols-2 dark:border-white/15"
      >
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-sm font-medium">Ítem</span>
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
          <span className="text-sm font-medium">Cantidad</span>
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
          <span className="text-sm font-medium">Fecha</span>
          <input name="fecha" type="date" defaultValue={hoy} required className={campo} />
        </label>

        {esEntrada ? (
          <>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Proveedor</span>
              <input name="proveedor" maxLength={120} required className={campo} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Quién entrega</span>
              <input name="quienEntrega" maxLength={120} required className={campo} />
            </label>
          </>
        ) : (
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-sm font-medium">Trabajador</span>
            <input name="trabajador" maxLength={120} required className={campo} />
          </label>
        )}

        {mensajeError && (
          <p role="alert" className="text-sm text-red-600 sm:col-span-2 dark:text-red-400">
            {mensajeError}
          </p>
        )}

        <button
          type="submit"
          disabled={pendiente || items.length === 0}
          className="rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50 sm:col-span-2"
        >
          {pendiente ? "Registrando…" : esEntrada ? "Registrar entrada" : "Registrar salida"}
        </button>

        {items.length === 0 && (
          <p className="text-sm text-black/60 sm:col-span-2 dark:text-white/60">
            No hay ítems activos en el catálogo todavía.
          </p>
        )}
      </form>

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
            {filas.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-3 py-6 text-center text-black/60 dark:text-white/60"
                >
                  Todavía no hay {esEntrada ? "entradas" : "salidas"} registradas.
                </td>
              </tr>
            ) : (
              filas.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-black/5 last:border-0 dark:border-white/10"
                >
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
        {movimientos.length} movimiento(s). Histórico inmutable: no se edita ni se borra.
      </p>
    </div>
  );
}

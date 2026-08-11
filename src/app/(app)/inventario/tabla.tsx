"use client";

import { useActionState, useMemo, useState } from "react";
import {
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  globalFilteringFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ETIQUETA_NIVEL, type NivelStock } from "@/lib/stock";
import { darDeBajaItem } from "./actions";
import FormularioItem from "./formulario-item";
import GestorCategorias from "./gestor-categorias";
import Modal from "./modal";

export type Fila = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "MATERIAL" | "HERRAMIENTA";
  categoriaId: string;
  categoria: string;
  stock: number;
  umbralMinimo: number;
  umbralCritico: number;
  nivel: NivelStock;
};

export type Categoria = { id: string; nombre: string };

const features = tableFeatures({
  columnFilteringFeature,
  globalFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: { includesString: filterFn_includesString, equalsString: filterFn_equalsString },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: { alphanumeric: sortFn_alphanumeric, text: sortFn_text },
});

const helper = createColumnHelper<typeof features, Fila>();

const COLOR_NIVEL: Record<NivelStock, string> = {
  CRITICO: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300",
  BAJO: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-300",
  NORMAL: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300",
};

function BadgeStock({ nivel }: { nivel: NivelStock }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${COLOR_NIVEL[nivel]}`}>
      {ETIQUETA_NIVEL[nivel]}
    </span>
  );
}

function BotonBaja({ item }: { item: Fila }) {
  const [error, accion, pendiente] = useActionState(darDeBajaItem, "" as string | undefined);

  return (
    <form
      action={accion}
      onSubmit={(e) => {
        if (!confirm(`¿Dar de baja "${item.nombre}"? Dejará de listarse en el inventario.`))
          e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={item.id} />
      <button
        type="submit"
        disabled={pendiente}
        title={error || undefined}
        className="text-red-600 underline underline-offset-4 disabled:opacity-50 dark:text-red-400"
      >
        Dar de baja
      </button>
    </form>
  );
}

export default function TablaInventario({
  filas,
  categorias,
  esAdmin,
}: {
  filas: Fila[];
  categorias: Categoria[];
  esAdmin: boolean;
}) {
  const [editando, setEditando] = useState<Fila | null>(null);
  const [creando, setCreando] = useState(false);
  const [verCategorias, setVerCategorias] = useState(false);

  const columns = useMemo(() => {
    const base = [
      helper.accessor("codigo", { header: "Código" }),
      helper.accessor("nombre", { header: "Nombre" }),
      helper.accessor("tipo", {
        header: "Tipo",
        cell: ({ getValue }) => (getValue() === "MATERIAL" ? "Material" : "Herramienta"),
      }),
      helper.accessor("categoria", { header: "Categoría", filterFn: "equalsString" }),
      helper.accessor("stock", { header: "Stock" }),
      helper.accessor("nivel", {
        header: "Estado",
        cell: ({ getValue }) => <BadgeStock nivel={getValue()} />,
      }),
    ];

    // Las acciones de escritura solo existen para admin; el server action lo
    // vuelve a validar igual.
    if (!esAdmin) return helper.columns(base);

    return helper.columns([
      ...base,
      helper.display({
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex gap-3 text-sm">
            <button
              type="button"
              onClick={() => setEditando(row.original)}
              className="underline underline-offset-4"
            >
              Editar
            </button>
            <BotonBaja item={row.original} />
          </div>
        ),
      }),
    ]);
  }, [esAdmin]);

  const table = useTable(
    {
      features,
      data: filas,
      columns,
      globalFilterFn: "includesString",
      // La búsqueda es por nombre o código, no por toda la fila.
      getColumnCanGlobalFilter: (column) => column.id === "nombre" || column.id === "codigo",
    },
    (state) => ({ globalFilter: state.globalFilter, columnFilters: state.columnFilters }),
  );

  const columnaCategoria = table.getColumn("categoria");
  const filtroCategoria = (columnaCategoria?.getFilterValue() as string | undefined) ?? "";
  const visibles = table.getRowModel().rows;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Inventario</h1>
        <div className="flex flex-wrap gap-3 text-sm">
          <a
            href="/api/inventario/export"
            className="rounded border border-black/20 px-3 py-2 dark:border-white/25"
          >
            Exportar a Excel
          </a>
          {esAdmin && (
            <>
              <button
                type="button"
                onClick={() => setVerCategorias(true)}
                className="rounded border border-black/20 px-3 py-2 dark:border-white/25"
              >
                Categorías
              </button>
              <button
                type="button"
                onClick={() => setCreando(true)}
                className="rounded bg-foreground px-3 py-2 font-medium text-background"
              >
                Nuevo ítem
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          type="search"
          value={table.state.globalFilter ?? ""}
          onChange={(e) => table.setGlobalFilter(e.target.value)}
          placeholder="Buscar por nombre o código…"
          aria-label="Buscar por nombre o código"
          className="min-w-60 flex-1 rounded border border-black/20 px-3 py-2 dark:border-white/25"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => columnaCategoria?.setFilterValue(e.target.value || undefined)}
          aria-label="Filtrar por categoría"
          className="rounded border border-black/20 px-3 py-2 dark:border-white/25"
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 dark:border-white/15">
            {table.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id}>
                {grupo.headers.map((header) => {
                  const ordenable = header.column.getCanSort();
                  const orden = header.column.getIsSorted();
                  return (
                    <th key={header.id} className="px-3 py-2 font-medium">
                      {header.isPlaceholder ? null : ordenable ? (
                        <button
                          type="button"
                          onClick={() => header.column.toggleSorting()}
                          className="flex items-center gap-1"
                        >
                          <table.FlexRender header={header} />
                          {orden === "asc" ? "▲" : orden === "desc" ? "▼" : ""}
                        </button>
                      ) : (
                        <table.FlexRender header={header} />
                      )}
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
                  No hay ítems que coincidan.
                </td>
              </tr>
            ) : (
              visibles.map((row) => (
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
        {visibles.length} de {filas.length} ítem(s).
      </p>

      {esAdmin && (
        <>
          <Modal titulo="Nuevo ítem" abierto={creando} onCerrar={() => setCreando(false)}>
            <FormularioItem
              item={null}
              categorias={categorias}
              onListo={() => setCreando(false)}
            />
          </Modal>

          <Modal
            titulo={`Editar ${editando?.nombre ?? ""}`}
            abierto={editando !== null}
            onCerrar={() => setEditando(null)}
          >
            <FormularioItem
              item={editando}
              categorias={categorias}
              onListo={() => setEditando(null)}
            />
          </Modal>

          <Modal
            titulo="Categorías"
            abierto={verCategorias}
            onCerrar={() => setVerCategorias(false)}
          >
            <GestorCategorias categorias={categorias} />
          </Modal>
        </>
      )}
    </div>
  );
}

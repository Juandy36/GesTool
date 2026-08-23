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
import { type NivelStock } from "@/lib/stock";
import Icono from "@/app/iconos";
import { btnGhost, btnPrimario, campo, tabla, titulo } from "@/app/ui";
import BadgeStock from "../badge-stock";
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
        className="text-xs text-danger underline underline-offset-2 disabled:opacity-50"
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
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditando(row.original)}
              aria-label={`Editar ${row.original.nombre}`}
              title="Editar"
              className="text-muted hover:text-text"
            >
              <Icono nombre="editar" size={14} />
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
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <h1 className={titulo}>Inventario</h1>
        <div className="flex flex-wrap gap-2">
          <a href="/api/inventario/export" className={btnGhost}>
            <Icono nombre="descargar" size={14} grosor={2} />
            Exportar
          </a>
          {esAdmin && (
            <>
              <button type="button" onClick={() => setVerCategorias(true)} className={btnGhost}>
                <Icono nombre="categorias" size={14} grosor={2} />
                Categorías
              </button>
              <button type="button" onClick={() => setCreando(true)} className={btnPrimario}>
                <Icono nombre="mas" size={14} grosor={2.2} />
                Nuevo ítem
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative min-w-55 flex-1">
          <Icono
            nombre="buscar"
            size={14}
            grosor={2}
            className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint"
          />
          <input
            type="search"
            value={table.state.globalFilter ?? ""}
            onChange={(e) => table.setGlobalFilter(e.target.value)}
            placeholder="Buscar por nombre o código…"
            aria-label="Buscar por nombre o código"
            className={`${campo} w-full pl-8`}
          />
        </div>
        <select
          value={filtroCategoria}
          onChange={(e) => columnaCategoria?.setFilterValue(e.target.value || undefined)}
          aria-label="Filtrar por categoría"
          className={campo}
        >
          <option value="">Todas las categorías</option>
          {categorias.map((c) => (
            <option key={c.id} value={c.nombre}>
              {c.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className={tabla.marco}>
        <table className={tabla.base}>
          <thead className={tabla.encabezado}>
            {table.getHeaderGroups().map((grupo) => (
              <tr key={grupo.id}>
                {grupo.headers.map((header) => {
                  const ordenable = header.column.getCanSort();
                  const orden = header.column.getIsSorted();
                  return (
                    <th key={header.id} className={tabla.th}>
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
                <td colSpan={columns.length} className={tabla.vacio}>
                  <div className="flex flex-col items-center gap-2 text-faint">
                    <Icono nombre="buscar" size={22} grosor={1.6} />
                    <span className="text-[13px]">Ningún ítem coincide con la búsqueda.</span>
                  </div>
                </td>
              </tr>
            ) : (
              visibles.map((row) => (
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

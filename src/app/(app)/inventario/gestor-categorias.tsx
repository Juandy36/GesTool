"use client";

import { useActionState } from "react";
import { crearCategoria, eliminarCategoria, renombrarCategoria } from "./actions";
import type { Categoria } from "./tabla";

const INICIAL = "" as string | undefined;

function FilaCategoria({ categoria }: { categoria: Categoria }) {
  const [errorRenombrar, accionRenombrar, renombrando] = useActionState(
    renombrarCategoria,
    INICIAL,
  );
  const [errorEliminar, accionEliminar, eliminando] = useActionState(eliminarCategoria, INICIAL);
  const error = errorRenombrar || errorEliminar;

  return (
    <li className="space-y-1 border-b border-black/10 py-2 dark:border-white/15">
      <div className="flex items-center gap-2">
        <form action={accionRenombrar} className="flex flex-1 items-center gap-2">
          <input type="hidden" name="id" value={categoria.id} />
          <input
            name="nombre"
            defaultValue={categoria.nombre}
            required
            maxLength={80}
            aria-label={`Nombre de ${categoria.nombre}`}
            className="min-w-0 flex-1 rounded border border-black/20 px-2 py-1 text-sm dark:border-white/25"
          />
          <button
            type="submit"
            disabled={renombrando}
            className="shrink-0 text-sm underline underline-offset-4 disabled:opacity-50"
          >
            Renombrar
          </button>
        </form>

        <form action={accionEliminar}>
          <input type="hidden" name="id" value={categoria.id} />
          <button
            type="submit"
            disabled={eliminando}
            className="shrink-0 text-sm text-red-600 underline underline-offset-4 disabled:opacity-50 dark:text-red-400"
          >
            Eliminar
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </li>
  );
}

export default function GestorCategorias({ categorias }: { categorias: Categoria[] }) {
  const [error, accionCrear, creando] = useActionState(crearCategoria, INICIAL);

  return (
    <div className="space-y-4">
      <form action={accionCrear} className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            name="nombre"
            required
            maxLength={80}
            placeholder="Nueva categoría"
            aria-label="Nueva categoría"
            className="min-w-0 flex-1 rounded border border-black/20 px-3 py-2 dark:border-white/25"
          />
          <button
            type="submit"
            disabled={creando}
            className="shrink-0 rounded bg-foreground px-3 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {creando ? "Creando…" : "Crear"}
          </button>
        </div>
        {error && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}
      </form>

      {categorias.length === 0 ? (
        <p className="text-sm text-black/60 dark:text-white/60">Todavía no hay categorías.</p>
      ) : (
        <ul className="max-h-72 overflow-y-auto">
          {categorias.map((c) => (
            <FilaCategoria key={c.id} categoria={c} />
          ))}
        </ul>
      )}
    </div>
  );
}

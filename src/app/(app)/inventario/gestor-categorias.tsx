"use client";

import { useActionState } from "react";
import { btnPrimario, campoChico, error as claseError, campo } from "@/app/ui";
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
    <li className="space-y-1 border-b border-border py-2 last:border-0">
      <div className="flex items-center gap-2">
        <form action={accionRenombrar} className="flex flex-1 items-center gap-2">
          <input type="hidden" name="id" value={categoria.id} />
          <input
            name="nombre"
            defaultValue={categoria.nombre}
            required
            maxLength={80}
            aria-label={`Nombre de ${categoria.nombre}`}
            className={`${campoChico} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={renombrando}
            className="shrink-0 text-xs underline underline-offset-2 disabled:opacity-50"
          >
            Renombrar
          </button>
        </form>

        <form action={accionEliminar}>
          <input type="hidden" name="id" value={categoria.id} />
          <button
            type="submit"
            disabled={eliminando}
            className="shrink-0 text-xs text-danger underline underline-offset-2 disabled:opacity-50"
          >
            Eliminar
          </button>
        </form>
      </div>

      {error && (
        <p role="alert" className="text-xs text-danger">
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
            className={`${campo} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={creando}
            className={`${btnPrimario} shrink-0`}
          >
            {creando ? "Creando…" : "Crear"}
          </button>
        </div>
        {error && (
          <p role="alert" className={claseError}>
            {error}
          </p>
        )}
      </form>

      {categorias.length === 0 ? (
        <p className="text-[13px] text-faint">Todavía no hay categorías.</p>
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

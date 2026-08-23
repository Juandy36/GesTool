"use client";

import { useActionState, useEffect } from "react";
import { btnPrimario, campo, error as claseError, etiqueta } from "@/app/ui";
import { guardarItem } from "./actions";
import type { Categoria, Fila } from "./tabla";

const INICIAL = "" as string | undefined;

/**
 * Sirve para crear y editar. `stock` no está y no debe estar: solo lo mueven
 * las entradas y salidas.
 */
export default function FormularioItem({
  item,
  categorias,
  onListo,
}: {
  item: Fila | null;
  categorias: Categoria[];
  onListo: () => void;
}) {
  const [error, formAction, pending] = useActionState(guardarItem, INICIAL);

  // `undefined` solo aparece cuando la acción corrió y no devolvió error.
  useEffect(() => {
    if (error === undefined) onListo();
  }, [error, onListo]);

  return (
    <form action={formAction} className="space-y-3">
      {item && <input type="hidden" name="id" value={item.id} />}

      <label className="block space-y-1">
        <span className={etiqueta}>Código</span>
        <input
          name="codigo"
          defaultValue={item?.codigo}
          required
          maxLength={40}
          className={campo}
        />
      </label>

      <label className="block space-y-1">
        <span className={etiqueta}>Nombre</span>
        <input
          name="nombre"
          defaultValue={item?.nombre}
          required
          maxLength={120}
          className={campo}
        />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={etiqueta}>Tipo</span>
          <select
            name="tipo"
            defaultValue={item?.tipo ?? "MATERIAL"}
            className={campo}
          >
            <option value="MATERIAL">Material</option>
            <option value="HERRAMIENTA">Herramienta</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className={etiqueta}>Categoría</span>
          <select
            name="categoriaId"
            defaultValue={item?.categoriaId ?? ""}
            required
            className={campo}
          >
            <option value="" disabled>
              Elegir…
            </option>
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1">
          <span className={etiqueta}>Umbral mínimo</span>
          <input
            name="umbralMinimo"
            type="number"
            min={0}
            defaultValue={item?.umbralMinimo ?? 0}
            required
            className={campo}
          />
        </label>

        <label className="block space-y-1">
          <span className={etiqueta}>Umbral crítico</span>
          <input
            name="umbralCritico"
            type="number"
            min={0}
            defaultValue={item?.umbralCritico ?? 0}
            required
            className={campo}
          />
        </label>
      </div>

      <p className="text-xs text-faint">
        {item
          ? `Stock actual: ${item.stock}. Solo cambia registrando entradas o salidas.`
          : "El stock arranca en 0: se carga registrando una entrada."}
      </p>

      {error && (
        <p role="alert" className={claseError}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${btnPrimario} w-full py-2.5`}
      >
        {pending ? "Guardando…" : item ? "Guardar cambios" : "Crear ítem"}
      </button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useActionState } from "react";
import { btnGhost, btnPrimario, campo, error as claseError, etiqueta } from "@/app/ui";
import { restablecerPassword } from "../../actions";

export default function FormularioReset({ id, nombre }: { id: string; nombre: string }) {
  const [error, accion, pendiente] = useActionState(restablecerPassword, "" as string | undefined);

  return (
    <form action={accion} className="space-y-3">
      <input type="hidden" name="id" value={id} />

      <label className="flex flex-col gap-1.5">
        <span className={etiqueta}>Contraseña nueva</span>
        {/* `type="text"` a propósito: el admin la anota y se la entrega. Por eso
            tampoco hay campo de confirmación — se lee mientras se escribe. */}
        <input
          name="password"
          type="text"
          required
          minLength={8}
          autoComplete="off"
          autoFocus
          aria-label={`Nueva contraseña de ${nombre}`}
          className={`${campo} w-full`}
        />
        <span className="text-[11.5px] text-faint">Mínimo 8 caracteres.</span>
      </label>

      {error && (
        <p role="alert" className={claseError}>
          {error}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button type="submit" disabled={pendiente} className={`${btnPrimario} flex-1 py-2.5`}>
          {pendiente ? "Restableciendo…" : "Restablecer contraseña"}
        </button>
        <Link href="/usuarios" className={btnGhost}>
          Cancelar
        </Link>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { btnPrimario, campo as campoBase, error as claseError, etiqueta } from "@/app/ui";
import { cambiarPassword } from "./actions";

const campos = [
  { name: "actual", label: "Contraseña actual", autoComplete: "current-password" },
  { name: "nueva", label: "Nueva contraseña", autoComplete: "new-password" },
  { name: "confirmacion", label: "Confirmar nueva contraseña", autoComplete: "new-password" },
];

export default function CambiarPasswordForm() {
  const [error, formAction, pending] = useActionState(cambiarPassword, undefined);

  return (
    <form action={formAction} className="space-y-3">
      {campos.map((campo) => (
        <label key={campo.name} className="flex flex-col gap-1.5">
          <span className={etiqueta}>{campo.label}</span>
          <input
            name={campo.name}
            type="password"
            required
            autoComplete={campo.autoComplete}
            className={`${campoBase} w-full`}
          />
        </label>
      ))}

      {error && (
        <p role="alert" className={claseError}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className={`${btnPrimario} mt-2 w-full py-2.5`}
      >
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import { cambiarPassword } from "./actions";

const campos = [
  { name: "actual", label: "Contraseña actual", autoComplete: "current-password" },
  { name: "nueva", label: "Nueva contraseña", autoComplete: "new-password" },
  { name: "confirmacion", label: "Confirmar nueva contraseña", autoComplete: "new-password" },
];

export default function CambiarPasswordForm() {
  const [error, formAction, pending] = useActionState(cambiarPassword, undefined);

  return (
    <form action={formAction} className="space-y-4">
      {campos.map((campo) => (
        <label key={campo.name} className="block space-y-1">
          <span className="text-sm font-medium">{campo.label}</span>
          <input
            name={campo.name}
            type="password"
            required
            autoComplete={campo.autoComplete}
            className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/25"
          />
        </label>
      ))}

      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded bg-foreground px-4 py-2 font-medium text-background disabled:opacity-50"
      >
        {pending ? "Guardando…" : "Cambiar contraseña"}
      </button>
    </form>
  );
}

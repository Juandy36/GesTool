"use client";

import { useActionState } from "react";
import { iniciarSesion } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(iniciarSesion, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <form
        action={formAction}
        className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 p-6 dark:border-white/15"
      >
        <div>
          <h1 className="text-2xl font-semibold">GesTool</h1>
          <p className="text-sm text-black/60 dark:text-white/60">
            Ingresa con tu usuario y contraseña.
          </p>
        </div>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Usuario</span>
          <input
            name="usuario"
            type="text"
            required
            autoComplete="username"
            autoFocus
            className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/25"
          />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Contraseña</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded border border-black/20 px-3 py-2 dark:border-white/25"
          />
        </label>

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
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

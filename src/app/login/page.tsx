"use client";

import { useActionState } from "react";
import Icono from "@/app/iconos";
import { btnPrimario, campo, error as claseError, etiqueta, fondoAuth, tarjetaAuth } from "@/app/ui";
import { iniciarSesion } from "./actions";

export default function LoginPage() {
  const [error, formAction, pending] = useActionState(iniciarSesion, undefined);

  return (
    <main className={fondoAuth}>
      <form action={formAction} className={tarjetaAuth}>
        <div className="mb-6 flex flex-col items-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-[10px] bg-invert text-invert-text">
            <Icono nombre="caja" size={22} grosor={2} />
          </span>
          <span className="text-base font-semibold">GesTool</span>
          <span className="text-[12.5px] text-muted">Ingresa con tu usuario y contraseña</span>
        </div>

        <label className="mb-3 flex flex-col gap-1.5">
          <span className={etiqueta}>Usuario</span>
          <input
            name="usuario"
            type="text"
            required
            autoComplete="username"
            autoFocus
            placeholder="admin"
            className={`${campo} w-full`}
          />
        </label>

        <label className="mb-5 flex flex-col gap-1.5">
          <span className={etiqueta}>Contraseña</span>
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className={`${campo} w-full`}
          />
        </label>

        {error && (
          <p role="alert" className={`${claseError} mb-3`}>
            {error}
          </p>
        )}

        <button type="submit" disabled={pending} className={`${btnPrimario} w-full py-2.5`}>
          {pending ? "Entrando…" : "Ingresar"}
        </button>
      </form>
    </main>
  );
}

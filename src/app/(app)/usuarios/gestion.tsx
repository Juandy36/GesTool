"use client";

import { useActionState } from "react";
import { comoDdMmAaaa } from "@/lib/fechas";
import { crearUsuario, restablecerPassword } from "./actions";

export type FilaUsuario = {
  id: string;
  usuario: string;
  nombre: string;
  rol: "ADMIN" | "BODEGUERO";
  activo: boolean;
  debeCambiarPassword: boolean;
  creadoEn: string;
};

const INICIAL = "" as string | undefined;

const campo = "w-full rounded border border-black/20 px-3 py-2 dark:border-white/25";
const boton = "rounded bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50";

/**
 * Los dos formularios van en un `<details>` en vez de un modal: el navegador ya
 * sabe abrir y cerrar, y así quedan en el HTML del servidor — un modal que
 * monta sus hijos al abrirse no se puede probar sin un navegador de verdad.
 */
function Aviso({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {mensaje}
    </p>
  );
}

function FormularioNuevo() {
  const [error, accion, pendiente] = useActionState(crearUsuario, INICIAL);

  return (
    <details className="rounded border border-black/10 dark:border-white/15">
      <summary className="cursor-pointer px-4 py-3 font-medium">Nuevo usuario</summary>

      <form action={accion} className="grid gap-3 border-t border-black/10 p-4 sm:grid-cols-2 dark:border-white/15">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Usuario</span>
          <input name="usuario" required minLength={3} maxLength={40} autoComplete="off" className={campo} />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Nombre</span>
          <input name="nombre" required maxLength={120} className={campo} />
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Rol</span>
          <select name="rol" defaultValue="BODEGUERO" className={campo}>
            <option value="BODEGUERO">Bodeguero</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Contraseña inicial</span>
          {/* `type="text"` a propósito: el admin la anota y se la entrega. El
              dueño de la cuenta la cambia en el primer inicio de sesión. */}
          <input name="password" type="text" required minLength={8} autoComplete="off" className={campo} />
        </label>

        <Aviso mensaje={error} />

        <div className="sm:col-span-2">
          <button type="submit" disabled={pendiente} className={boton}>
            {pendiente ? "Creando…" : "Crear usuario"}
          </button>
        </div>
      </form>
    </details>
  );
}

function FilaUsuario({ usuario }: { usuario: FilaUsuario }) {
  const [error, accion, pendiente] = useActionState(restablecerPassword, INICIAL);

  return (
    <tr className="border-b border-black/5 align-top last:border-0 dark:border-white/10">
      <td className="px-3 py-2">{usuario.nombre}</td>
      <td className="px-3 py-2">{usuario.usuario}</td>
      <td className="px-3 py-2">{usuario.rol === "ADMIN" ? "Administrador" : "Bodeguero"}</td>
      <td className="px-3 py-2">{comoDdMmAaaa(usuario.creadoEn)}</td>
      <td className="px-3 py-2 text-black/60 dark:text-white/60">
        {!usuario.activo ? "Inactivo" : usuario.debeCambiarPassword ? "Debe cambiar clave" : "Activo"}
      </td>
      <td className="px-3 py-2">
        <details>
          <summary className="cursor-pointer underline underline-offset-4">
            Restablecer contraseña
          </summary>
          <form action={accion} className="mt-2 space-y-2">
            <input type="hidden" name="id" value={usuario.id} />
            <input
              name="password"
              type="text"
              required
              minLength={8}
              autoComplete="off"
              placeholder="Nueva contraseña"
              aria-label={`Nueva contraseña de ${usuario.nombre}`}
              className={campo}
            />
            <Aviso mensaje={error} />
            <button type="submit" disabled={pendiente} className={boton}>
              {pendiente ? "Restableciendo…" : "Restablecer"}
            </button>
          </form>
        </details>
      </td>
    </tr>
  );
}

export default function GestionUsuarios({ usuarios }: { usuarios: FilaUsuario[] }) {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Usuarios</h1>

      <FormularioNuevo />

      <div className="overflow-x-auto rounded border border-black/10 dark:border-white/15">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-black/10 dark:border-white/15">
            <tr>
              <th className="px-3 py-2 font-medium">Nombre</th>
              <th className="px-3 py-2 font-medium">Usuario</th>
              <th className="px-3 py-2 font-medium">Rol</th>
              <th className="px-3 py-2 font-medium">Alta</th>
              <th className="px-3 py-2 font-medium">Estado</th>
              <th className="px-3 py-2 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <FilaUsuario key={u.id} usuario={u} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-black/60 dark:text-white/60">
        Toda contraseña que pone un administrador es de un solo uso: el dueño de la cuenta debe
        cambiarla al entrar.
      </p>
    </div>
  );
}

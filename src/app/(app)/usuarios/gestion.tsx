"use client";

import Link from "next/link";
import { useActionState } from "react";
import { comoDdMmAaaa } from "@/lib/fechas";
import Icono from "@/app/iconos";
import { btnPrimario, campo as campoBase, error as claseError, etiqueta, tabla, titulo } from "@/app/ui";
import { crearUsuario } from "./actions";

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

const campo = `${campoBase} w-full`;
const boton = btnPrimario;

/**
 * Los dos formularios van en un `<details>` en vez de un modal: el navegador ya
 * sabe abrir y cerrar, y así quedan en el HTML del servidor — un modal que
 * monta sus hijos al abrirse no se puede probar sin un navegador de verdad.
 */
function Aviso({ mensaje }: { mensaje?: string }) {
  if (!mensaje) return null;
  return (
    <p role="alert" className={claseError}>
      {mensaje}
    </p>
  );
}

function FormularioNuevo() {
  const [error, accion, pendiente] = useActionState(crearUsuario, INICIAL);

  return (
    <details className="rounded-[10px] border border-border bg-surface">
      <summary className="flex cursor-pointer items-center gap-2 px-4 py-3 text-[13px] font-medium">
        <Icono nombre="mas" size={14} grosor={2.2} />
        Nuevo usuario
      </summary>

      <form action={accion} className="grid gap-3 border-t border-border p-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className={etiqueta}>Usuario</span>
          <input name="usuario" required minLength={3} maxLength={40} autoComplete="off" className={campo} />
        </label>

        <label className="block space-y-1">
          <span className={etiqueta}>Nombre</span>
          <input name="nombre" required maxLength={120} className={campo} />
        </label>

        <label className="block space-y-1">
          <span className={etiqueta}>Rol</span>
          <select name="rol" defaultValue="BODEGUERO" className={campo}>
            <option value="BODEGUERO">Bodeguero</option>
            <option value="ADMIN">Administrador</option>
          </select>
        </label>

        <label className="block space-y-1">
          <span className={etiqueta}>Contraseña inicial</span>
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
  return (
    <tr className={tabla.fila}>
      <td className={tabla.td}>{usuario.nombre}</td>
      <td className={tabla.td}>{usuario.usuario}</td>
      <td className={tabla.td}>{usuario.rol === "ADMIN" ? "Administrador" : "Bodeguero"}</td>
      <td className={tabla.td}>{comoDdMmAaaa(usuario.creadoEn)}</td>
      <td className={`${tabla.td} text-muted`}>
        {!usuario.activo ? "Inactivo" : usuario.debeCambiarPassword ? "Debe cambiar clave" : "Activo"}
      </td>
      <td className={tabla.td}>
        <Link
          href={`/usuarios/${usuario.id}/restablecer`}
          className="text-xs text-muted underline underline-offset-2 hover:text-text"
        >
          Restablecer contraseña
        </Link>
      </td>
    </tr>
  );
}

export default function GestionUsuarios({ usuarios }: { usuarios: FilaUsuario[] }) {
  return (
    <div className="space-y-4">
      <h1 className={titulo}>Usuarios</h1>

      <FormularioNuevo />

      <div className={tabla.marco}>
        <table className={tabla.base}>
          <thead className={tabla.encabezado}>
            <tr>
              <th className={tabla.th}>Nombre</th>
              <th className={tabla.th}>Usuario</th>
              <th className={tabla.th}>Rol</th>
              <th className={tabla.th}>Alta</th>
              <th className={tabla.th}>Estado</th>
              <th className={tabla.th}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <FilaUsuario key={u.id} usuario={u} />
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-faint">
        Toda contraseña que pone un administrador es de un solo uso: el dueño de la cuenta debe
        cambiarla al entrar.
      </p>
    </div>
  );
}

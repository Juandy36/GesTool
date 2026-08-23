"use client";

import { useTheme } from "next-themes";
import Icono from "@/app/iconos";

/**
 * El ícono lo elige el CSS y no el estado de React: así no hace falta el flag
 * de `mounted` que suele necesitarse para no dibujar el ícono equivocado antes
 * de hidratar.
 */
export default function BotonTema() {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Cambiar tema"
      title="Cambiar tema"
      className="flex size-8 items-center justify-center rounded-md border border-border text-muted hover:text-text"
    >
      <Icono nombre="luna" size={15} className="dark:hidden" />
      <Icono nombre="sol" size={15} className="hidden dark:block" />
    </button>
  );
}

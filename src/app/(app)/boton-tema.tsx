"use client";

import { useTheme } from "next-themes";

/**
 * Qué ícono se ve lo decide CSS con la variante `dark:`, no estado de React.
 * Así el marcado del servidor y el del cliente son idénticos y no hace falta
 * el típico flag de `mounted` para evitar el error de hidratación.
 */
export default function BotonTema() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Cambiar entre tema claro y oscuro"
      title="Cambiar tema"
      className="rounded border border-black/20 px-2 py-1 leading-none dark:border-white/25"
    >
      <span className="dark:hidden">🌙</span>
      <span className="hidden dark:inline">☀️</span>
    </button>
  );
}

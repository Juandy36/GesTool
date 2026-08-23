"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inventario", label: "Inventario" },
  { href: "/entradas", label: "Entradas" },
  { href: "/salidas", label: "Salidas" },
];

/**
 * Cliente solo por `usePathname()`, para marcar el link activo.
 *
 * En pantallas angostas es una fila horizontal scrolleable en vez de una barra
 * lateral: no hay drawer ni botón de menú porque con cuatro links no hace falta.
 */
export default function Sidebar() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="flex shrink-0 gap-1 overflow-x-auto border-b border-black/10 p-3 md:w-52 md:flex-col md:overflow-visible md:border-r md:border-b-0 dark:border-white/15"
    >
      <span className="hidden px-3 pb-3 text-lg font-semibold md:block">GesTool</span>
      {LINKS.map(({ href, label }) => {
        const activo = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={`shrink-0 rounded px-3 py-2 text-sm ${
              activo
                ? "bg-foreground font-medium text-background"
                : "hover:bg-black/5 dark:hover:bg-white/10"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

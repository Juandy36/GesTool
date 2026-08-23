"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icono, { type NombreIcono } from "@/app/iconos";

const LINKS: { href: string; label: string; icono: NombreIcono; soloAdmin?: boolean }[] = [
  { href: "/dashboard", label: "Dashboard", icono: "dashboard" },
  { href: "/inventario", label: "Inventario", icono: "caja" },
  { href: "/entradas", label: "Entradas", icono: "entrada" },
  { href: "/salidas", label: "Salidas", icono: "salida" },
  { href: "/reportes", label: "Reportes", icono: "reporte" },
  // Esconder el link no protege nada: la página y las actions validan el rol igual.
  { href: "/usuarios", label: "Usuarios", icono: "usuarios", soloAdmin: true },
];

function visibles(esAdmin: boolean) {
  return LINKS.filter((l) => esAdmin || !l.soloAdmin);
}

function esActivo(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Barra lateral de escritorio. Cliente solo por `usePathname()`. */
export default function Sidebar({
  esAdmin,
  nombre,
  rol,
}: {
  esAdmin: boolean;
  nombre: string;
  rol: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="hidden w-52 shrink-0 flex-col border-r border-border bg-surface px-3 py-4 md:flex"
    >
      <div className="flex items-center gap-2 px-2 pt-1 pb-5">
        <span className="flex size-[26px] items-center justify-center rounded-[7px] bg-invert text-invert-text">
          <Icono nombre="caja" size={15} grosor={2} />
        </span>
        <span className="text-[14.5px] font-semibold">GesTool</span>
      </div>

      <div className="flex flex-col gap-0.5">
        {visibles(esAdmin).map(({ href, label, icono }) => {
          const activo = esActivo(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={activo ? "page" : undefined}
              className={`flex items-center gap-[9px] rounded-[7px] px-2.5 py-2 text-[13px] ${
                activo
                  ? "bg-invert font-medium text-invert-text"
                  : "text-text hover:bg-surface-alt"
              }`}
            >
              <Icono nombre={icono} />
              {label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto border-t border-border px-2 pt-2.5">
        <p className="text-[12.5px] font-medium">{nombre}</p>
        <p className="text-[11px] text-faint">Rol: {rol}</p>
      </div>
    </nav>
  );
}

/**
 * Navegación de móvil: barra de tabs abajo, donde llega el pulgar. Reemplaza la
 * fila scrolleable de antes. Al admin le entran seis tabs en vez de cinco —
 * sin eso /usuarios quedaría inalcanzable desde el teléfono.
 */
export function TabsMovil({ esAdmin }: { esAdmin: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Secciones"
      className="flex shrink-0 border-t border-border bg-surface md:hidden"
    >
      {visibles(esAdmin).map(({ href, label, icono }) => {
        const activo = esActivo(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={activo ? "page" : undefined}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 ${
              activo ? "text-text" : "text-faint"
            }`}
          >
            <Icono nombre={icono} size={18} />
            <span className="text-[10px]">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

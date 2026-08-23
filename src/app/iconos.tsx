/**
 * Íconos del rediseño. Un solo componente con un mapa de trazos en vez de un
 * export por ícono: son todos el mismo `<svg>` de 24x24 con `currentColor`, y
 * varios se usan en dos lugares (el nav lateral y las tabs de móvil).
 */
export type NombreIcono = keyof typeof TRAZOS;

const TRAZOS = {
  dashboard: (
    <>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v10h14V10" />
    </>
  ),
  caja: (
    <>
      <path d="M3 7l9-4 9 4-9 4-9-4z" />
      <path d="M3 7v10l9 4 9-4V7" />
      <path d="M12 11v10" />
    </>
  ),
  entrada: (
    <>
      <line x1="12" y1="4" x2="12" y2="15" />
      <polyline points="6 10 12 16 18 10" />
      <line x1="5" y1="20" x2="19" y2="20" />
    </>
  ),
  salida: (
    <>
      <line x1="12" y1="20" x2="12" y2="9" />
      <polyline points="6 14 12 8 18 14" />
      <line x1="5" y1="4" x2="19" y2="4" />
    </>
  ),
  reporte: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="1.5" />
      <line x1="8" y1="8" x2="16" y2="8" />
      <line x1="8" y1="12" x2="16" y2="12" />
      <line x1="8" y1="16" x2="13" y2="16" />
    </>
  ),
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" />
      <circle cx="17.5" cy="9" r="2.3" />
      <path d="M16.3 14.1c2.4.5 4.2 2.5 4.2 5.9" />
    </>
  ),
  alerta: (
    <>
      <path d="M12 3l10 18H2z" />
      <line x1="12" y1="9" x2="12" y2="14" />
    </>
  ),
  descargar: (
    <>
      <path d="M12 3v12" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="5" y1="20" x2="19" y2="20" />
    </>
  ),
  mas: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  buscar: (
    <>
      <circle cx="11" cy="11" r="7" />
      <line x1="21" y1="21" x2="16.5" y2="16.5" />
    </>
  ),
  editar: <path d="M4 20l4-1 11-11-3-3L5 16l-1 4z" />,
  categorias: (
    <>
      <rect x="3" y="4" width="18" height="4" />
      <rect x="5" y="8" width="14" height="12" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </>
  ),
  llave: (
    <>
      <circle cx="8" cy="15" r="4" />
      <line x1="10.8" y1="12.2" x2="20" y2="3" />
      <line x1="16" y1="7" x2="19" y2="10" />
    </>
  ),
  lista: (
    <>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="7" y1="12" x2="17" y2="12" />
      <line x1="10" y1="18" x2="14" y2="18" />
    </>
  ),
  sinRed: (
    <>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M5 12.5a13 13 0 0 1 5-3" />
      <path d="M16 9.5a13 13 0 0 1 3 2.6" />
      <path d="M8.5 16a7 7 0 0 1 7-1.8" />
      <circle cx="12" cy="20" r="1" />
    </>
  ),
  sol: (
    <>
      <circle cx="12" cy="12" r="4" />
      <line x1="12" y1="2" x2="12" y2="5" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="2" y1="12" x2="5" y2="12" />
      <line x1="19" y1="12" x2="22" y2="12" />
      <line x1="4.6" y1="4.6" x2="6.7" y2="6.7" />
      <line x1="17.3" y1="17.3" x2="19.4" y2="19.4" />
      <line x1="4.6" y1="19.4" x2="6.7" y2="17.3" />
      <line x1="17.3" y1="6.7" x2="19.4" y2="4.6" />
    </>
  ),
  luna: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z" />,
  menu: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>
  ),
};

export default function Icono({
  nombre,
  size = 16,
  grosor = 1.8,
  className,
}: {
  nombre: NombreIcono;
  size?: number;
  grosor?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={grosor}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

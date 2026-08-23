import type { MetadataRoute } from "next";

/**
 * Next sirve esto en `/manifest.webmanifest` y lo enlaza solo desde el <head>:
 * por eso no hay `public/manifest.json` ni un <link rel="manifest"> a mano.
 *
 * Los colores son los mismos que `globals.css`. Los íconos se generan con
 * `pnpm tsx scripts/generar-iconos.ts`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GesTool — Gestión de inventario",
    short_name: "GesTool",
    description: "Catálogo de bodega, entradas y salidas, reportes y auditoría.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    lang: "es",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // El mismo archivo sirve de maskable: el dibujo vive dentro del 80%
      // central, así que Android lo puede recortar a su forma sin comerse nada.
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}

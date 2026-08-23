import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ProveedorTema from "./proveedor-tema";
import RegistrarSW from "./registrar-sw";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GesTool",
  description: "Gestión de inventario de bodega: catálogo, entradas, salidas y reportes.",
  // iOS no lee el manifest: la barra de estado y el nombre del ícono salen de acá.
  appleWebApp: { capable: true, title: "GesTool", statusBarStyle: "black-translucent" },
};

/**
 * El color de la barra del navegador sigue al tema, igual que `globals.css`.
 * El `theme_color` del manifest es uno solo (el oscuro): es el que usa la
 * splash de Android al instalar, y no acepta media queries.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // `suppressHydrationWarning`: next-themes escribe la clase del tema en
    // <html> antes de hidratar, así que el servidor y el cliente no coinciden
    // en ese atributo a propósito.
    <html
      lang="es"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ProveedorTema>{children}</ProveedorTema>
        <RegistrarSW />
      </body>
    </html>
  );
}

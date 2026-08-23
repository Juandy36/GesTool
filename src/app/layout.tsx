import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ProveedorTema from "./proveedor-tema";

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
      </body>
    </html>
  );
}

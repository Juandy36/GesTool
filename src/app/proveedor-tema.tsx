"use client";

import { ThemeProvider } from "next-themes";

/**
 * `ThemeProvider` necesita cliente, y el layout raíz es un server component:
 * este archivo existe solo para poner la frontera. Va en la raíz y no en
 * `(app)` para que `/login` y `/cambiar-password` también respeten el tema.
 */
export default function ProveedorTema({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </ThemeProvider>
  );
}

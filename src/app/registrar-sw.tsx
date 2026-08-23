"use client";

import { useEffect } from "react";

/**
 * Registra `/sw.js`. Va en el layout raíz para que la app sea instalable desde
 * cualquier ruta, incluido `/login`, que es donde la va a instalar la mayoría.
 */
export default function RegistrarSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    // Si falla no hay nada que hacer: la app funciona igual, solo no se instala.
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, []);

  return null;
}

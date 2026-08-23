import type { NextConfig } from "next";

/**
 * Dominios de los túneles con los que se prueba desde el celular: el port
 * forwarding de VS Code publica en `*.devtunnels.ms` y Codespaces en
 * `*.app.github.dev`. El `**` matchea todos los subdominios que arman esos
 * servicios (`abc123-3000.use2.devtunnels.ms`); un `*` solo matchea una
 * etiqueta y se quedaría corto.
 */
const TUNELES = ["**.devtunnels.ms", "**.app.github.dev"];

/**
 * Solo en desarrollo. El chequeo CSRF de las Server Actions compara el header
 * `Origin` contra `Host`/`X-Forwarded-Host`, y detrás del túnel el navegador
 * manda el dominio público mientras Next ve `localhost:3000`: no coinciden y
 * aborta con "Invalid Server Actions request.". Dejar esta lista en producción
 * sería aceptar acciones autenticadas desde otro origen, que es justo lo que el
 * chequeo evita.
 */
const nextConfig: NextConfig = {
  ...(process.env.NODE_ENV !== "production" && {
    allowedDevOrigins: TUNELES,
    experimental: { serverActions: { allowedOrigins: TUNELES } },
  }),
};

export default nextConfig;

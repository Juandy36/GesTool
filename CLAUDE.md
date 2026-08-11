# CLAUDE.md

Contexto para Claude Code en este repositorio. Ver también
[funciones.md](./funciones.md) (funcionalidades de negocio) y
[README.md](./README.md) (setup y estructura).

## Package manager: pnpm, siempre

- **Prohibido** `npm` y `yarn`, y prohibido versionar `package-lock.json` o
  `yarn.lock`. Solo `pnpm-lock.yaml`.
- Si aparece un `package-lock.json` por error (ej. alguien corrió `npm
  install`), borrarlo y regenerar con `pnpm install`.

Comandos frecuentes:

```bash
pnpm install                       # instalar deps
pnpm add <pkg>                     # agregar dependencia
pnpm add -D <pkg>                  # agregar dev dependency
pnpm dev                           # servidor de desarrollo
pnpm build                         # build de producción
pnpm lint                          # lint

pnpm db:migrate                    # crear/aplicar migración en dev
pnpm db:seed                       # crear el admin inicial
pnpm db:studio                     # explorar la DB
pnpm db:reset                      # BORRA la DB y re-siembra (pedir confirmación antes)
pnpm check:login                   # check end-to-end del login (requiere `pnpm dev` arriba)
pnpm dlx prisma generate           # regenerar Prisma Client
```

Prisma 7 exige driver adapter: `new PrismaClient({ adapter: new PrismaPg({ ... }) })`.
El cliente se genera en `src/generated/prisma/` (gitignored), se importa desde
`@/generated/prisma/client` y los enums desde `@/generated/prisma/enums`.

## Convenciones de código

- **Componentes:** React Server Components por defecto en `app/`; agregar
  `"use client"` solo cuando se necesite estado, efectos o handlers de
  eventos.
- **Nombres de archivo:** `kebab-case.tsx` para componentes y utilidades
  (ej. `stock-badge.tsx`), carpetas de rutas en `app/` en minúsculas.
  Componente exportado en PascalCase.
- **Tipos:** TypeScript estricto (`strict: true`). Tipos de datos derivados
  del schema de Prisma (`import type { Usuario } from "@/generated/prisma/models"`),
  no duplicar shapes a mano. Validación de entrada (forms, API routes) con
  esquemas Zod; inferir el tipo con `z.infer<typeof schema>` en vez de
  declararlo aparte.
- **Errores:** en API routes / server actions, validar con Zod al inicio y
  devolver 4xx con mensaje claro si falla; no dejar que un error de Prisma
  llegue crudo al cliente. No usar `any` para silenciar errores de tipos.

## Autenticación

- **No hay `middleware.ts` y es a propósito.** El guard de sesión vive en
  `src/app/(app)/layout.tsx`. Middleware corre en Edge, donde Prisma no
  funciona, y obligaría a partir la config de NextAuth en dos archivos.
  Toda ruta protegida va dentro del grupo `(app)`.
- Sesión por **JWT**, sin adapter ni tablas de NextAuth. `rol` y
  `debeCambiarPassword` viajan en el token.
- El token no se refresca solo: al cambiar la contraseña se hace `signOut`
  para que el flag `debeCambiarPassword` se recalcule en el próximo login.
- `/cambiar-password` vive **fuera** del grupo `(app)` a propósito: si
  estuviera dentro, el propio guard la redirigiría a sí misma en bucle.

## Reglas de Git — estrictas

- `main`: producción, protegida. Solo se actualiza vía Pull Request desde
  `dev`. Nunca commit ni push directo a `main`.
- `dev`: integración. Recibe merges de ramas `feat/*` ya terminadas y
  probadas.
- `feat/<nombre-feature>`: una rama por funcionalidad, creada desde `dev`.
  No mezclar features sin relación en la misma rama.
- No mergear una `feat/*` a `dev` si la funcionalidad está incompleta o sin
  probar.
- No usar `--force` sobre `main`/`dev`, no hacer `rebase -i` de historia ya
  compartida.

## Modelo de datos / funcionalidades (resumen de funciones.md)

**Roles:** `admin`, `bodeguero`. Todo lo no marcado "solo administrador" es
para ambos roles.

**Entidades principales:**

- **Usuario**: credenciales, rol, flag de cambio de contraseña obligatorio
  en primer acceso. Solo admin crea usuarios y edita el rol de otros; un
  usuario siempre puede cambiar su propia contraseña.
- **Item** (material o herramienta): código, nombre, categoría, stock
  actual, umbral mínimo, umbral crítico, estado (activo / dado de baja
  lógicamente — nunca se borra físicamente). El stock **nunca se edita a
  mano**: solo cambia como efecto de registrar una Entrada o una Salida.
- **Categoría**: crear, renombrar, eliminar — solo admin.
- **Entrada** (recepción de mercancía): ítem, cantidad, fecha, proveedor,
  quién entrega. Es un libro histórico *append-only*: no se edita ni se
  borra una vez creada.
- **Salida** (entrega a trabajador): ítem, cantidad, fecha, nombre del
  trabajador (obligatorio). También append-only.
- **Auditoría** (solo admin): registro de quién hizo qué y cuándo (logins,
  altas, bajas, ediciones, movimientos), filtrable por usuario y rango de
  fechas, exportable a Excel.

**Semáforo de stock:** normal / bajo mínimo / crítico, calculado a partir de
`stock` vs `umbralMinimo`/`umbralCritico` del ítem — no es un campo que se
setee manualmente.

**Dashboard:** conteos de catálogo, ítems bajo mínimo/crítico, entradas y
salidas del día, listado de reposición ordenado por urgencia, últimos
movimientos combinados (entradas + salidas).

**Exportaciones:** inventario y auditoría a Excel (ExcelJS/XLSX), siempre
como archivo descargable generado en el momento (no se guarda en disco).

**Preferencia de tema** (claro/oscuro) persiste entre sesiones — asociarla
al usuario o a localStorage, no recalcular por request.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

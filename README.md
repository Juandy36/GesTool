# GesTool

Sistema de gestión de inventario de bodega (materiales y herramientas), con
control de entradas/salidas, alertas de stock mínimo/crítico, auditoría y
reportes exportables a Excel. Dos roles: **administrador** y **bodeguero**.

Ver [funciones.md](./funciones.md) para el detalle de funcionalidades por
sección, y [CLAUDE.md](./CLAUDE.md) para las convenciones de código.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) + TypeScript |
| Estilos | Tailwind CSS v4 |
| Tema claro/oscuro | next-themes |
| ORM / DB | Prisma 7 + PostgreSQL |
| Autenticación | NextAuth.js v5 (JWT) + bcryptjs |
| Validación | Zod 4 |
| Tabla de datos | TanStack Table v9 |
| Exportación Excel | ExcelJS |
| PWA | `app/manifest.ts` nativo + service worker propio |
| Package manager | pnpm (obligatorio) |

## No hay backend aparte

**Es una sola aplicación Next.js.** No hay un servidor Express ni una API
separada que haya que levantar en otra terminal: el "backend" son los Server
Components, las Server Actions y los Route Handlers, todos dentro de `src/app/`.

Lo único externo es **PostgreSQL**. Con la base corriendo, un solo comando
levanta todo:

```bash
pnpm dev          # http://localhost:3000
```

## Requisitos previos

- Node.js 20+
- pnpm (`corepack enable` o `npm i -g pnpm`)
- PostgreSQL corriendo en local
- En Windows: **Git Bash**, para los checks `.sh` (ver más abajo)

## Puesta en marcha

```bash
pnpm install
cp .env.example .env       # completar DATABASE_URL
pnpm dlx auth secret       # genera AUTH_SECRET y lo escribe en .env
createdb gestool           # o crearla desde pgAdmin / psql
pnpm db:migrate            # aplica las migraciones
pnpm db:seed               # usuarios iniciales + catálogo de ejemplo
pnpm dev
```

El seed crea dos cuentas, ambas con la contraseña de `SEED_ADMIN_PASSWORD`
(`admin123` por defecto) y con **cambio de contraseña obligatorio** en el primer
acceso:

| Usuario | Rol | Para qué |
|---|---|---|
| `admin` | ADMIN | Todo: catálogo, categorías, usuarios, auditoría |
| `bodeguero` | BODEGUERO | Consulta + registrar entradas y salidas |

Además siembra 4 categorías, 10 ítems y sus movimientos, calibrados para que el
semáforo muestre los tres niveles (normal / bajo mínimo / crítico) y para que el
dashboard tenga movimientos del día.

## Comandos

### Desarrollo

| Comando | Qué hace |
|---|---|
| `pnpm dev` | Servidor de desarrollo en `http://localhost:3000` |
| `pnpm build` | Build de producción |
| `pnpm start` | Sirve el build (requiere `pnpm build` antes) |
| `pnpm lint` | ESLint |
| `pnpm exec tsc --noEmit` | Chequeo de tipos |

### Base de datos

| Comando | Qué hace |
|---|---|
| `pnpm db:migrate` | Crea y aplica una migración con los cambios del schema |
| `pnpm db:seed` | Usuarios iniciales + catálogo de ejemplo (idempotente) |
| `pnpm db:studio` | Explorador visual de la base |
| `pnpm db:reset` | **BORRA la base** y re-siembra. Pedir confirmación antes |
| `pnpm dlx prisma generate` | Regenera el cliente Prisma |

> Migrar **no** regenera el cliente solo. Después de tocar
> `prisma/schema.prisma`, correr `pnpm dlx prisma generate` o el código queda
> sin los modelos nuevos. Y si `pnpm dev` estaba arriba, **reiniciarlo**: el
> proceso tiene el cliente viejo en memoria.

### Checks

Ninguno es un framework de tests: son scripts que fallan con un mensaje claro
cuando se rompe una regla del dominio.

| Comando | Necesita | Qué verifica |
|---|---|---|
| `pnpm check:reglas` | nada | RBAC, semáforo de stock, orden de reposición, fechas locales, y que toda server action de escritura arranque con `soloAdmin()` |
| `pnpm check:movimientos` | Postgres | Descuento atómico de stock (con y sin concurrencia), rollback de la auditoría, y que el rango de fechas del Excel coincida con el de la pantalla |
| `pnpm check:login` | `pnpm dev` arriba | Login, rechazo de credenciales, cambio de contraseña, guard de sesión |
| `pnpm check:inventario` | `pnpm dev` arriba | Catálogo, semáforo, permisos por rol, exportación a Excel |

Los dos últimos son `.sh` y **necesitan Git Bash**: desde PowerShell el `bash`
del PATH es el stub de WSL y falla con `REGDB_E_CLASSNOTREG`. Alternativa desde
PowerShell:

```powershell
& "C:\Program Files\Git\bin\bash.exe" scripts/check-login.sh
```

`check:login` rota la contraseña del admin de verdad, pero **guarda y restaura
las credenciales originales al salir** (pase, falle o lo corten con Ctrl-C), así
que se puede correr repetido y en cualquier orden con los otros.

Suite completa antes de dar algo por terminado:

```bash
pnpm exec tsc --noEmit && pnpm lint && pnpm build
pnpm check:reglas && pnpm check:movimientos
bash scripts/check-login.sh && bash scripts/check-inventario.sh
```

> Este proyecto usa **pnpm exclusivamente**. No usar `npm` ni `yarn`, y no
> versionar `package-lock.json` ni `yarn.lock`.

## Rutas

| Ruta | Rol | Qué hay |
|---|---|---|
| `/login` | pública | Ingreso |
| `/cambiar-password` | con sesión | Cambio de la propia contraseña |
| `/dashboard` | ambos | KPIs, reposición urgente, últimos movimientos |
| `/inventario` | ambos (escritura: admin) | Catálogo, búsqueda, filtro, categorías |
| `/entradas` | ambos | Registrar recepción + histórico |
| `/salidas` | ambos | Registrar entrega + histórico |
| `/reportes` | ambos (auditoría: admin) | Stock bajo mínimo + registro de auditoría |
| `/usuarios` | admin | Alta de usuarios y restablecimiento de contraseñas |
| `/offline` | pública | Fallback del service worker |

Endpoints de descarga:

| Endpoint | Rol | Archivo |
|---|---|---|
| `/api/inventario/export` | ambos | `inventario-<fecha>.xlsx` |
| `/api/reportes/auditoria/export` | admin | `auditoria-<fecha>.xlsx` |

El de auditoría acepta `?usuario=<id|sin>&desde=yyyy-mm-dd&hasta=yyyy-mm-dd`. El
botón de `/reportes` arma esa URL con los filtros que tenga puestos la tabla, así
que el Excel sale filtrado igual que la pantalla — pero sobre el libro completo,
no solo sobre las filas que la página trajo.

## Estructura

```
GesTool/
├── prisma/
│   ├── schema.prisma           # Usuario, Categoria, Item, Entrada, Salida, Auditoria
│   ├── seed.ts
│   └── migrations/
├── public/
│   ├── sw.js                   # service worker (fallback offline)
│   └── icon-192.png, icon-512.png
├── scripts/
│   ├── check-reglas.ts         # reglas de dominio, sin DB ni servidor
│   ├── check-movimientos.ts    # atomicidad y concurrencia, contra la DB
│   ├── check-login.sh          # e2e de sesión
│   ├── check-inventario.sh     # e2e de catálogo
│   ├── credenciales.ts         # snapshot/restore de credenciales para los e2e
│   └── generar-iconos.ts       # regenera los PNG del manifest
├── src/
│   ├── app/
│   │   ├── (app)/              # grupo protegido: el guard de sesión vive en su layout
│   │   │   ├── dashboard/  inventario/  entradas/  salidas/
│   │   │   ├── reportes/  usuarios/
│   │   │   ├── movimientos/    # schema + actions + vista que comparten /entradas y /salidas
│   │   │   └── layout.tsx  sidebar.tsx  boton-tema.tsx  badge-stock.tsx
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── inventario/export/
│   │   │   └── reportes/auditoria/export/
│   │   ├── login/  cambiar-password/  offline/
│   │   ├── layout.tsx  manifest.ts  proveedor-tema.tsx  registrar-sw.tsx
│   │   └── globals.css
│   ├── lib/                    # prisma.ts rbac.ts stock.ts auditoria.ts fechas.ts
│   ├── auth.ts                 # configuración de NextAuth
│   └── generated/prisma/       # cliente Prisma (gitignored)
└── .env.example
```

## Decisiones que conviene conocer antes de tocar el código

**No hay `middleware.ts`, y es a propósito.** El guard de sesión vive en
`src/app/(app)/layout.tsx`. Middleware corre en Edge, donde Prisma no funciona, y
obligaría a partir la config de NextAuth en dos archivos. **Toda ruta protegida
va dentro del grupo `(app)`.** Ojo con esto: `src/app/page.tsx` está *fuera* del
grupo, por eso solo hace `redirect("/dashboard")` — poner contenido ahí lo
serviría sin login.

**El stock nunca se edita a mano.** Solo cambia como efecto de registrar una
Entrada o una Salida. El formulario de ítem no tiene campo de stock y no debe
tenerlo. El descuento en las salidas es un `updateMany` condicional
(`stock: { gte: cantidad }`), no un `SELECT` y después un `UPDATE`: así el
inventario no puede quedar negativo ni con salidas concurrentes.

**Entrada, Salida y Auditoria son append-only.** Se escriben y no se editan ni se
borran. Los ítems se dan de baja lógicamente (`activo = false`), nunca con un
`delete`.

**Toda server action de escritura valida el rol en el servidor.** Esconder el
botón no es control de acceso: cada acción arranca con `await soloAdmin()`, y
`check:reglas` falla si alguien agrega una sin ese guard.

**La auditoría se escribe dentro de la misma transacción que el cambio.** Si
falla cualquier parte, no queda ni el cambio ni el registro a medias.

**Fechas locales, siempre.** Todo lo que se muestra o se filtra sale del
calendario local vía `src/lib/fechas.ts`. Usar los componentes UTC corre las
fechas un día en husos al oeste de Greenwich, y entonces "hoy" del dashboard no
ve los movimientos del día. Ya pasó una vez en el seed.

**TanStack Table v9, que no es la v8.** `useTable` en vez de `useReactTable`,
features registradas a mano con `tableFeatures({...})`, `<table.FlexRender />` en
vez de la función `flexRender()`. Hay guías en
`node_modules/@tanstack/react-table/skills/`.

**Filtrado y orden son en cliente**, tanto en inventario como en auditoría. Es
suficiente para una bodega. Si el libro de auditoría crece a decenas de miles de
filas, pasar a filtrado en servidor con el estado en la URL.

## PWA

La app es instalable en escritorio y móvil. Se resolvió con lo que trae Next, sin
plugin:

- `src/app/manifest.ts` — Next lo sirve en `/manifest.webmanifest` y lo enlaza
  solo desde el `<head>`.
- `public/sw.js` — service worker mínimo.
- `src/app/registrar-sw.tsx` — lo registra desde el layout raíz.

**El service worker no cachea respuestas de la app a propósito.** Todo acá es
contenido privado y dependiente de la sesión; servir una copia vieja de
`/inventario` sería peor que no funcionar. Solo intercepta navegaciones y, si la
red se cae, devuelve `/offline`. Ese handler de `fetch` es además lo que Chrome
exige para ofrecer la instalación.

`@ducanh2912/next-pwa` **no sirve acá**: declara `peerDependencies: { webpack }` y
trabaja parchando `config.webpack`, mientras que Next 16 usa Turbopack por
defecto. Con el plugin conectado, `pnpm dev` y `pnpm build` fallan con *"This
build is using Turbopack, with a `webpack` config"* y no se genera ningún service
worker. Funciona solo si todo el proyecto pasa a `--webpack`.

Para probar la instalación: Chrome en `localhost:3000` → DevTools → Application →
Manifest. Los íconos se regeneran con `pnpm tsx scripts/generar-iconos.ts`.

## Guía de contribución (Git)

- `main`: producción. Solo recibe Pull Requests desde `dev`.
- `dev`: rama de integración/desarrollo.
- `feat/<nombre-feature>`: una rama por funcionalidad (ej. `feat/login`,
  `feat/inventario`).

Flujo:

1. Crear rama desde `dev`: `git checkout -b feat/mi-funcionalidad dev`.
2. Desarrollar y probar la funcionalidad completa en esa rama.
3. Al estar 100% terminada y probada, mergear a `dev`.
4. `dev` se promueve a `main` solo vía Pull Request.

No se hace push directo a `main` ni a `dev` de trabajo sin terminar, ni `--force`
sobre ninguna de las dos.

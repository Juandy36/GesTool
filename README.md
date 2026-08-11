# GesTool

Sistema de gestión de inventario de bodega (materiales y herramientas), con
control de entradas/salidas, alertas de stock mínimo/crítico, auditoría y
reportes exportables a Excel. Dos roles: **administrador** y **bodeguero**.

Ver [funciones.md](./funciones.md) para el detalle completo de funcionalidades
por sección.

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Framework | Next.js (App Router) + TypeScript |
| Estilos | Tailwind CSS |
| ORM / DB | Prisma |
| Autenticación | NextAuth.js + bcryptjs |
| Validación | Zod |
| Tabla de datos | TanStack Table v9 |
| Exportación Excel | ExcelJS |
| Package manager | pnpm (obligatorio) |

## Requisitos previos

- Node.js 20+
- pnpm (`corepack enable` o `npm i -g pnpm`)
- PostgreSQL corriendo en local

## Instalación y ejecución local

```bash
pnpm install
cp .env.example .env      # completar DATABASE_URL y AUTH_SECRET
createdb gestool          # o crearla desde pgAdmin / psql
pnpm db:migrate           # aplica las migraciones
pnpm db:seed              # admin inicial + catálogo de ejemplo
pnpm dev
```

La app queda disponible en `http://localhost:3000`. El primer acceso es con el
usuario del seed (`admin` por defecto), que obliga a cambiar la contraseña.

### Checks

```bash
pnpm check:reglas         # RBAC y semáforo de stock, sin servidor
pnpm check:login          # login end-to-end, con `pnpm dev` arriba
pnpm check:inventario     # inventario end-to-end, con `pnpm dev` arriba
```

Los dos últimos son scripts `.sh`: en Windows correrlos desde **Git Bash**, no
desde PowerShell.

> Este proyecto usa **pnpm exclusivamente**. No usar `npm` ni `yarn`, y no
> versionar `package-lock.json` ni `yarn.lock`.

## Estructura de carpetas sugerida

```
gestool/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── public/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   └── login/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── inventario/
│   │   │   ├── entradas/
│   │   │   ├── salidas/
│   │   │   ├── reportes/
│   │   │   └── usuarios/
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/
│   │   │   ├── inventario/
│   │   │   ├── entradas/
│   │   │   ├── salidas/
│   │   │   ├── reportes/
│   │   │   └── usuarios/
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   │   ├── auth.ts
│   │   ├── prisma.ts
│   │   ├── excel.ts
│   │   └── validations/
│   ├── types/
│   └── middleware.ts
├── .env.example
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## Guía de contribución (Git)

- `main`: producción. Solo recibe Pull Requests desde `dev`.
- `dev`: rama de integración/desarrollo.
- `feat/<nombre-feature>`: una rama por funcionalidad (ej. `feat/login`,
  `feat/inventario-export`).

Flujo:

1. Crear rama desde `dev`: `git checkout -b feat/mi-funcionalidad dev`.
2. Desarrollar y probar la funcionalidad completa en esa rama.
3. Al estar 100% terminada y probada, mergear a `dev`.
4. `dev` se promueve a `main` solo vía Pull Request.

No se hace push directo a `main` ni a `dev` de trabajo sin terminar.

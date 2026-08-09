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
| Exportación Excel | ExcelJS / XLSX |
| Package manager | pnpm (obligatorio) |

## Requisitos previos

- Node.js 20+
- pnpm (`corepack enable` o `npm i -g pnpm`)
- Base de datos (Postgres recomendado)

## Instalación y ejecución local

```bash
pnpm install
cp .env.example .env      # completar DATABASE_URL, NEXTAUTH_SECRET, etc.
pnpm dlx prisma migrate dev
pnpm dev
```

La app queda disponible en `http://localhost:3000`.

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

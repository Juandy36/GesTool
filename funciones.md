# Funciones de GesTool — detalle técnico

Inventario completo de lo que hace cada página, con los datos exactos que
pide, las reglas que aplica y quién puede usarla. Para la lista de negocio
(qué se puede hacer, sin detalle de implementación) ver [funciones.md](./funciones.md).

Dos roles: **ADMIN** y **BODEGUERO**. Ocultar un botón o un link no es
control de acceso: cada Server Action vuelve a validar el rol en el
servidor, así que las restricciones de abajo valen aunque alguien arme el
`POST` a mano.

---

## Acceso

### `/login`

- Formulario: `usuario` (texto) + `password`.
- Server Action `iniciarSesion` → NextAuth `signIn("credentials")`.
- `authorize()` en `src/auth.ts`:
  - Busca el usuario por `usuario` (case exacto, no `email`).
  - Compara el hash igual si el usuario no existe (hash dummy fijo), para
    que el tiempo de respuesta no delate cuáles cuentas existen.
  - Rechaza si no existe, si `activo = false`, o si la contraseña no
    coincide. Todas esas rutas devuelven el mismo mensaje genérico:
    "Usuario o contraseña incorrectos."
  - Registra `LOGIN` o `LOGIN_FALLIDO` en la auditoría en cada intento
    (el motivo real — inexistente / inactiva / contraseña — solo lo ve un
    admin ahí, nunca vuelve al que intenta entrar).
- Sesión por **JWT** (sin adapter, sin tabla de sesiones). El token lleva
  `id`, `usuario`, `rol`, `debeCambiarPassword`.
- Redirige a `/dashboard`. Si `debeCambiarPassword` es `true`, el layout
  protegido reredirige a `/cambiar-password` antes de mostrar nada.

### Guard de sesión — `src/app/(app)/layout.tsx`

- No hay `middleware.ts` (Prisma no corre en Edge). Todo lo protegido vive
  dentro del grupo de rutas `(app)`, y el guard corre en ese layout.
- Usa `sesionViva()` (`src/lib/rbac.ts`) y no `auth()` a secas: como el JWT
  no se revalida solo, una cuenta borrada o desactivada seguiría pasando
  con un `auth()` plano hasta que expire el token. `sesionViva()` hace una
  consulta (`activo`) por request, memoizada con `cache()`, y devuelve
  `null` si la cuenta ya no está viva → redirige a `/login`.
- Si `debeCambiarPassword` → redirige a `/cambiar-password`.
- Header: nombre + rol del usuario, contador de ítems bajo mínimo (link a
  `/reportes`), toggle de tema, botón "Salir" (`signOut`).

### `/cambiar-password`

- Fuera del grupo `(app)` a propósito: si estuviera dentro, el guard la
  redirigiría a sí misma en bucle.
- Formulario: `actual`, `nueva`, `confirmacion`.
- Validación (Zod): `nueva` ≥ 8 caracteres, `confirmacion === nueva`,
  `nueva !== actual`.
- Server Action `cambiarPassword`:
  1. Verifica sesión y que la cuenta siga `activo`.
  2. Compara `actual` contra el hash guardado (bcrypt).
  3. Si todo cierra: nuevo hash + `debeCambiarPassword: false` +
     fila `CAMBIO_PASSWORD` en auditoría, **en una sola transacción**.
  4. Cierra la sesión (`signOut` a `/login`) — el flag vive en el JWT, que
     no se refresca solo, así que cerrar sesión es la forma de que el
     próximo login traiga el token actualizado.
- Si es el primer acceso de una cuenta nueva, el título cambia a "Cambio de
  contraseña obligatorio" y explica por qué.

---

## Dashboard — `/dashboard`

Todo en un Server Component, una sola tanda de queries con `Promise.all`.

**4 KPIs** (cards, cada una linkea a su sección):

| KPI | Cálculo |
|---|---|
| Total de ítems | `Item.count({ activo: true })` |
| Bajos en stock | ítems con `stock <= umbralMinimo` (incluye críticos) |
| Entradas de hoy | `Entrada.count()` con `fecha` en el rango del día local |
| Salidas de hoy | `Salida.count()` con `fecha` en el rango del día local |

- El "día" se filtra por `fecha` (la del movimiento, la que carga el
  usuario), no por `creadoEn` (cuándo se guardó la fila) — así un
  movimiento cargado tarde pero fechado hoy cuenta como de hoy.
- El rango se arma como `[medianoche local de hoy, medianoche siguiente)`,
  igual que lo guarda un `<input type="date">`, para no desfasarse por UTC.

**Reposición urgente**: lista los ítems en alerta (`stock <= umbralMinimo`)
ordenados por `porUrgencia()` — primero todos los `CRITICO`
(`stock <= umbralCritico`), luego el resto por mayor `umbralMinimo - stock`.
Cada fila: badge de nivel, código, nombre, `stock / mínimo`, unidades que
faltan. Link "Ver reporte completo" a `/reportes`.

**Últimos movimientos**: trae las 10 entradas y las 10 salidas más
recientes por separado, las intercala por fecha y se queda con las 10
globales más nuevas (tabla TanStack v9, sin paginación — 10 filas fijas).
Columnas: Tipo (badge verde entrada / rojo salida), Ítem, Cantidad, Fecha,
Usuario, Detalle (proveedor+entrega, o trabajador).

**Exportar a Excel**: botón que apunta a `/api/inventario/export` (mismo
endpoint que usa Inventario).

---

## Inventario — `/inventario`

- Trae todos los ítems `activo: true` con su categoría, orden alfabético
  por nombre.
- Tabla TanStack v9 (`useTable`, `tableFeatures`), **filtrado y orden en
  cliente** — pensado para un catálogo de bodega, no para decenas de miles
  de filas.
- **Búsqueda global**: un solo input, acotado a `nombre` y `codigo`
  (`getColumnCanGlobalFilter`), no busca en toda la fila.
- **Filtro de categoría**: `<select>`, column filter exacto
  (`filterFn: "equalsString"`).
- Columnas: Código, Nombre, Tipo (Material/Herramienta), Categoría, Stock,
  Estado (badge de semáforo). Con rol ADMIN se agrega **Acciones**.
- Semáforo (`nivelStock`, `src/lib/stock.ts`):
  - `stock <= umbralCritico` → **Crítico**
  - `stock <= umbralMinimo` → **Bajo mínimo**
  - resto → **Normal**
  - Nunca es un campo guardado: se recalcula siempre desde `stock` y los
    dos umbrales del ítem.
- **Exportar a Excel** (ambos roles): `GET /api/inventario/export` —
  columnas Código, Nombre, Tipo, Categoría, Stock, Umbral mínimo, Umbral
  crítico, Estado. Encabezado en negrita, ancho de columna fijo por
  columna, generado en memoria (nunca se escribe a disco).

### Solo ADMIN

- **Nuevo ítem** / **Editar ítem** — modal (`<dialog>` nativo,
  `showModal()`: foco atrapado, Esc y backdrop los da el navegador; el
  contenido se monta solo con el modal abierto para que los
  `defaultValue` se refresquen al cambiar de ítem).
  - Campos: código, nombre, tipo (`MATERIAL` / `HERRAMIENTA`), categoría,
    umbral mínimo, umbral crítico.
  - **No hay campo de stock** — a propósito: el stock nunca se edita a
    mano, solo lo mueven las entradas y salidas.
  - Validación Zod: código y nombre obligatorios (máx. 40 / 120), umbrales
    enteros ≥ 0, y `umbralCritico <= umbralMinimo`.
  - Errores de Prisma traducidos: código duplicado (`P2002`) → "Ya existe
    un ítem con el código X"; categoría borrada a mitad de camino
    (`P2003`) → "La categoría seleccionada ya no existe."
  - Server Action `guardarItem`: crea o actualiza + fila `ITEM_CREADO` /
    `ITEM_EDITADO` en auditoría, en una sola transacción.
- **Dar de baja** — confirmación (`window.confirm`) antes de enviar. Baja
  lógica (`activo: false`): el ítem no se borra, solo deja de listarse.
  Registra `ITEM_BAJA`.
- **Categorías** — modal aparte:
  - Crear (nombre único).
  - Renombrar (guarda el nombre viejo en el detalle de auditoría antes de
    pisarlo, dentro de la misma transacción que el `update`).
  - Eliminar — bloqueada si hay ítems (activos o no) usando esa categoría;
    el conteo se hace dentro de la transacción y el mensaje de error dice
    cuántos ítems hay que mover primero.

---

## Entradas — `/entradas` y Salidas — `/salidas`

Comparten el mismo componente (`VistaMovimientos`), con `tipo="ENTRADA"` o
`"SALIDA"`. Disponibles para **ambos roles** — el guard acá es "hay
sesión", no `soloAdmin()`.

- Trae los ítems activos (para el selector) y las últimas 200 filas del
  movimiento correspondiente, más recientes primero. El histórico completo
  se consulta exportando (no hay endpoint de export para estas tablas
  todavía, se exportan desde Inventario / Auditoría).
- **Registrar entrada**: ítem (selector), cantidad (entero positivo),
  fecha, proveedor, quién entrega. Todos obligatorios.
- **Registrar salida**: ítem, cantidad, fecha, trabajador que recibe.
  Todos obligatorios — el nombre del trabajador es obligatorio en toda
  salida, por regla de negocio.
- `hoy` para el `defaultValue` de la fecha lo calcula el servidor
  (`fechaLocal()`) y se pasa como prop — si se calculara en el cliente,
  el `defaultValue` podría no coincidir con lo que renderizó el servidor
  y romper la hidratación.
- Cada movimiento es **append-only**: no hay edición ni borrado, ni en la
  UI ni en las Server Actions.
- Atomicidad (`registrarEntrada` / `registrarSalida` en
  `movimientos/actions.ts`), todo en una transacción:
  - Entrada: crea la fila + `stock: { increment: cantidad } }` + auditoría
    `ENTRADA_REGISTRADA`.
  - Salida: descuenta stock con un `updateMany` condicional
    (`stock: { gte: cantidad }`) — si otra salida se adelantó y ya no
    alcanza, la condición no matchea ninguna fila y se aborta con "Stock
    insuficiente: solo quedan N unidad(es)". Esto es lo que garantiza que
    el stock nunca quede negativo bajo concurrencia, sin necesidad de un
    `SELECT` previo que dejaría una ventana de carrera abierta. Si pasa,
    crea la fila + auditoría `SALIDA_REGISTRADA`.
  - Si el ítem fue borrado/dado de baja a mitad de camino, ambos casos
    devuelven "El ítem seleccionado ya no existe."
- Tabla de histórico (TanStack v9, orden en cliente): Código, Ítem,
  Cantidad, Fecha, Proveedor/Entrega (o Trabajador), Usuario que la
  registró.

---

## Reportes — `/reportes`

Dos secciones independientes en la misma página.

### Stock bajo mínimo — visible para ambos roles

- Mismos ítems que "Reposición urgente" del dashboard, mismo orden
  (`porUrgencia`), pero en tabla completa con más columnas: Nivel, Código,
  Ítem, Categoría, Stock, Mínimo, Crítico, Faltante.
- Es para cualquiera que pueda entrar porque es información operativa
  ("hay que salir a comprar"), no administrativa.

### Registro de auditoría — **solo ADMIN**

- Si no sos admin, la sección muestra el mensaje de `soloAdmin()` en vez
  de la tabla (la query ni se ejecuta).
- Trae los últimos 500 eventos (`ponytail`: alcanza para revisar "qué
  pasó"; si el libro crece a miles de filas, mover el filtro al servidor
  con estado en la URL).
- Tabla TanStack v9, ordenable por cualquier columna: Cuándo (fecha+hora
  local), Usuario, Acción, Detalle.
- **Filtros en cliente**:
  - Usuario: `<select>` armado a partir de los usuarios que sí tienen
    eventos en las filas cargadas (no de la tabla completa de usuarios),
    incluye "—" para intentos fallidos contra un usuario inexistente.
    Filtra por `id`, no por nombre, porque dos personas pueden llamarse
    igual.
  - Rango de fechas: `desde` / `hasta` (`<input type="date">`), cada uno
    limita el rango del otro (`min`/`max` cruzados).
  - "Limpiar filtros" aparece solo si hay algo que limpiar.
- **Exportar a Excel**: `GET /api/reportes/auditoria/export`, con los
  mismos filtros como query params (`?usuario=&desde=&hasta=`) — el
  servidor repite el recorte sobre el libro **completo**, no solo sobre
  los 500 eventos que trajo la página. Columnas: Fecha, Hora, Usuario
  (nombre + usuario), Acción, Detalle.
- **13 tipos de evento** que puede tener una fila (`AccionAuditoria`):

  | Enum | Se dispara en |
  |---|---|
  | `LOGIN` / `LOGIN_FALLIDO` | cada intento de login |
  | `CAMBIO_PASSWORD` | el propio usuario cambia su contraseña |
  | `ITEM_CREADO` / `ITEM_EDITADO` / `ITEM_BAJA` | acciones de Inventario |
  | `CATEGORIA_CREADA` / `_RENOMBRADA` / `_ELIMINADA` | gestor de categorías |
  | `ENTRADA_REGISTRADA` / `SALIDA_REGISTRADA` | Entradas / Salidas |
  | `USUARIO_CREADO` | alta de usuario |
  | `USUARIO_PASSWORD_RESET` | admin resetea la contraseña de otro |

- El registro es **append-only**: ninguna pantalla permite editar ni
  borrar una fila de auditoría.

---

## Usuarios — `/usuarios` — **solo ADMIN**

- Página y Server Actions protegidas por `soloAdmin()` (el link ya está
  oculto en el sidebar para BODEGUERO, pero eso no es la protección real).
- Tabla: Usuario, Nombre, Rol, Fecha de alta (ordenada por
  `activo desc, nombre asc`).
- **Crear usuario**: usuario (3–40 caracteres, solo minúsculas/números/
  `.`/`-`/`_`, se normaliza a minúsculas), nombre, rol (`ADMIN` /
  `BODEGUERO`), contraseña inicial (mín. 8 caracteres).
  - Queda con `debeCambiarPassword: true`: la contraseña que pone el admin
    es de un solo uso, la persona la cambia al entrar.
  - Alta del usuario + fila `USUARIO_CREADO` en la misma transacción.
  - Usuario duplicado (`P2002`) → "Ya existe el usuario X."
- **Restablecer contraseña de otro usuario** — página aparte,
  `/usuarios/[id]/restablecer` (no un modal, no `/cambiar-password`: esa
  ruta cambia la propia clave, pide la actual y cierra sesión; mandar ahí
  al admin le cambiaría su propia contraseña).
  - Un solo campo, **visible como texto** (no `password`) y sin
    confirmación — a propósito: el admin la escribe para anotarla y
    entregársela a la persona, se lee mientras se escribe.
  - Mínimo 8 caracteres.
  - Deja `debeCambiarPassword: true` otra vez. No cierra la sesión que la
    persona afectada ya tenga abierta (el JWT sigue vivo hasta que
    expire); esto la desbloquea, no la expulsa.
  - Registra `USUARIO_PASSWORD_RESET`, con el autor (el admin) como
    usuario de la auditoría, no el afectado.
  - Al terminar, vuelve a `/usuarios`.
- No hay edición de rol ni desactivación de cuenta desde la UI todavía —
  solo alta y reset de contraseña.

---

## General / transversal

- **Tema claro/oscuro**: toggle en el header (ícono sol/luna, elegido por
  CSS y no por estado de React para no parpadear antes de hidratar).
  Persiste en `localStorage` vía `next-themes`, independiente de la
  cuenta.
- **PWA nativa** (sin plugin, `app/manifest.ts` + `public/sw.js` a mano):
  instalable en escritorio y celular, ícono y nombre "GesTool". El service
  worker no cachea nada de la app (todo el contenido es privado y depende
  de la sesión) — solo intercepta navegaciones y muestra `/offline` si no
  hay red.
- **RBAC de fondo**: toda Server Action de escritura empieza llamando
  `soloAdmin()` (si es exclusiva de admin) o `usuarioActual()` (si solo
  requiere sesión) antes de tocar la base. `pnpm check:reglas` falla si
  alguien agrega una acción sin ese guard.
- **Modelo de datos** (`prisma/schema.prisma`): `Usuario`, `Categoria`,
  `Item`, `Entrada`, `Salida`, `Auditoria`, más los enums `Rol`,
  `TipoItem`, `AccionAuditoria`. `Entrada` y `Salida` son tablas separadas
  (no una tabla `Movimiento` con un campo de tipo) para que cada una pueda
  exigir sus propias columnas NOT NULL — la base garantiza que una salida
  nunca quede sin trabajador, en vez de dejarlo a una validación que se
  pueda saltear.

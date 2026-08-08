# Funciones de GesTool

Qué se puede hacer en la aplicación, por sección. No es documentación técnica:
es la lista de acciones disponibles para cada rol.

Hay dos roles: **administrador** y **bodeguero**. Donde no se dice lo contrario,
la función está disponible para los dos.

---

## Acceso

- Iniciar sesión con usuario y contraseña.
- Cambiar la propia contraseña.
- El administrador puede cambiar la contraseña de cualquier otro usuario.
- Cambio de contraseña obligatorio en el primer acceso de una cuenta nueva.
- Cerrar sesión.

## Dashboard

- Ver cuántos ítems hay en el catálogo (materiales y herramientas).
- Ver cuántos ítems están bajo el stock mínimo, y cuántos en nivel crítico.
- Ver cuántas entradas y salidas se registraron hoy.
- Ver el listado de ítems que requieren reposición, ordenado por urgencia.
- Ver los últimos movimientos (entradas y salidas mezclados, más recientes primero).
- Saltar directo al reporte de stock bajo desde el listado de reposición.
- Ver el contador de alertas activas (ítems bajo mínimo) en todo momento.

## Inventario

- Ver el catálogo completo de ítems (materiales y herramientas).
- Buscar por nombre, código o categoría.
- Filtrar por categoría.
- Ver el semáforo de stock de cada ítem (normal / bajo mínimo / crítico).
- Exportar el inventario a Excel.
- **Solo administrador:**
  - Crear un ítem nuevo.
  - Editar un ítem existente.
  - Dar de baja un ítem (baja lógica: no se borra, deja de listarse).
  - Crear, renombrar o eliminar categorías.

## Entradas (recepción de mercancía)

- Ver el histórico de entradas registradas.
- Registrar una entrada nueva: ítem, cantidad, fecha, proveedor, quién la entrega.
- Es un libro histórico: una vez registrada, una entrada no se edita ni se borra.

## Salidas (entrega de materiales/herramientas)

- Ver el histórico de salidas registradas.
- Registrar una salida nueva: ítem, cantidad, fecha, trabajador que la recibe.
- El nombre del trabajador es obligatorio en toda salida.
- Igual que las entradas, es un libro histórico: solo se añade, nunca se edita ni se borra.

## Reportes — **solo administrador**

- Ver el reporte de stock bajo mínimo.
- Ver la auditoría del sistema: quién hizo qué y cuándo (inicios de sesión,
  altas, bajas, ediciones, movimientos).
- Filtrar la auditoría por usuario y por rango de fechas.
- Exportar la auditoría a Excel.
- Crear usuarios nuevos y asignarles rol (administrador o bodeguero).
- Editar usuarios existentes.
- Gestionar categorías del catálogo (crear, renombrar, eliminar).

## General

- Cambiar entre tema claro y oscuro; la elección se recuerda entre sesiones.
- Todas las exportaciones (inventario y auditoría) generan un archivo Excel
  descargable.
- El stock de un ítem nunca se edita a mano: solo cambia registrando una
  entrada o una salida.

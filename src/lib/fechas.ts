/**
 * Todo lo que se muestra o se filtra por fecha usa el día *local*, no el UTC.
 * Tomar los componentes en UTC corre las fechas un día en husos al oeste de
 * Greenwich, y entonces "hoy" del dashboard no ve los movimientos del día.
 */

/** Día local como `yyyy-mm-dd`, igual que lo que produce un `<input type="date">`. */
export function fechaLocal(d = new Date()) {
  return d.toLocaleDateString("en-CA");
}

/**
 * Instante local como `yyyy-mm-dd HH:mm`. Un solo campo de texto que ordena
 * cronológicamente y del que el filtro de rango compara los primeros 10
 * caracteres: nunca se reconstruye un `Date` en el cliente, así que no hay
 * dónde meter un desfase.
 */
export function instanteLocal(d: Date) {
  return `${fechaLocal(d)} ${d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
}

/** `yyyy-mm-dd` -> `dd/mm/yyyy`, para mostrar. */
export function comoDdMmAaaa(iso: string) {
  return iso.split("-").reverse().join("/");
}

/**
 * Instante en que arranca el día local `yyyy-mm-dd`, opcionalmente corrido N
 * días. Es la contraparte de `instanteLocal` para filtrar por rango en SQL: el
 * cliente compara los primeros 10 caracteres del texto, el servidor compara
 * `creadoEn` contra estos dos instantes, y los dos tienen que dar lo mismo.
 */
export function inicioDelDiaLocal(iso: string, mas = 0) {
  const [anio, mes, dia] = iso.split("-").map(Number);
  return new Date(anio, mes - 1, dia + mas);
}

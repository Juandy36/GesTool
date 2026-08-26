/**
 * Checks de las reglas que no se pueden ver desde HTTP: quién puede administrar
 * y cómo se calcula el semáforo de stock. Correr con `pnpm check:reglas`.
 */
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Session } from "next-auth";
import { puedeAdministrar } from "../src/lib/rbac";
import { comoDdMmAaaa, fechaLocal, instanteLocal } from "../src/lib/fechas";
import { nivelStock, porUrgencia } from "../src/lib/stock";

const sesion = (rol: "ADMIN" | "BODEGUERO"): Session =>
  ({
    user: { id: "u1", name: "X", usuario: "x", rol, debeCambiarPassword: false },
    expires: "2099-01-01",
  }) as Session;

// --- Quién puede administrar ---
assert.equal(puedeAdministrar(sesion("ADMIN")), null, "el admin sí puede");
assert.match(
  puedeAdministrar(sesion("BODEGUERO")) ?? "",
  /administrador/,
  "el bodeguero no puede",
);
assert.match(puedeAdministrar(null) ?? "", /Sesión/, "sin sesión no puede");

// --- Semáforo de stock ---
const item = (stock: number) => ({ stock, umbralMinimo: 10, umbralCritico: 4 });
assert.equal(nivelStock(item(11)), "NORMAL", "por encima del mínimo");
assert.equal(nivelStock(item(10)), "BAJO", "justo en el mínimo ya es bajo");
assert.equal(nivelStock(item(5)), "BAJO", "entre crítico y mínimo");
assert.equal(nivelStock(item(4)), "CRITICO", "justo en el crítico ya es crítico");
assert.equal(nivelStock(item(0)), "CRITICO", "sin stock");
// Crítico gana cuando los umbrales coinciden.
assert.equal(nivelStock({ stock: 3, umbralMinimo: 3, umbralCritico: 3 }), "CRITICO");
// --- Fechas locales ---
// Todo lo que se muestra o se filtra sale del calendario local. Con los
// componentes en UTC, un movimiento de la noche cae en el día siguiente y
// "hoy" del dashboard no lo ve: ya pasó una vez en el seed.
const tarde = new Date(2026, 7, 22, 23, 30);
assert.equal(fechaLocal(tarde), "2026-08-22", "23:30 sigue siendo el mismo día local");
assert.equal(instanteLocal(new Date(2026, 7, 22, 21, 5)), "2026-08-22 21:05");
assert.equal(comoDdMmAaaa("2026-08-22"), "22/08/2026");
// El filtro de la auditoría compara los primeros 10 caracteres contra un
// `<input type="date">`, así que el instante tiene que empezar por el día.
assert.equal(instanteLocal(tarde).slice(0, 10), fechaLocal(tarde));

// --- Urgencia de reposición ---
// Los críticos van primero aunque falten pocas unidades; dentro del nivel,
// mayor faltante. Es el orden del dashboard y del reporte de stock.
const orden = porUrgencia([
  { codigo: "bajo-mucho", stock: 50, umbralMinimo: 100, umbralCritico: 10 },
  { codigo: "critico-poco", stock: 1, umbralMinimo: 3, umbralCritico: 2 },
  { codigo: "bajo-poco", stock: 9, umbralMinimo: 10, umbralCritico: 1 },
]);
assert.deepEqual(
  orden.map((i) => i.codigo),
  ["critico-poco", "bajo-mucho", "bajo-poco"],
  "crítico primero, después mayor faltante",
);
assert.equal(orden[1].faltante, 50, "el faltante es mínimo - stock");

// --- El hash dummy del login tiene que ser un hash de verdad ---
// La constante escrita a mano tenía 66 caracteres y un bcrypt tiene 60, así que
// `compare` la rechazaba por formato y volvía en 0 ms sin ejecutar una sola
// ronda: el canal de timing que esa línea existe para tapar quedaba abierto, y
// nada lo delataba. Se chequea en la fuente porque importar `src/auth.ts` acá
// arrastraría NextAuth y Prisma enteros.
const AUTH = readFileSync(new URL("../src/auth.ts", import.meta.url), "utf8");
assert.match(AUTH, /bcrypt\.hashSync\(/, "el login no calcula su hash dummy");
assert.doesNotMatch(
  AUTH,
  /["'`]\$2[aby]\$/,
  "hay un hash bcrypt escrito a mano en src/auth.ts: calcularlo con bcrypt.hashSync",
);

// --- Toda server action de escritura valida la sesión antes de tocar la base ---
// Antes esto recorría a mano ["inventario", "usuarios"] y solo aceptaba
// `soloAdmin()`: dejaba fuera movimientos y cambiar-password, y cualquier
// actions.ts nuevo pasaba sin que nadie lo mirara. Ahora los busca por glob y
// verifica el invariante que importa — que el guard esté *antes* de la primera
// consulta —, no que esté en una línea puntual.
const RAIZ = fileURLToPath(new URL("..", import.meta.url));
const GUARD = /\b(soloAdmin|usuarioActual|sesionViva|sesionOperativa)\(\)/;

// `iniciarSesion` es el login: no puede exigir una sesión que todavía no existe.
const SIN_GUARD = ["src/app/login/actions.ts"];

/** Rutas relativas al repo, con `/` siempre, de todo archivo de `src/app` que se llame `nombre`. */
function buscar(nombre: string) {
  return readdirSync(join(RAIZ, "src/app"), { encoding: "utf8", recursive: true })
    .map((ruta) => `src/app/${ruta.split(sep).join("/")}`)
    .filter((ruta) => ruta.endsWith(`/${nombre}`))
    .sort();
}

const modulos = buscar("actions.ts").filter((ruta) => !SIN_GUARD.includes(ruta));

assert.ok(modulos.length >= 4, `se esperaban >=4 módulos de actions, hay ${modulos.length}`);

let acciones = 0;
for (const modulo of modulos) {
  const fuente = readFileSync(join(RAIZ, modulo), "utf8");
  const inicios = [...fuente.matchAll(/export async function (\w+)/g)];
  assert.ok(inicios.length > 0, `${modulo}: no exporta ninguna action`);

  for (const [i, match] of inicios.entries()) {
    const cuerpo = fuente.slice(match.index, inicios[i + 1]?.index ?? fuente.length);
    const guard = cuerpo.search(GUARD);
    const consulta = cuerpo.search(/\bprisma\./);

    assert.ok(guard >= 0, `${modulo}/${match[1]} no valida la sesión`);
    assert.ok(
      consulta < 0 || guard < consulta,
      `${modulo}/${match[1]} consulta la base antes del guard`,
    );
    acciones += 1;
  }
}

// --- Los endpoints de /api tienen su propio guard: el layout de (app) no los cubre ---
for (const ruta of buscar("route.ts").filter((r) => r.startsWith("src/app/api/"))) {
  if (ruta.includes("[...nextauth]")) continue; // es el handler de NextAuth, no una ruta nuestra
  const fuente = readFileSync(join(RAIZ, ruta), "utf8");
  assert.match(fuente, GUARD, `${ruta} no valida la sesión`);
  assert.ok(
    !/\bawait auth\(\)/.test(fuente),
    `${ruta} usa auth() a secas: un JWT de una cuenta desactivada pasaría`,
  );
}

console.log(`OK: RBAC, semáforo de stock, urgencia, guard en ${acciones} server actions y en los endpoints de /api.`);

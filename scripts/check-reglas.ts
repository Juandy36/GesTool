/**
 * Checks de las reglas que no se pueden ver desde HTTP: quién puede administrar
 * y cómo se calcula el semáforo de stock. Correr con `pnpm check:reglas`.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Session } from "next-auth";
import { puedeAdministrar } from "../src/lib/rbac";
import { comoDdMmAaaa, fechaLocal, instanteLocal } from "../src/lib/fechas";
import { nivelStock } from "../src/lib/stock";

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

// --- Toda server action de escritura arranca con el guard de rol ---
// Barato de mantener y avisa si alguien agrega una acción sin protegerla.
const actions = readFileSync(new URL("../src/app/(app)/inventario/actions.ts", import.meta.url), "utf8");
const exportadas = [...actions.matchAll(/export async function (\w+)/g)].map((m) => m[1]);
assert.ok(exportadas.length >= 5, `se esperaban >=5 actions, hay ${exportadas.length}`);
for (const nombre of exportadas) {
  const cuerpo = actions.slice(actions.indexOf(`export async function ${nombre}`));
  const primeraLinea = cuerpo.split("\n").slice(1, 3).join("\n");
  assert.match(primeraLinea, /soloAdmin\(\)/, `${nombre} no valida el rol al entrar`);
}

console.log(`OK: RBAC, semáforo de stock, fechas y guard en ${exportadas.length} server actions.`);

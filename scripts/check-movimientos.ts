/**
 * Checks que necesitan la DB real: el stock nunca queda negativo (ni con
 * salidas concurrentes), y el contador del header coincide con el semáforo.
 * Borra lo que crea. Correr con `pnpm check:movimientos`.
 *
 * Los checks de lógica pura viven en `check-reglas.ts`, que corre sin Postgres.
 */
import "dotenv/config";
import assert from "node:assert/strict";
import { prisma } from "../src/lib/prisma";
import { auditar } from "../src/lib/auditoria";
import { inicioDelDiaLocal, instanteLocal } from "../src/lib/fechas";
import { contarBajoMinimo, descontarStock, nivelStock } from "../src/lib/stock";
import type { AccionAuditoria } from "../src/generated/prisma/enums";

const SUFIJO = `__check_${Date.now()}`;

async function main() {
  const categoria = await prisma.categoria.create({ data: { nombre: `Cat${SUFIJO}` } });
  const item = await prisma.item.create({
    data: { codigo: `COD${SUFIJO}`, nombre: `Item${SUFIJO}`, categoriaId: categoria.id, stock: 10 },
  });

  try {
    // Sin stock suficiente no descuenta nada.
    assert.equal(await descontarStock(prisma, item.id, 11), false, "11 > 10 no debería pasar");
    assert.equal((await leerStock(item.id)), 10, "un descuento rechazado no toca el stock");

    // Exactamente el stock disponible sí pasa y lo deja en cero.
    assert.equal(await descontarStock(prisma, item.id, 10), true, "10 de 10 debería pasar");
    assert.equal(await leerStock(item.id), 0, "debería quedar en cero");
    assert.equal(await descontarStock(prisma, item.id, 1), false, "en cero ya no se puede sacar");

    // Concurrencia: 10 salidas de 3 sobre stock 12 -> solo 4 pueden ganar.
    await prisma.item.update({ where: { id: item.id }, data: { stock: 12 } });
    const resultados = await Promise.all(
      Array.from({ length: 10 }, () =>
        prisma.$transaction((tx) => descontarStock(tx, item.id, 3)),
      ),
    );
    const ganadas = resultados.filter(Boolean).length;
    assert.equal(ganadas, 4, `solo 4 salidas caben en 12, ganaron ${ganadas}`);
    assert.equal(await leerStock(item.id), 0, "12 - 4*3 = 0, nunca negativo");

    // La auditoría vive dentro de la transacción del movimiento: si la fila del
    // libro no entra, no debe quedar ni el movimiento ni el cambio de stock.
    // Se reproduce la forma de la server action (que necesita sesión HTTP y no
    // se puede llamar desde acá) y se fuerza el fallo con un enum inexistente.
    const autor = await prisma.usuario.findFirstOrThrow({ select: { id: true } });
    await prisma.item.update({ where: { id: item.id }, data: { stock: 20 } });

    await assert.rejects(
      prisma.$transaction(async (tx) => {
        await tx.entrada.create({
          data: {
            itemId: item.id,
            cantidad: 5,
            fecha: new Date(),
            proveedor: `Prov${SUFIJO}`,
            quienEntrega: "Check",
            usuarioId: autor.id,
          },
        });
        await tx.item.update({ where: { id: item.id }, data: { stock: { increment: 5 } } });
        await auditar(tx, "ACCION_QUE_NO_EXISTE" as AccionAuditoria, "debe reventar", autor.id);
      }),
      // Anclado a `auditoria.create` para que el check no pase por accidente si
      // lo que revienta fuese la entrada o el update de stock.
      /Invalid `db\.auditoria\.create\(\)` invocation/,
    );

    assert.equal(await leerStock(item.id), 20, "el stock volvió atrás con el rollback");
    assert.equal(
      await prisma.entrada.count({ where: { itemId: item.id } }),
      0,
      "no quedó la entrada huérfana",
    );
    assert.equal(
      await prisma.auditoria.count({ where: { detalle: "debe reventar" } }),
      0,
      "no quedó la fila de auditoría",
    );
  } finally {
    await prisma.salida.deleteMany({ where: { itemId: item.id } });
    await prisma.entrada.deleteMany({ where: { itemId: item.id } });
    await prisma.item.delete({ where: { id: item.id } });
    await prisma.categoria.delete({ where: { id: categoria.id } });
  }

  // El contador del header usa una comparación entre columnas en SQL; el
  // semáforo la calcula en JS. Si una deriva de la otra, esto avisa.
  const activos = await prisma.item.findMany({ where: { activo: true } });
  const enJs = activos.filter((i) => nivelStock(i) !== "NORMAL").length;
  const enSql = await contarBajoMinimo(prisma);
  assert.equal(enSql, enJs, `contarBajoMinimo dio ${enSql}, el semáforo cuenta ${enJs}`);

  // La tabla de auditoría filtra por rango comparando texto (`yyyy-mm-dd`); el
  // Excel filtra el mismo rango en SQL contra `creadoEn`, que es un instante.
  // Si una de las dos deriva, el archivo exportado no coincide con la pantalla.
  const eventos = await prisma.auditoria.findMany({ select: { creadoEn: true } });
  if (eventos.length > 0) {
    const dia = instanteLocal(eventos[0].creadoEn).slice(0, 10);
    const rangoEnJs = eventos.filter((e) => instanteLocal(e.creadoEn).slice(0, 10) === dia).length;
    const rangoEnSql = await prisma.auditoria.count({
      where: { creadoEn: { gte: inicioDelDiaLocal(dia), lt: inicioDelDiaLocal(dia, 1) } },
    });
    assert.equal(rangoEnSql, rangoEnJs, `${dia}: ${rangoEnSql} en SQL y ${rangoEnJs} en pantalla`);
  }

  console.log(
  `OK: descuento atómico, rollback de auditoría, rango de fechas y contador de alertas (${enSql}).`,
);
}

async function leerStock(id: string) {
  return (await prisma.item.findUniqueOrThrow({ where: { id }, select: { stock: true } })).stock;
}

main().finally(() => prisma.$disconnect());

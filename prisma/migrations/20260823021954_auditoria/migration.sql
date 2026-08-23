-- CreateEnum
CREATE TYPE "AccionAuditoria" AS ENUM ('LOGIN', 'LOGIN_FALLIDO', 'CAMBIO_PASSWORD', 'ITEM_CREADO', 'ITEM_EDITADO', 'ITEM_BAJA', 'CATEGORIA_CREADA', 'CATEGORIA_RENOMBRADA', 'CATEGORIA_ELIMINADA', 'ENTRADA_REGISTRADA', 'SALIDA_REGISTRADA');

-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "accion" "AccionAuditoria" NOT NULL,
    "usuarioId" TEXT,
    "detalle" TEXT NOT NULL,
    "creadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "Auditoria_creadoEn_idx" ON "Auditoria"("creadoEn");

-- AddForeignKey
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

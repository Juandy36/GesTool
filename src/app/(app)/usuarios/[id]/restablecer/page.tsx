import { notFound } from "next/navigation";
import Icono from "@/app/iconos";
import { tarjetaAuth } from "@/app/ui";
import { prisma } from "@/lib/prisma";
import { soloAdmin } from "@/lib/rbac";
import FormularioReset from "./form";

/**
 * Restablecer la contraseña de *otro* usuario. Es una página aparte y no
 * `/cambiar-password`: esa cambia la propia (pide la actual y cierra la
 * sesión), y mandar al admin ahí le cambiaría su propia clave.
 */
export default async function RestablecerPage({ params }: PageProps<"/usuarios/[id]/restablecer">) {
  const denegado = await soloAdmin();
  if (denegado) return <p className="text-[13px] text-danger">{denegado}</p>;

  const { id } = await params;
  const usuario = await prisma.usuario.findUnique({
    where: { id },
    select: { id: true, usuario: true, nombre: true, rol: true },
  });
  if (!usuario) notFound();

  return (
    <div className="flex justify-center py-4">
      <div className={tarjetaAuth}>
        <div className="mb-5 flex flex-col gap-1.5">
          <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-warn-soft text-warn">
            <Icono nombre="llave" size={17} grosor={1.9} />
          </span>
          <h1 className="mt-1.5 text-base font-semibold">Restablecer contraseña</h1>
          <p className="text-[12.5px] text-muted">
            Para <strong className="font-medium text-text">{usuario.nombre}</strong> (
            {usuario.usuario} · {usuario.rol}). Se le va a exigir cambiarla en el próximo inicio de
            sesión.
          </p>
        </div>

        <FormularioReset id={usuario.id} nombre={usuario.nombre} />
      </div>
    </div>
  );
}

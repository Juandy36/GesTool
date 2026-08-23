import { fechaLocal } from "@/lib/fechas";
import { prisma } from "@/lib/prisma";
import { soloAdmin } from "@/lib/rbac";
import GestionUsuarios from "./gestion";

export default async function UsuariosPage() {
  // El sidebar ya esconde el link para el bodeguero, pero esconder no es
  // control de acceso: la página se protege igual, y las actions otra vez.
  const denegado = await soloAdmin();
  if (denegado) return <p className="text-red-600 dark:text-red-400">{denegado}</p>;

  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ activo: "desc" }, { nombre: "asc" }],
    select: {
      id: true,
      usuario: true,
      nombre: true,
      rol: true,
      activo: true,
      debeCambiarPassword: true,
      creadoEn: true,
    },
  });

  return (
    <GestionUsuarios
      usuarios={usuarios.map((u) => ({ ...u, creadoEn: fechaLocal(u.creadoEn) }))}
    />
  );
}

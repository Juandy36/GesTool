import Link from "next/link";
import { redirect } from "next/navigation";
import { signOut } from "@/auth";
import Icono from "@/app/iconos";
import { prisma } from "@/lib/prisma";
import { sesionViva } from "@/lib/rbac";
import { contarBajoMinimo } from "@/lib/stock";
import BotonTema from "./boton-tema";
import Sidebar, { TabsMovil } from "./sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // `sesionViva` y no `auth()`: si borraron o desactivaron la cuenta, el token
  // sigue siendo válido y la app renderizaría normal hasta reventar en la
  // primera escritura. Acá se corta y se manda a entrar de nuevo.
  const session = await sesionViva();
  if (!session) redirect("/login");
  if (session.user.debeCambiarPassword) redirect("/cambiar-password");

  // Una consulta por navegación. Las acciones de inventario y de movimientos
  // ya hacen `revalidatePath("/inventario")`, así que el contador se refresca solo.
  const alertas = await contarBajoMinimo(prisma);
  const esAdmin = session.user.rol === "ADMIN";

  return (
    <div className="flex h-dvh bg-bg text-text">
      <Sidebar esAdmin={esAdmin} nombre={session.user.name ?? ""} rol={session.user.rol} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-13 shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 md:px-5">
          <span className="text-[13.5px] font-semibold md:hidden">GesTool</span>

          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            {alertas > 0 && (
              <Link
                href="/reportes"
                className="flex items-center gap-1.5 rounded-full bg-warn-soft px-2.5 py-1 text-xs font-medium text-warn"
              >
                <Icono nombre="alerta" size={12} grosor={2.2} />
                {alertas} ítem(s) bajo mínimo
              </Link>
            )}
            <span className="hidden text-xs whitespace-nowrap text-muted sm:inline">
              {session.user.name} · {session.user.rol}
            </span>
            <BotonTema />
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/login" });
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted hover:text-text"
              >
                Salir
              </button>
            </form>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:px-7 md:py-6">{children}</main>

        <TabsMovil esAdmin={esAdmin} />
      </div>
    </div>
  );
}

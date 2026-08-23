import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { contarBajoMinimo } from "@/lib/stock";
import BotonTema from "./boton-tema";
import Sidebar from "./sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.debeCambiarPassword) redirect("/cambiar-password");

  // Una consulta por navegación. Las acciones de inventario y de movimientos
  // ya hacen `revalidatePath("/inventario")`, así que el contador se refresca solo.
  const alertas = await contarBajoMinimo(prisma);

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar esAdmin={session.user.rol === "ADMIN"} />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-end gap-3 border-b border-black/10 px-6 py-3 text-sm dark:border-white/15">
          {alertas > 0 && (
            <Link
              href="/reportes"
              className="rounded-full bg-amber-100 px-3 py-1 font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-300"
            >
              {alertas} ítem(s) bajo mínimo
            </Link>
          )}
          <span className="text-black/60 dark:text-white/60">
            {session.user.name} · {session.user.rol}
          </span>
          <BotonTema />
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="underline underline-offset-4">
              Cerrar sesión
            </button>
          </form>
        </header>

        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

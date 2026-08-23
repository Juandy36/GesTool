import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");
  if (session.user.debeCambiarPassword) redirect("/cambiar-password");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-black/10 px-6 py-3 dark:border-white/15">
        <nav className="flex items-center gap-4">
          <span className="font-semibold">GesTool</span>
          <Link href="/dashboard" className="text-sm underline underline-offset-4">
            Dashboard
          </Link>
          <Link href="/inventario" className="text-sm underline underline-offset-4">
            Inventario
          </Link>
        </nav>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-black/60 dark:text-white/60">
            {session.user.name} · {session.user.rol}
          </span>
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
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  );
}

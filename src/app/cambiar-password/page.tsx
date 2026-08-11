import { redirect } from "next/navigation";
import { auth } from "@/auth";
import CambiarPasswordForm from "./form";

export default async function CambiarPasswordPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border border-black/10 p-6 dark:border-white/15">
        <div>
          <h1 className="text-2xl font-semibold">Cambiar contraseña</h1>
          {session.user.debeCambiarPassword && (
            <p className="text-sm text-black/60 dark:text-white/60">
              Es tu primer acceso: debes cambiar la contraseña para continuar.
            </p>
          )}
        </div>
        <CambiarPasswordForm />
      </div>
    </main>
  );
}

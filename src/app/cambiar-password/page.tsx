import { redirect } from "next/navigation";
import { auth } from "@/auth";
import Icono from "@/app/iconos";
import { fondoAuth, tarjetaAuth } from "@/app/ui";
import CambiarPasswordForm from "./form";

export default async function CambiarPasswordPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const primerAcceso = session.user.debeCambiarPassword;

  return (
    <main className={fondoAuth}>
      <div className={tarjetaAuth}>
        <div className="mb-5 flex flex-col gap-1.5">
          <span className="flex size-[34px] items-center justify-center rounded-[9px] bg-warn-soft text-warn">
            <Icono nombre="llave" size={17} grosor={1.9} />
          </span>
          <h1 className="mt-1.5 text-base font-semibold">
            {primerAcceso ? "Cambio de contraseña obligatorio" : "Cambiar contraseña"}
          </h1>
          {primerAcceso && (
            <p className="text-[12.5px] text-muted">
              Es tu primer acceso: elegí una contraseña nueva para continuar.
            </p>
          )}
        </div>
        <CambiarPasswordForm />
      </div>
    </main>
  );
}

"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export async function iniciarSesion(_prev: string | undefined, formData: FormData) {
  try {
    await signIn("credentials", {
      usuario: formData.get("usuario"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
  } catch (error) {
    if (error instanceof AuthError) return "Usuario o contraseña incorrectos.";
    throw error;
  }
}

"use client";

import { useEffect, useRef } from "react";

/**
 * `<dialog>` nativo: el foco atrapado, Esc y el backdrop los pone el navegador.
 * Los hijos se montan solo mientras está abierto, para que cada apertura
 * arranque con el formulario limpio.
 */
export default function Modal({
  titulo,
  abierto,
  onCerrar,
  children,
}: {
  titulo: string;
  abierto: boolean;
  onCerrar: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      className="w-full max-w-md rounded-xl border border-border bg-surface p-6 text-text backdrop:bg-black/50"
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{titulo}</h2>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="text-faint hover:text-text"
        >
          ✕
        </button>
      </div>
      {abierto && children}
    </dialog>
  );
}

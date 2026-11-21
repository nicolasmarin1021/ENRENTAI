"use client";

import { useGuardados, type TipoGuardado } from "@/lib/guardados";

const CORAZON = "M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2z";

// Botón ♡ para guardar un equipo o una compañía (redondo y blanco, para ir sobre las fotos;
// "plano" para fondos claros). Va al lado de los botones, nunca dentro, para que cada clic haga
// una sola cosa.
export function Corazon({
  tipo,
  id,
  nombre,
  plano = false,
  className = "",
}: {
  tipo: TipoGuardado;
  id: string;
  nombre: string;
  plano?: boolean;
  className?: string;
}) {
  const { guardado, alternar } = useGuardados();
  const activo = guardado(tipo, id);
  const texto = activo ? `Quitar ${nombre} de Guardados` : `Guardar ${nombre}`;
  return (
    <button
      type="button"
      className={`corazon ${plano ? "plano" : ""} ${activo ? "on" : ""} ${className}`}
      aria-pressed={activo}
      aria-label={texto}
      title={activo ? "Quitar de Guardados" : "Guardar"}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        alternar(tipo, id);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d={CORAZON} />
      </svg>
    </button>
  );
}

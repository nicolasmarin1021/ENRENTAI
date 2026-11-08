import Link from "next/link";
import { getSesion, iniciales } from "@/lib/sesion";
import { BotonSalir } from "./entrar";

export function EtapaPill() {
  return <span className="stage-pill">Versión en construcción</span>;
}

// Parte del encabezado que depende de la sesión (va dentro de un <Suspense>).
export async function SesionHdr() {
  const s = await getSesion();
  if (!s) return <EtapaPill />;
  const quien = s.compania?.nombre || s.nombre || s.correo;
  return (
    <div className="hdr-user">
      {s.admin && <span className="tag warn">Admin</span>}
      <Link href={s.compania ? "/tengo/panel" : "/explorar"} className="hdr-me">
        <span className="avatar" aria-hidden="true">{iniciales(quien)}</span>
        <span>{quien}</span>
      </Link>
      <BotonSalir />
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGuardados } from "@/lib/guardados";
import { usePedido } from "@/lib/pedido";
import { BotonSalir } from "./entrar";

export type DatosNav = {
  conSesion: boolean;
  nombre: string;
  correo: string;
  iniciales: string;
  admin: boolean;
  compania: { nombre: string; iniciales: string } | null;
  conteos: {
    misReservas: number; // solicitudes activas del cliente (por confirmar o rentadas)
    porResponder: number; // solicitudes por confirmar de la compañía
  };
};

type Pestana = { href: string; texto: string; cuenta?: number; caliente?: boolean; activa: (ruta: string) => boolean };

const empieza = (ruta: string, ...prefijos: string[]) => prefijos.some((p) => ruta === p || ruta.startsWith(p + "/"));

// En qué modo está la persona según la página: "Necesito equipos" o "Tengo equipos".
function modoDe(ruta: string, de: string | null): "cliente" | "compania" | null {
  if (ruta === "/") return null;
  if (empieza(ruta, "/tengo")) return "compania";
  if (empieza(ruta, "/reservas") && de === "tengo") return "compania";
  return "cliente";
}

export function Navegacion({ datos }: { datos: DatosNav }) {
  const ruta = usePathname();
  const de = useSearchParams().get("de");
  const modo = modoDe(ruta, de);
  const [pedido] = usePedido();
  const { total: guardados } = useGuardados();
  const enRider = pedido.rider.reduce((a, i) => a + i.cantidad, 0);
  const c = datos.conteos;

  // Altura del encabezado en --hdr-h: el mapa de Explorar ocupa exactamente el resto de la pantalla.
  useEffect(() => {
    const hdr = document.querySelector<HTMLElement>(".hdr");
    if (!hdr) return;
    const fijar = () => document.documentElement.style.setProperty("--hdr-h", `${hdr.offsetHeight}px`);
    fijar();
    const ro = new ResizeObserver(fijar);
    ro.observe(hdr);
    return () => ro.disconnect();
  }, []);

  // BETA: el pago se acuerda aparte (no hay entregas, pagos ni liquidaciones); el chat sirve para preguntar antes de cotizar.
  // Las mismas pestañas de la app: Buscar equipos (con su subpanel Explorar), Guardados, Rider y Mis solicitudes.
  const cliente: Pestana[] = [
    { href: "/explorar", texto: "Buscar equipos", activa: (r) => r === "/explorar" || r === "/necesito" },
    { href: "/guardados", texto: "Guardados", cuenta: guardados, activa: (r) => r === "/guardados" },
    { href: "/explorar/rider", texto: "Rider", cuenta: enRider, caliente: enRider > 0, activa: (r) => r === "/explorar/rider" },
    { href: "/necesito/reservas", texto: "Mis solicitudes", cuenta: c.misReservas, activa: (r) => empieza(r, "/necesito/reservas") },
  ];
  const compania: Pestana[] = [
    {
      href: datos.compania ? "/tengo/panel" : "/tengo",
      texto: "Panel",
      cuenta: c.porResponder,
      caliente: c.porResponder > 0,
      activa: (r) => r === "/tengo" || empieza(r, "/tengo/panel", "/tengo/registro"),
    },
    { href: "/tengo/inventario", texto: "Inventario y agenda", activa: (r) => empieza(r, "/tengo/inventario") },
    { href: "/tengo/tarifas", texto: "Generalidades", activa: (r) => empieza(r, "/tengo/tarifas") },
  ];
  const pestanas = modo === "compania" ? compania : modo === "cliente" ? cliente : [];

  return (
    <>
      {modo && (
        <div className="role" role="group" aria-label="Cómo usas ENRENTA">
          <Link href="/explorar" aria-pressed={modo === "cliente"} aria-label="Necesito equipos">
            Necesito<span className="lg-only"> equipos</span>
          </Link>
          <Link
            href={datos.compania ? "/tengo/panel" : "/tengo"}
            aria-pressed={modo === "compania"}
            aria-label="Tengo equipos"
          >
            Tengo<span className="lg-only"> equipos</span>
          </Link>
        </div>
      )}
      <Cuenta datos={datos} modo={modo ?? "cliente"} />
      {pestanas.length > 0 && (
        <nav className="tabs" aria-label="Secciones">
          {pestanas.map((p) => (
            <Link key={p.href + p.texto} href={p.href} aria-current={p.activa(ruta) ? "page" : undefined}>
              {p.texto}
              {p.cuenta ? <span className={`count ${p.caliente ? "hot" : ""}`}>{p.cuenta}</span> : null}
            </Link>
          ))}
        </nav>
      )}
    </>
  );
}

// Botón de la cuenta con su menú.
function Cuenta({ datos, modo }: { datos: DatosNav; modo: "cliente" | "compania" }) {
  const [abierto, setAbierto] = useState(false);
  const caja = useRef<HTMLDivElement>(null);

  // Se cierra al hacer clic fuera o con Escape (los enlaces del menú lo cierran al usarlos).
  useEffect(() => {
    if (!abierto) return;
    const fuera = (e: MouseEvent) => {
      if (caja.current && !caja.current.contains(e.target as Node)) setAbierto(false);
    };
    const tecla = (e: KeyboardEvent) => e.key === "Escape" && setAbierto(false);
    document.addEventListener("mousedown", fuera);
    document.addEventListener("keydown", tecla);
    return () => {
      document.removeEventListener("mousedown", fuera);
      document.removeEventListener("keydown", tecla);
    };
  }, [abierto]);

  if (!datos.conSesion) {
    return (
      <div className="acct">
        <Link href={modo === "compania" ? "/tengo" : "/necesito"} className="acct-btn out">
          Entrar
        </Link>
      </div>
    );
  }

  const comoCompania = modo === "compania" && datos.compania;
  const titulo = comoCompania ? datos.compania!.nombre : datos.nombre || datos.correo;
  const iniciales = comoCompania ? datos.compania!.iniciales : datos.iniciales;
  const enlaces = comoCompania
    ? [
        { href: "/tengo/panel", texto: "Panel" },
        { href: "/tengo/inventario", texto: "Inventario y agenda" },
        { href: "/tengo/mensajes", texto: "Preguntas de clientes" },
        { href: "/tengo/tarifas", texto: "Generalidades" },
        { href: "/tengo/verificacion", texto: "Verificar mi compañía" },
        { href: "/como-funciona", texto: "Cómo funciona la BETA" },
      ]
    : [
        { href: "/necesito/reservas", texto: "Mis solicitudes" },
        { href: "/necesito/chats", texto: "Mensajes" },
        { href: "/guardados", texto: "Guardados" },
        { href: "/explorar/rider", texto: "Mi rider" },
        { href: "/necesito/verificacion", texto: "Verificar mi identidad" },
        { href: "/como-funciona", texto: "Cómo funciona la BETA" },
      ];
  if (datos.admin) enlaces.push({ href: "/admin/verificaciones", texto: "Revisar verificaciones (admin)" });

  return (
    <div className="acct" ref={caja}>
      <button
        type="button"
        className="acct-btn"
        aria-haspopup="menu"
        aria-expanded={abierto}
        aria-label={`${comoCompania ? "Tu compañía" : "Tu cuenta"}: ${titulo}`}
        onClick={() => setAbierto((a) => !a)}
      >
        <span className="avatar sm" aria-hidden="true">{iniciales}</span>
        <span className="lg-only">{titulo}</span>
      </button>
      {abierto && (
        <div className="acct-menu" role="menu">
          <div className="acct-cab">
            <b>{titulo}</b>
            <span className="fine">{datos.correo}</span>
            {datos.admin && <span className="tag warn">Admin</span>}
          </div>
          {enlaces.map((e) => (
            <Link key={e.href} href={e.href} role="menuitem" onClick={() => setAbierto(false)}>
              {e.texto}
            </Link>
          ))}
          <BotonSalir className="acct-salir" texto={comoCompania ? "Cerrar sesión de la compañía" : "Cerrar sesión"} />
        </div>
      )}
    </div>
  );
}

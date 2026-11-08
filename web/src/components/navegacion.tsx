"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
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
    misReservas: number; // pendientes, confirmadas o en curso del cliente
    entregasCliente: number; // en curso: el cliente tiene pasos por registrar
    porResponder: number; // solicitudes pendientes de la compañía
    entregasCompania: number; // confirmadas o en curso de la compañía
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

  const cliente: Pestana[] = [
    { href: "/explorar", texto: "Explorar", activa: (r) => r === "/explorar" || r === "/necesito" },
    { href: "/explorar/rider", texto: "Rider", cuenta: enRider, caliente: enRider > 0, activa: (r) => r === "/explorar/rider" },
    { href: "/necesito/reservas", texto: "Mis reservas", cuenta: c.misReservas, activa: (r) => empieza(r, "/necesito/reservas") },
    {
      href: "/necesito/entregas",
      texto: "Entregas",
      cuenta: c.entregasCliente,
      caliente: c.entregasCliente > 0,
      activa: (r) => empieza(r, "/necesito/entregas", "/reservas"),
    },
    { href: "/necesito/chats", texto: "Chats", activa: (r) => empieza(r, "/necesito/chats") },
    { href: "/necesito/pagos", texto: "Pagos", activa: (r) => empieza(r, "/necesito/pagos") },
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
    { href: "/tengo/tarifas", texto: "Tarifas", activa: (r) => empieza(r, "/tengo/tarifas") },
    {
      href: "/tengo/reservas",
      texto: "Entregas",
      cuenta: c.entregasCompania,
      activa: (r) => empieza(r, "/tengo/reservas", "/reservas"),
    },
    { href: "/tengo/mensajes", texto: "Mensajes", activa: (r) => empieza(r, "/tengo/mensajes") },
    { href: "/tengo/liquidaciones", texto: "Liquidaciones", activa: (r) => empieza(r, "/tengo/liquidaciones") },
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
        { href: "/tengo/tarifas", texto: "Tarifas" },
        { href: "/tengo/reservas", texto: "Entregas y devoluciones" },
        { href: "/tengo/mensajes", texto: "Mensajes" },
      ]
    : [
        { href: "/necesito/reservas", texto: "Mis reservas" },
        { href: "/necesito/entregas", texto: "Entregas" },
        { href: "/necesito/pagos", texto: "Pagos" },
        { href: "/necesito/chats", texto: "Chats" },
      ];

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

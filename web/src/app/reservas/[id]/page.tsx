/* eslint-disable @next/next/no-img-element -- fotos privadas con enlace firmado de Supabase */
import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AbrirCaso, AccionesCaso, RegistrarPaso } from "@/components/entregas-acciones";
import { SELECT_RESERVA, TarjetaReserva, type ReservaFila } from "@/components/tarjeta-reserva";
import { PASOS, TIPOS_CASO, type Lado, type Paso } from "@/lib/entregas";
import { fechaCO, pesos } from "@/lib/medellin";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entregas y casos" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Acta = {
  id: string;
  paso: Paso;
  autor_nombre: string;
  checks: string[];
  nota: string | null;
  creado: string;
  acta_fotos: { ruta: string; orden: number }[];
};
type Caso = {
  id: string;
  codigo: string;
  lado: Lado;
  tipo: string;
  descripcion: string;
  estado: "abierto" | "resuelto";
  creado: string;
  resuelto: string | null;
  resuelto_por_nombre: string | null;
  abierto_por_nombre: string;
  caso_fotos: { ruta: string }[];
  caso_mensajes: { autor_nombre: string; texto: string; creado: string }[];
};

export default function PaginaReserva({ params }: PageProps<"/reservas/[id]">) {
  return (
    <section className="page-mid">
      <Suspense fallback={<p className="muted">Cargando la reserva…</p>}>
        <Contenido params={params} />
      </Suspense>
    </section>
  );
}

async function Contenido({ params }: Pick<PageProps<"/reservas/[id]">, "params">) {
  const [{ id }, s] = await Promise.all([params, getSesion()]);
  if (!s) {
    return (
      <div className="card">
        <p>Entra con tu cuenta para ver esta reserva.</p>
        <Link href="/necesito" className="btn primary">Entrar</Link>
      </div>
    );
  }
  const noEncontrada = (
    <div className="card">
      <p>No encontramos esa reserva.</p>
      <Link href="/necesito/reservas" className="btn primary">Ver mis reservas</Link>
    </div>
  );
  if (!UUID.test(id)) return noEncontrada;

  const supabase = await createClient();
  const [{ data: r }, actasRes, casosRes] = await Promise.all([
    supabase.from("reservas").select(SELECT_RESERVA + ", cliente, compania_id").eq("id", id).maybeSingle(),
    supabase
      .from("actas")
      .select("id, paso, autor_nombre, checks, nota, creado, acta_fotos(ruta, orden)")
      .eq("reserva_id", id),
    supabase
      .from("casos")
      .select(
        "id, codigo, lado, tipo, descripcion, estado, creado, resuelto, resuelto_por_nombre, abierto_por_nombre, caso_fotos(ruta), caso_mensajes(autor_nombre, texto, creado)",
      )
      .eq("reserva_id", id)
      .order("creado"),
  ]);
  const reserva = r as unknown as (ReservaFila & { cliente: string; compania_id: string }) | null;
  if (!reserva) return noEncontrada;

  const lado: Lado = reserva.cliente === s.id ? "cliente" : "compania";
  const volver = lado === "cliente" ? { href: "/necesito/reservas", texto: "Mis reservas" } : { href: "/tengo/reservas", texto: "Reservas" };

  if (actasRes.error || casosRes.error) {
    return (
      <>
        <Link href={volver.href} className="back-link">← {volver.texto}</Link>
        <TarjetaReserva r={reserva} vista={lado} enlace={false} />
        <p className="form-err">
          {actasRes.error?.code === "PGRST205" || casosRes.error?.code === "PGRST205"
            ? "Las entregas con fotos aún no están activadas: falta ejecutar el SQL 0004_entregas.sql en Supabase."
            : "No pudimos cargar las entregas. Recarga la página."}
        </p>
      </>
    );
  }

  const actas = (actasRes.data ?? []) as Acta[];
  const casos = (casosRes.data ?? []) as Caso[];
  const hecho = (p: Paso) => actas.find((a) => a.paso === p);

  // Enlaces firmados (1 hora) para ver las fotos privadas.
  const rutas = [
    ...actas.flatMap((a) => a.acta_fotos.map((f) => f.ruta)),
    ...casos.flatMap((c) => c.caso_fotos.map((f) => f.ruta)),
  ];
  const firmadas = new Map<string, string>();
  if (rutas.length) {
    const { data } = await supabase.storage.from("entregas").createSignedUrls(rutas, 3600);
    data?.forEach((d) => d.path && d.signedUrl && firmadas.set(d.path, d.signedUrl));
  }

  const ahora = new Date();
  const disponible = (p: Paso) => {
    const def = PASOS.find((x) => x.k === p)!;
    if (def.quien !== lado || hecho(p)) return false;
    if (p === "salida") return reserva.estado === "confirmada";
    if (reserva.estado !== "en_curso" || !hecho("salida")) return false;
    if (p === "revision") return Boolean(hecho("devolucion")) || ahora >= new Date(reserva.recogida);
    return true;
  };
  const abiertos = casos.filter((c) => c.estado === "abierto").length;
  const deposito =
    abiertos > 0
      ? { tono: "warn", texto: `Depósito retenido (${pesos(reserva.deposito)}): hay ${abiertos === 1 ? "un caso abierto" : `${abiertos} casos abiertos`}.` }
      : reserva.estado === "completada"
        ? { tono: "ok", texto: `Reserva cerrada: el depósito (${pesos(reserva.deposito)}) se devuelve al cliente.` }
        : { tono: "", texto: `Depósito en garantía (${pesos(reserva.deposito)}) hasta la revisión final.` };
  const conEntregas = ["confirmada", "en_curso", "completada"].includes(reserva.estado);

  return (
    <>
      <Link href={volver.href} className="back-link">← {volver.texto}</Link>
      <TarjetaReserva r={reserva} vista={lado} enlace={false} />

      {conEntregas && (
        <>
          <div className="page-hd">
            <div>
              <h2 className="title-lg">Entrega y devolución</h2>
              <p className="muted">Cuatro pasos con fotos para que ambas partes tengan constancia de cómo sale y vuelve el equipo.</p>
            </div>
          </div>
          <p className={`deposito-estado ${deposito.tono}`}>{deposito.texto}</p>

          <ol className="pasos-entrega">
            {PASOS.map((p, i) => {
              const a = hecho(p.k);
              const puedo = disponible(p.k);
              return (
                <li key={p.k} className={`card paso-entrega ${a ? "hecho" : puedo ? "actual" : ""}`}>
                  <div className="paso-cab">
                    <span className="num" aria-hidden="true">{a ? "✓" : i + 1}</span>
                    <div>
                      <h3>{p.titulo}</h3>
                      <span className="fine">
                        {p.quien === "compania" ? "La compañía" : "El cliente"}
                        {a ? ` · ${a.autor_nombre} · ${fechaCO(a.creado)}` : ""}
                      </span>
                    </div>
                  </div>
                  {a ? (
                    <>
                      <div className="fotos">
                        {a.acta_fotos
                          .sort((x, y) => x.orden - y.orden)
                          .map((f, k) =>
                            firmadas.get(f.ruta) ? (
                              <a key={f.ruta} className="foto" href={firmadas.get(f.ruta)} target="_blank" rel="noreferrer">
                                <img src={firmadas.get(f.ruta)} alt={`${p.titulo}: foto ${k + 1}`} loading="lazy" />
                              </a>
                            ) : null,
                          )}
                      </div>
                      <ul className="checks-hechos">
                        {a.checks.map((c) => (
                          <li key={c}>✓ {c}</li>
                        ))}
                      </ul>
                      {a.nota && <p className="note">{a.nota}</p>}
                    </>
                  ) : puedo ? (
                    <>
                      <p className="muted">{p.desc}</p>
                      <RegistrarPaso reservaId={reserva.id} paso={p.k} />
                    </>
                  ) : (
                    <p className="fine">
                      {p.k === "revision" && p.quien === lado && hecho("salida") && !hecho("devolucion")
                        ? `Disponible cuando el cliente registre la devolución o desde la hora de recogida (${fechaCO(reserva.recogida)}).`
                        : p.desc}
                    </p>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      <section id="casos" className="eq-list" aria-label="Casos">
        <div className="page-hd">
          <div>
            <h2 className="title-lg">Casos</h2>
            <p className="muted">Si algo no salió bien (daño, faltante, retraso, cobro), ábrelo aquí. Ambas partes y ENRENTA lo ven.</p>
          </div>
        </div>
        {casos.length === 0 && <p className="muted">No hay casos en esta reserva.</p>}
        {casos.map((c) => (
          <article key={c.id} className="card caso">
            <header className="ventana-hd">
              <div>
                <span className="fine">
                  {c.codigo} · abierto por {c.abierto_por_nombre} · {fechaCO(c.creado)}
                </span>
                <h3>{TIPOS_CASO[c.tipo] ?? c.tipo}</h3>
              </div>
              <span className={`tag ${c.estado === "abierto" ? "warn" : "ok"}`}>
                {c.estado === "abierto" ? "Abierto" : "Resuelto"}
              </span>
            </header>
            <p>{c.descripcion}</p>
            {c.caso_fotos.length > 0 && (
              <div className="fotos">
                {c.caso_fotos.map((f, k) =>
                  firmadas.get(f.ruta) ? (
                    <a key={f.ruta} className="foto" href={firmadas.get(f.ruta)} target="_blank" rel="noreferrer">
                      <img src={firmadas.get(f.ruta)} alt={`Caso ${c.codigo}: foto ${k + 1}`} loading="lazy" />
                    </a>
                  ) : null,
                )}
              </div>
            )}
            {c.caso_mensajes.length > 0 && (
              <ul className="mensajes">
                {[...c.caso_mensajes]
                  .sort((x, y) => x.creado.localeCompare(y.creado))
                  .map((m, k) => (
                    <li key={k}>
                      <span className="fine">
                        {m.autor_nombre} · {fechaCO(m.creado)}
                      </span>
                      <p>{m.texto}</p>
                    </li>
                  ))}
              </ul>
            )}
            {c.estado === "resuelto" && (
              <p className="fine">
                Resuelto por {c.resuelto_por_nombre}
                {c.resuelto ? ` · ${fechaCO(c.resuelto)}` : ""}
              </p>
            )}
            <AccionesCaso casoId={c.id} abierto={c.estado === "abierto"} />
          </article>
        ))}
        {conEntregas && <AbrirCaso reservaId={reserva.id} />}
      </section>
    </>
  );
}

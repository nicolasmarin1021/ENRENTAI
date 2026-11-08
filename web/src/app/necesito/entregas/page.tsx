import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ESTADOS_RESERVA } from "@/lib/cobro";
import { PASOS, type Paso } from "@/lib/entregas";
import { fechaCO } from "@/lib/medellin";
import { getSesion } from "@/lib/sesion";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entregas" };

type Fila = {
  id: string;
  codigo: string;
  estado: string;
  entrega: string;
  recogida: string;
  lugar_nombre: string;
  companias: { nombre: string } | null;
  actas: { paso: Paso }[];
};

export default function Entregas() {
  return (
    <section className="page-mid">
      <div>
        <h1 className="title-lg">Entregas y devoluciones</h1>
        <p className="muted">
          Registra con fotos cómo recibes y devuelves el equipo. Es tu respaldo y el de la compañía.
        </p>
      </div>
      <Suspense fallback={<p className="muted">Cargando…</p>}>
        <Lista />
      </Suspense>
    </section>
  );
}

async function Lista() {
  const s = await getSesion();
  if (!s) {
    return (
      <div className="card">
        <p>Entra con tu correo para ver tus entregas.</p>
        <Link href="/necesito" className="btn primary">Entrar</Link>
      </div>
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reservas")
    .select("id, codigo, estado, entrega, recogida, lugar_nombre, companias(nombre), actas(paso)")
    .eq("cliente", s.id)
    .in("estado", ["confirmada", "en_curso", "completada"])
    .order("entrega", { ascending: true });

  if (error) {
    return <p className="form-err">No pudimos cargar tus entregas. Si es la primera vez, revisa que el SQL 0004_entregas.sql esté ejecutado.</p>;
  }
  const filas = (data ?? []) as unknown as Fila[];
  const activas = filas.filter((r) => r.estado !== "completada");
  const cerradas = filas.filter((r) => r.estado === "completada").reverse().slice(0, 10);

  if (!filas.length) {
    return (
      <div className="empty">
        <h2>Aún no tienes entregas</h2>
        <p className="muted">Cuando una compañía confirme tu reserva, aquí registras la recepción y la devolución.</p>
        <Link href="/explorar" className="btn primary">Ir a Explorar</Link>
      </div>
    );
  }
  return (
    <>
      {activas.map((r) => (
        <TarjetaEntrega key={r.id} r={r} />
      ))}
      {cerradas.length > 0 && (
        <>
          <h2 className="sec-titulo">Cerradas</h2>
          {cerradas.map((r) => (
            <TarjetaEntrega key={r.id} r={r} />
          ))}
        </>
      )}
    </>
  );
}

function TarjetaEntrega({ r }: { r: Fila }) {
  const hechos = new Set(r.actas.map((a) => a.paso));
  const siguiente = PASOS.find((p) => !hechos.has(p.k));
  const meToca = siguiente?.quien === "cliente" && r.estado === "en_curso";
  const est = ESTADOS_RESERVA[r.estado] ?? { texto: r.estado, tono: "" };
  return (
    <article className={`card ${meToca ? "paso-entrega actual" : ""}`}>
      <header className="ventana-hd">
        <div>
          <span className="fine">
            {r.codigo} · {r.companias?.nombre}
          </span>
          <h2 style={{ fontSize: 18 }}>
            {fechaCO(r.entrega)} → {fechaCO(r.recogida)}
          </h2>
          <span className="fine">{r.lugar_nombre}</span>
        </div>
        <span className={`tag ${est.tono}`}>{est.texto}</span>
      </header>
      <ol className="progreso" aria-label="Avance de la entrega">
        {PASOS.map((p) => (
          <li key={p.k} className={hechos.has(p.k) ? "hecho" : p === siguiente ? "actual" : ""}>
            <span aria-hidden="true">{hechos.has(p.k) ? "✓" : ""}</span>
            {p.titulo}
          </li>
        ))}
      </ol>
      <div className="row-actions">
        <Link href={`/reservas/${r.id}`} className={`btn ${meToca ? "primary" : ""}`}>
          {meToca && siguiente ? `${siguiente.verbo} →` : "Ver entrega y casos →"}
        </Link>
        {!meToca && siguiente && r.estado !== "completada" && (
          <span className="fine">
            Sigue: {siguiente.titulo.toLowerCase()} ({siguiente.quien === "compania" ? "la compañía" : "tú"})
          </span>
        )}
      </div>
    </article>
  );
}

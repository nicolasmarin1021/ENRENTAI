import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { UbicacionBodega } from "@/components/ubicacion-bodega";
import { getSesion } from "@/lib/sesion";
import { pesos } from "@/lib/medellin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mi panel" };

export default function Panel() {
  return (
    <section className="page-mid">
      <Suspense fallback={<p className="muted">Cargando tu panel…</p>}>
        <Contenido />
      </Suspense>
    </section>
  );
}

async function Contenido() {
  const s = await getSesion();
  if (!s) {
    return (
      <div className="card">
        <p>Entra con el correo de tu compañía para ver tu panel.</p>
        <Link href="/tengo" className="btn primary">Entrar</Link>
      </div>
    );
  }
  if (!s.compania) {
    return (
      <div className="card">
        <p>Todavía no has registrado tu compañía.</p>
        <Link href="/tengo/registro" className="btn primary">Registrar mi compañía</Link>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: c }, { data: priv }, { count }, { count: pendientes }] = await Promise.all([
    supabase.from("companias").select("*").eq("id", s.compania.id).single(),
    supabase.from("companias_privado").select("*").eq("compania_id", s.compania.id).maybeSingle(),
    supabase.from("equipos").select("id", { count: "exact", head: true }).eq("compania_id", s.compania.id),
    supabase
      .from("reservas")
      .select("id", { count: "exact", head: true })
      .eq("compania_id", s.compania.id)
      .eq("estado", "pendiente"),
  ]);
  if (!c) return <p className="form-err">No pudimos cargar tu compañía. Recarga la página.</p>;

  const transporte =
    c.cobertura_km === 0
      ? "No aplica (solo retiro en bodega)"
      : c.transporte_modo === "fijo"
        ? `${pesos(c.transporte_fijo)} fijo por servicio`
        : `${c.transporte_base > 0 ? `${pesos(c.transporte_base)} + ` : ""}${pesos(c.transporte_km)} por km`;

  return (
    <>
      <div className="row-actions" style={{ justifyContent: "space-between" }}>
        <h1 className="title-xl">
          Hola, <em>{c.nombre}</em>
        </h1>
        {c.verificada ? (
          <span className="tag ok">✓ Compañía verificada</span>
        ) : (
          <span className="tag warn">En revisión</span>
        )}
      </div>
      {!c.verificada && (
        <p className="muted">
          ENRENTA revisa los datos de tu compañía antes de mostrar el sello de verificada. Mientras tanto ya puedes
          preparar tu inventario.
        </p>
      )}

      {pendientes ? (
        <div className="card aviso-reservas">
          <h2>
            Tienes {pendientes} {pendientes === 1 ? "solicitud" : "solicitudes"} por responder
          </h2>
          <p className="muted">Los clientes esperan tu respuesta para confirmar sus fechas.</p>
          <Link href="/tengo/reservas" className="btn primary" style={{ justifySelf: "start" }}>Ver reservas</Link>
        </div>
      ) : null}

      <div className="card">
        <h2>{count ? "Tu inventario" : "Publica tu primer equipo"}</h2>
        <p className="muted">
          {count
            ? `Tienes ${count} ${count === 1 ? "equipo" : "equipos"} en tu inventario.`
            : "Aún no tienes equipos. Cuando publiques el primero, tu compañía aparece en el mapa de Medellín."}
        </p>
        <div className="row-actions">
          <Link href={count ? "/tengo/inventario" : "/tengo/inventario/nuevo"} className="btn primary">
            {count ? "Ver inventario" : "+ Publicar equipo"}
          </Link>
          {count ? <Link href="/tengo/inventario/nuevo" className="link-btn">Publicar otro equipo</Link> : null}
        </div>
      </div>

      <div className="card">
        <h2>Tu compañía</h2>
        <dl className="dl">
          <div>
            <dt>Bodega</dt>
            <dd>{c.direccion_bodega}</dd>
          </div>
          <div>
            <dt>Zona</dt>
            <dd>
              {c.zona}
              {c.ciudad !== c.zona ? ` · ${c.ciudad}` : ""}
            </dd>
          </div>
          <div>
            <dt>Horario</dt>
            <dd>{c.horario_bodega || "Sin definir"}</dd>
          </div>
          <div>
            <dt>Entregas</dt>
            <dd>{c.cobertura_km === 0 ? "Solo retiro en bodega" : `Hasta ${c.cobertura_km} km`}</dd>
          </div>
          <div>
            <dt>Depósito</dt>
            <dd>{Number(c.deposito_pct)} % del valor de la renta</dd>
          </div>
          <div>
            <dt>Transporte</dt>
            <dd>{transporte}</dd>
          </div>
          <div>
            <dt>Técnico</dt>
            <dd>{c.tecnico_nombre ? `${c.tecnico_nombre} · ${pesos(c.tecnico_tarifa_dia ?? 0)} por día` : "No ofrecido"}</dd>
          </div>
        </dl>
      </div>

      <div className="card">
        <h2>Ubicación de la bodega en el mapa</h2>
        <p className="muted">
          Al registrarte la ubicamos en el centro aproximado de {c.zona ?? "tu zona"}. Mueve el pin hasta la puerta de tu
          bodega para que los clientes vean la distancia y el costo de entrega exactos.
        </p>
        <UbicacionBodega
          companiaId={c.id}
          inicial={c.lat !== null && c.lng !== null ? { lat: Number(c.lat), lng: Number(c.lng) } : null}
        />
      </div>

      {priv && (
        <div className="card">
          <h2>Contacto privado</h2>
          <dl className="dl">
            <div>
              <dt>Persona de contacto</dt>
              <dd>{priv.contacto}</dd>
            </div>
            <div>
              <dt>Teléfono</dt>
              <dd>{priv.telefono}</dd>
            </div>
            <div>
              <dt>Correo</dt>
              <dd>{priv.correo}</dd>
            </div>
            <div>
              <dt>NIT</dt>
              <dd>{priv.nit || "Sin registrar"}</dd>
            </div>
          </dl>
          <p className="fine">Solo tú y ENRENTA ven estos datos.</p>
        </div>
      )}
    </>
  );
}

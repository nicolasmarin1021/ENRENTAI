"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { COMISION, SERVICIO } from "@/lib/cobro";
import { costoTransporte, type Transporte } from "@/lib/geo";
import { pesos } from "@/lib/medellin";
import { conPuntos, soloNumero } from "@/lib/moneda";
import { createClient } from "@/lib/supabase/client";

// Tarifas de la compañía tal como están en la base de datos.
export type Tarifas = Transporte & {
  id: string;
  deposito_pct: number;
  tecnico_nombre: string | null;
  tecnico_tarifa_dia: number | null;
  direccion_bodega: string | null;
  horario_bodega: string | null;
};

const COBERTURAS = [0, 10, 15, 20, 25, 30, 35, 40, 45];

// El formulario trabaja con textos (los montos llevan puntos de miles).
type Form = {
  deposito: string;
  cobertura: string;
  modo: "fijo" | "variable";
  fijo: string;
  base: string;
  km: string;
  direccion: string;
  horario: string;
  tecnico: string;
  tarifaTecnico: string;
};

const desde = (t: Tarifas): Form => ({
  deposito: String(Number(t.deposito_pct)),
  cobertura: String(t.cobertura_km),
  modo: t.transporte_modo,
  fijo: conPuntos(t.transporte_fijo),
  base: conPuntos(t.transporte_base),
  km: conPuntos(t.transporte_km),
  direccion: t.direccion_bodega ?? "",
  horario: t.horario_bodega ?? "",
  tecnico: t.tecnico_nombre ?? "",
  tarifaTecnico: t.tecnico_tarifa_dia ? conPuntos(t.tecnico_tarifa_dia) : "",
});

// Lo que se guarda en la base de datos. Si la compañía deja de entregar, se conservan sus
// valores de transporte para cuando vuelva a activar las entregas.
const aGuardar = (f: Form) => ({
  deposito_pct: Number(f.deposito),
  cobertura_km: Number(f.cobertura),
  transporte_modo: f.modo,
  transporte_fijo: soloNumero(f.fijo),
  transporte_base: soloNumero(f.base),
  transporte_km: soloNumero(f.km),
  tecnico_nombre: f.tecnico.trim() || null,
  tecnico_tarifa_dia: f.tecnico.trim() ? soloNumero(f.tarifaTecnico) : null,
  direccion_bodega: f.direccion.trim() || null,
  horario_bodega: f.horario.trim() || null,
});

function validar(f: Form) {
  const dep = Number(f.deposito);
  if (f.deposito.trim() === "" || !Number.isFinite(dep) || dep < 0 || dep > 100)
    return "El depósito debe ser un porcentaje entre 0 y 100.";
  const entrega = f.cobertura !== "0";
  if (entrega && f.modo === "fijo" && f.fijo.trim() === "")
    return "Escribe el valor fijo del transporte (puede ser 0 si va incluido).";
  if (entrega && f.modo === "variable" && soloNumero(f.km) <= 0)
    return "Escribe cuánto cobras por kilómetro de transporte.";
  if (f.tecnico.trim() && soloNumero(f.tarifaTecnico) <= 0) return "Escribe la tarifa por día del técnico.";
  if (!f.tecnico.trim() && soloNumero(f.tarifaTecnico) > 0) return "Escribe qué técnico ofreces (p. ej. Técnico RF).";
  if (f.direccion.trim().length < 6) return "Escribe la dirección de la bodega.";
  return "";
}

export function TarifasVista({ inicial }: { inicial: Tarifas }) {
  const router = useRouter();
  const [f, setF] = useState<Form>(() => desde(inicial));
  const [error, setError] = useState("");
  const [guardado, setGuardado] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  const cambiar = (cambio: Partial<Form>) => {
    setF((p) => ({ ...p, ...cambio }));
    setGuardado(false);
    setError("");
  };
  type CampoTexto = Exclude<keyof Form, "modo">;
  const texto = (k: CampoTexto) => (e: { target: { value: string } }) =>
    cambiar({ [k]: e.target.value } as Partial<Form>);
  const moneda = (k: CampoTexto) => (e: { target: { value: string } }) =>
    cambiar({ [k]: conPuntos(e.target.value) } as Partial<Form>);

  const valores = aGuardar(f);
  const hayCambios = JSON.stringify(valores) !== JSON.stringify(aGuardar(desde(inicial)));
  const entrega = valores.cobertura_km > 0;
  const coberturas = COBERTURAS.includes(inicial.cobertura_km)
    ? COBERTURAS
    : [...COBERTURAS, inicial.cobertura_km].sort((a, b) => a - b);
  const transporte: Transporte = valores;

  // Ejemplos en vivo mientras la compañía escribe.
  const depPct = Number.isFinite(valores.deposito_pct) ? Math.min(Math.max(valores.deposito_pct, 0), 100) : 0;
  const distancias = [...new Set([5, 15, valores.cobertura_km])].filter((d) => d <= valores.cobertura_km);
  const ejemploTransporte =
    valores.transporte_modo === "fijo"
      ? `Cada servicio de entrega y recogida cuesta ${pesos(valores.transporte_fijo)}, sin importar la distancia.`
      : distancias
          .map((d) => `a ${d} km: ${pesos(costoTransporte(transporte, d) ?? 0)}`)
          .join(" · ")
          .replace(/^a/, "A") + ".";

  async function guardar(e: FormEvent) {
    e.preventDefault();
    const problema = validar(f);
    if (problema) {
      setError(problema);
      return;
    }
    setOcupado(true);
    setError("");
    // .select() confirma que de verdad se actualizó la fila (las reglas de acceso no dan error si no la encuentran).
    const { data, error: err } = await createClient()
      .from("companias")
      .update(valores)
      .eq("id", inicial.id)
      .select("id");
    setOcupado(false);
    if (err || !data?.length) {
      setError("No pudimos guardar tus tarifas. Revisa tu conexión e intenta de nuevo.");
      return;
    }
    setGuardado(true);
    router.refresh();
  }

  return (
    <div className="tarifas">
      <form className="form" onSubmit={guardar} noValidate>
        <section className="card" aria-labelledby="t-dep">
          <h2 id="t-dep">Depósito reembolsable</h2>
          <p className="fine">
            Porcentaje del alquiler que el cliente deja en garantía. ENRENTA lo guarda y se lo devuelve al cliente cuando
            registras la revisión final sin novedades.
          </p>
          <div className="field">
            <label htmlFor="t-deposito">Porcentaje del alquiler</label>
            <div className="unidad">
              <input
                id="t-deposito"
                type="number"
                inputMode="numeric"
                min={0}
                max={100}
                step={5}
                value={f.deposito}
                onChange={texto("deposito")}
              />
              <span aria-hidden="true">%</span>
            </div>
          </div>
          <p className="ejemplo">
            En un alquiler de {pesos(1000000)}, el depósito sería {pesos(Math.round((1000000 * depPct) / 100))}.
          </p>
        </section>

        <section className="card" aria-labelledby="t-tr">
          <h2 id="t-tr">Transporte</h2>
          <div className="field">
            <label htmlFor="t-cobertura">Cobertura de entregas</label>
            <select id="t-cobertura" value={f.cobertura} onChange={texto("cobertura")}>
              {coberturas.map((k) => (
                <option key={k} value={String(k)}>
                  {k ? `Entrego hasta ${k} km` : "Solo retiro en bodega"}
                </option>
              ))}
            </select>
            <span className="hint">
              {entrega
                ? "Los clientes con shows más lejos solo pueden recoger y devolver en tu bodega."
                : "Los clientes recogen y devuelven el equipo en tu bodega, sin costo de transporte."}
            </span>
          </div>
          {entrega && (
            <>
              <fieldset className="field">
                <legend>Cómo cobras la entrega y la recogida</legend>
                <div className="seg">
                  <label>
                    <input
                      type="radio"
                      name="t-modo"
                      value="variable"
                      checked={f.modo === "variable"}
                      onChange={() => cambiar({ modo: "variable" })}
                    />
                    <span>
                      <b>Según la distancia</b>
                      <span className="fine">Un valor base más un valor por kilómetro desde tu bodega.</span>
                    </span>
                  </label>
                  <label>
                    <input
                      type="radio"
                      name="t-modo"
                      value="fijo"
                      checked={f.modo === "fijo"}
                      onChange={() => cambiar({ modo: "fijo" })}
                    />
                    <span>
                      <b>Valor fijo</b>
                      <span className="fine">Lo mismo por cada servicio, sin importar la distancia.</span>
                    </span>
                  </label>
                </div>
              </fieldset>
              {f.modo === "fijo" ? (
                <div className="field">
                  <label htmlFor="t-fijo">Valor por entrega y recogida (COP)</label>
                  <input id="t-fijo" inputMode="numeric" placeholder="Ej.: 120.000" value={f.fijo} onChange={moneda("fijo")} />
                  <span className="hint">Escribe 0 si el transporte va incluido en tus precios.</span>
                </div>
              ) : (
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="t-base">Valor base (COP, opcional)</label>
                    <input id="t-base" inputMode="numeric" placeholder="Ej.: 40.000" value={f.base} onChange={moneda("base")} />
                  </div>
                  <div className="field">
                    <label htmlFor="t-km">Valor por kilómetro (COP)</label>
                    <input id="t-km" inputMode="numeric" placeholder="Ej.: 3.500" value={f.km} onChange={moneda("km")} />
                  </div>
                </div>
              )}
              <p className="ejemplo">{ejemploTransporte}</p>
            </>
          )}
        </section>

        <section className="card" aria-labelledby="t-bod">
          <h2 id="t-bod">Bodega</h2>
          <p className="fine">
            Los clientes que eligen recoger el equipo ven esta dirección y este horario. El punto exacto en el mapa lo
            ajustas en el <Link href="/tengo/panel">Panel</Link>.
          </p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="t-dir">Dirección</label>
              <input
                id="t-dir"
                autoComplete="street-address"
                placeholder="Ej.: Cra. 50 # 10-20, bodega 3"
                value={f.direccion}
                onChange={texto("direccion")}
              />
            </div>
            <div className="field">
              <label htmlFor="t-horario">Horario de atención</label>
              <input id="t-horario" placeholder="Ej.: Lun a sáb, 8:00 a 18:00" value={f.horario} onChange={texto("horario")} />
            </div>
          </div>
        </section>

        <section className="card" aria-labelledby="t-tec">
          <h2 id="t-tec">
            Técnico <span className="fine">opcional</span>
          </h2>
          <p className="fine">Si ofreces un técnico, el cliente puede agregarlo a su reserva. Se cobra por cada día de renta.</p>
          <div className="form-grid">
            <div className="field">
              <label htmlFor="t-tecnico">Qué técnico ofreces</label>
              <input id="t-tecnico" placeholder="Ej.: Técnico RF" value={f.tecnico} onChange={texto("tecnico")} />
            </div>
            <div className="field">
              <label htmlFor="t-tarifa">Tarifa por día (COP)</label>
              <input
                id="t-tarifa"
                inputMode="numeric"
                placeholder="Ej.: 350.000"
                value={f.tarifaTecnico}
                onChange={moneda("tarifaTecnico")}
              />
            </div>
          </div>
        </section>

        {error && (
          <p className="form-err" role="alert">
            {error}
          </p>
        )}
        {guardado && !hayCambios && (
          <p className="form-ok" role="status">
            Tarifas guardadas. Aplican a las solicitudes nuevas.
          </p>
        )}
        <div className="row-actions guardar-tarifas">
          <button type="submit" className="btn primary lg" disabled={ocupado || !hayCambios}>
            {ocupado ? "Guardando…" : "Guardar tarifas"}
          </button>
          {hayCambios && <span className="fine">Tienes cambios sin guardar.</span>}
        </div>
      </form>

      <Simulador f={f} valores={valores} />
    </div>
  );
}

// Ejemplo de una reserva con las tarifas que hay en pantalla (mismas cuentas de la base de datos).
function Simulador({ f, valores }: { f: Form; valores: ReturnType<typeof aGuardar> }) {
  const [alquilerDia, setAlquilerDia] = useState("1.000.000");
  const [dias, setDias] = useState(1);
  const [km, setKm] = useState(12);
  const [modalidad, setModalidad] = useState<"entrega" | "retiro">("entrega");
  const [conTecnico, setConTecnico] = useState(false);

  const entrega = valores.cobertura_km > 0;
  const quiereEntrega = entrega && modalidad === "entrega";
  const costo = costoTransporte(valores, km);
  const fueraDeCobertura = quiereEntrega && costo === null;
  const tecnicoDia = valores.tecnico_nombre && valores.tecnico_tarifa_dia ? valores.tecnico_tarifa_dia : 0;
  const depPct = Number.isFinite(valores.deposito_pct) ? Math.min(Math.max(valores.deposito_pct, 0), 100) : 0;

  const alquiler = soloNumero(alquilerDia) * dias;
  const transporte = quiereEntrega ? costo ?? 0 : 0;
  const tecnico = conTecnico && tecnicoDia ? tecnicoDia * dias : 0;
  const base = alquiler + transporte + tecnico;
  const servicio = Math.round(base * SERVICIO);
  const deposito = Math.round((alquiler * depPct) / 100);
  const comision = Math.round(base * COMISION);

  return (
    <aside className="card sim" aria-labelledby="sim-titulo">
      <div>
        <h2 id="sim-titulo">Así se ve una reserva</h2>
        <p className="fine">Prueba tus tarifas con un ejemplo. Aquí no se guarda nada.</p>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="sim-alq">Alquiler por día</label>
          <input id="sim-alq" inputMode="numeric" value={alquilerDia} onChange={(e) => setAlquilerDia(conPuntos(e.target.value))} />
        </div>
        <div className="field">
          <label htmlFor="sim-dias">Días</label>
          <input
            id="sim-dias"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            value={dias}
            onChange={(e) => setDias(Math.min(Math.max(Number(e.target.value) || 1, 1), 30))}
          />
        </div>
        {entrega && (
          <fieldset className="field span2">
            <legend>Logística</legend>
            <div className="seg">
              <label>
                <input type="radio" name="sim-mod" checked={modalidad === "entrega"} onChange={() => setModalidad("entrega")} />
                Entrega en el show
              </label>
              <label>
                <input type="radio" name="sim-mod" checked={modalidad === "retiro"} onChange={() => setModalidad("retiro")} />
                Retiro en bodega
              </label>
            </div>
          </fieldset>
        )}
        {quiereEntrega && (
          <div className="field span2">
            <label htmlFor="sim-km">
              Distancia del show a tu bodega: <b>{km} km</b>
            </label>
            <input id="sim-km" type="range" min={1} max={60} step={1} value={km} onChange={(e) => setKm(Number(e.target.value))} />
          </div>
        )}
        {tecnicoDia > 0 && (
          <label className="switch span2">
            <input type="checkbox" checked={conTecnico} onChange={(e) => setConTecnico(e.target.checked)} />
            <span>Con {f.tecnico.trim() || "técnico"}</span>
          </label>
        )}
      </div>

      {fueraDeCobertura && (
        <p className="aviso-sim">
          Con tu cobertura actual no entregas a {km} km: ese cliente solo podría recoger en tu bodega.
        </p>
      )}

      <h3 className="lbl">Paga el cliente</h3>
      <dl className="cobro">
        <div>
          <dt>
            Alquiler ({dias} {dias === 1 ? "día" : "días"})
          </dt>
          <dd>{pesos(alquiler)}</dd>
        </div>
        <div>
          <dt>Transporte</dt>
          <dd>{quiereEntrega ? (fueraDeCobertura ? "No disponible" : pesos(transporte)) : "Retiro en bodega · $ 0"}</dd>
        </div>
        {tecnico > 0 && (
          <div>
            <dt>Técnico</dt>
            <dd>{pesos(tecnico)}</dd>
          </div>
        )}
        <div>
          <dt>Tarifa de servicio ENRENTA ({Math.round(SERVICIO * 100)} %)</dt>
          <dd>{pesos(servicio)}</dd>
        </div>
        <div>
          <dt>Depósito reembolsable ({depPct} %)</dt>
          <dd>{pesos(deposito)}</dd>
        </div>
        <div className="total">
          <dt>Total</dt>
          <dd>{pesos(base + servicio + deposito)}</dd>
        </div>
      </dl>

      <h3 className="lbl">Recibes tú</h3>
      <dl className="cobro">
        <div>
          <dt>Alquiler, transporte y técnico</dt>
          <dd>{pesos(base)}</dd>
        </div>
        <div>
          <dt>Comisión ENRENTA ({Math.round(COMISION * 100)} %)</dt>
          <dd>− {pesos(comision)}</dd>
        </div>
        <div className="total">
          <dt>Recibes</dt>
          <dd>{pesos(base - comision)}</dd>
        </div>
      </dl>
      <p className="fine">
        La tarifa de servicio la paga el cliente y el depósito no hace parte de tu pago: ENRENTA lo guarda y se lo devuelve
        al cliente al cerrar la entrega sin novedades.
      </p>
    </aside>
  );
}

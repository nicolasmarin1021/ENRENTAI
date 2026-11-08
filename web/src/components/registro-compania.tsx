"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import { ZONAS, pesos } from "@/lib/medellin";

const soloNumero = (v: string) => Number(v.replace(/\D/g, "") || 0);
const conPuntos = (v: string) => {
  const n = v.replace(/\D/g, "");
  return n ? Number(n).toLocaleString("es-CO") : "";
};

type Props = { uid: string; contacto: string; correo: string };

export function RegistroCompania({ uid, contacto, correo }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [f, setF] = useState({
    nombre: "",
    nit: "",
    contacto,
    telefono: "",
    correo,
    direccion: "",
    zona: "",
    horario: "",
    cobertura: "30",
    deposito: "30",
    transporte: "variable" as "fijo" | "variable",
    fijo: "",
    base: "",
    km: "",
    tecnico: "",
    tarifaTecnico: "",
  });
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF((p) => ({ ...p, [k]: e.target.value }));
  const setMoneda = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF((p) => ({ ...p, [k]: conPuntos(e.target.value) }));
  const entrega = f.cobertura !== "0";

  function validar() {
    if (f.nombre.trim().length < 2) return "Escribe el nombre de la compañía.";
    if (f.contacto.trim().length < 2) return "Escribe el nombre de la persona de contacto.";
    if (f.telefono.replace(/\D/g, "").length < 7) return "Escribe un teléfono o WhatsApp de contacto.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.correo.trim())) return "Escribe un correo válido para la compañía.";
    if (f.direccion.trim().length < 6) return "Escribe la dirección exacta de la bodega.";
    if (!f.zona) return "Elige la zona donde está la bodega.";
    const dep = Number(f.deposito);
    if (!Number.isFinite(dep) || dep < 0 || dep > 100) return "El depósito debe ser un porcentaje entre 0 y 100.";
    if (entrega && f.transporte === "fijo" && soloNumero(f.fijo) <= 0) return "Escribe el valor fijo del transporte.";
    if (entrega && f.transporte === "variable" && soloNumero(f.km) <= 0)
      return "Escribe cuánto cobras por kilómetro de transporte.";
    if (f.tecnico.trim() && soloNumero(f.tarifaTecnico) <= 0) return "Escribe la tarifa por día del técnico.";
    if (!f.tecnico.trim() && soloNumero(f.tarifaTecnico) > 0) return "Escribe qué técnico ofreces (p. ej. Técnico RF).";
    return "";
  }

  async function alEnviar(ev: FormEvent) {
    ev.preventDefault();
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setOcupado(true);
    setError("");
    const z = ZONAS.find((x) => x.id === f.zona)!;
    const fijo = f.transporte === "fijo";
    const { data: c, error: e1 } = await supabase
      .from("companias")
      .insert({
        duenio: uid,
        nombre: f.nombre.trim(),
        ciudad: z.municipio,
        zona: z.nombre,
        direccion_bodega: f.direccion.trim(),
        horario_bodega: f.horario.trim() || null,
        lat: z.lat,
        lng: z.lng,
        cobertura_km: Number(f.cobertura),
        deposito_pct: Number(f.deposito),
        transporte_modo: entrega ? f.transporte : "fijo",
        transporte_fijo: entrega && fijo ? soloNumero(f.fijo) : 0,
        transporte_base: entrega && !fijo ? soloNumero(f.base) : 0,
        transporte_km: entrega && !fijo ? soloNumero(f.km) : 0,
        tecnico_nombre: f.tecnico.trim() || null,
        tecnico_tarifa_dia: f.tecnico.trim() ? soloNumero(f.tarifaTecnico) : null,
      })
      .select("id")
      .single();
    if (e1 || !c) {
      setOcupado(false);
      setError("No pudimos crear la compañía. Revisa los datos e intenta de nuevo.");
      return;
    }
    const { error: e2 } = await supabase.from("companias_privado").insert({
      compania_id: c.id,
      contacto: f.contacto.trim(),
      telefono: f.telefono.trim(),
      correo: f.correo.trim().toLowerCase(),
      nit: f.nit.trim() || null,
    });
    if (e2) {
      // Deshace el registro a medias para que se pueda volver a intentar.
      await supabase.from("companias").delete().eq("id", c.id);
      setOcupado(false);
      setError("No pudimos guardar los datos de contacto. Intenta de nuevo.");
      return;
    }
    router.push("/tengo/panel");
    router.refresh(); // el encabezado pasa a mostrar el nombre de la compañía
  }

  const ejemploKm = soloNumero(f.base) + soloNumero(f.km) * 12;

  return (
    <form className="form" onSubmit={alEnviar} noValidate>
      <section className="card">
        <h2>La compañía</h2>
        <div className="form-grid">
          <div className="field span2">
            <label htmlFor="rc-nombre">Nombre de la compañía</label>
            <input id="rc-nombre" autoComplete="organization" value={f.nombre} onChange={set("nombre")} />
          </div>
          <div className="field">
            <label htmlFor="rc-contacto">Persona de contacto</label>
            <input id="rc-contacto" autoComplete="name" value={f.contacto} onChange={set("contacto")} />
          </div>
          <div className="field">
            <label htmlFor="rc-tel">Teléfono o WhatsApp</label>
            <input id="rc-tel" type="tel" autoComplete="tel" placeholder="300 123 4567" value={f.telefono} onChange={set("telefono")} />
          </div>
          <div className="field">
            <label htmlFor="rc-correo">Correo de la compañía</label>
            <input id="rc-correo" type="email" autoComplete="email" value={f.correo} onChange={set("correo")} />
          </div>
          <div className="field">
            <label htmlFor="rc-nit">NIT (opcional)</label>
            <input id="rc-nit" inputMode="numeric" placeholder="900.123.456-7" value={f.nit} onChange={set("nit")} />
          </div>
        </div>
        <p className="fine">El teléfono, el correo y el NIT solo los ves tú y ENRENTA. Los clientes te escriben por el chat.</p>
      </section>

      <section className="card">
        <h2>La bodega</h2>
        <div className="form-grid">
          <div className="field span2">
            <label htmlFor="rc-dir">Dirección exacta</label>
            <input
              id="rc-dir"
              autoComplete="street-address"
              placeholder="Ej.: Cra. 50 # 10-20, bodega 3"
              value={f.direccion}
              onChange={set("direccion")}
            />
            <span className="hint">Se la mostramos al cliente que elige recoger los equipos.</span>
          </div>
          <div className="field">
            <label htmlFor="rc-zona">Zona</label>
            <select id="rc-zona" value={f.zona} onChange={set("zona")}>
              <option value="">Elige una zona</option>
              {ZONAS.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.nombre}
                  {z.municipio !== z.nombre && z.municipio !== "Medellín" ? ` · ${z.municipio}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="rc-horario">Horario de atención (opcional)</label>
            <input id="rc-horario" placeholder="Lun a sáb, 8:00 a 18:00" value={f.horario} onChange={set("horario")} />
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Entregas y garantía</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="rc-cob">Entregas</label>
            <select id="rc-cob" value={f.cobertura} onChange={set("cobertura")}>
              <option value="0">Solo retiro en bodega</option>
              <option value="15">Entrego hasta 15 km</option>
              <option value="30">Entrego hasta 30 km</option>
              <option value="45">Entrego hasta 45 km</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="rc-dep">Depósito reembolsable</label>
            <input id="rc-dep" type="number" inputMode="numeric" min={0} max={100} step={1} value={f.deposito} onChange={set("deposito")} />
            <span className="hint">% del valor de la renta. Se devuelve al cerrar la entrega sin novedades.</span>
          </div>

          {entrega && (
            <fieldset className="field span2">
              <legend>Cómo cobras el transporte</legend>
              <div className="seg">
                <label>
                  <input type="radio" name="transporte" value="variable" checked={f.transporte === "variable"} onChange={set("transporte")} />
                  Según la distancia
                </label>
                <label>
                  <input type="radio" name="transporte" value="fijo" checked={f.transporte === "fijo"} onChange={set("transporte")} />
                  Valor fijo
                </label>
              </div>
            </fieldset>
          )}
          {entrega && f.transporte === "fijo" && (
            <div className="field span2">
              <label htmlFor="rc-fijo">Valor del transporte (entrega y recogida)</label>
              <input id="rc-fijo" inputMode="numeric" placeholder="Ej.: 120.000" value={f.fijo} onChange={setMoneda("fijo")} />
            </div>
          )}
          {entrega && f.transporte === "variable" && (
            <>
              <div className="field">
                <label htmlFor="rc-base">Valor base (opcional)</label>
                <input id="rc-base" inputMode="numeric" placeholder="Ej.: 40.000" value={f.base} onChange={setMoneda("base")} />
              </div>
              <div className="field">
                <label htmlFor="rc-km">Valor por kilómetro</label>
                <input id="rc-km" inputMode="numeric" placeholder="Ej.: 3.500" value={f.km} onChange={setMoneda("km")} />
              </div>
              {soloNumero(f.km) > 0 && (
                <p className="fine span2">Ejemplo: un show a 12 km de tu bodega pagaría {pesos(ejemploKm)} de transporte.</p>
              )}
            </>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Técnico (opcional)</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="rc-tec">Qué técnico ofreces</label>
            <input id="rc-tec" placeholder="Ej.: Técnico RF" value={f.tecnico} onChange={set("tecnico")} />
          </div>
          <div className="field">
            <label htmlFor="rc-tarifa">Tarifa por día</label>
            <input id="rc-tarifa" inputMode="numeric" placeholder="Ej.: 350.000" value={f.tarifaTecnico} onChange={setMoneda("tarifaTecnico")} />
          </div>
        </div>
      </section>

      {error && <p className="form-err" role="alert">{error}</p>}
      <button type="submit" className="btn primary lg block" disabled={ocupado}>
        {ocupado ? "Creando tu compañía…" : "Crear mi compañía"}
      </button>
      <p className="fine">
        Después agregas tu inventario con fotos. Tu compañía aparece en el mapa cuando publiques tu primer equipo, y
        ENRENTA revisa los datos antes de mostrar el sello de verificada.
      </p>
    </form>
  );
}

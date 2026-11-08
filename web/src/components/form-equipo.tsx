"use client";
/* eslint-disable @next/next/no-img-element -- vistas previas locales (blob:) y fotos ya optimizadas en Storage */

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { CATEGORIAS_RF, ESTADOS, MAX_FOTOS, urlFoto, type Categoria, type EstadoEquipo } from "@/lib/catalogo";
import { pesos } from "@/lib/medellin";
import { prepararFoto } from "@/lib/fotos";
import { createClient } from "@/lib/supabase/client";

export type EquipoInicial = {
  id: string;
  categoria_id: string;
  nombre: string;
  incluye: string | null;
  unidades: number;
  precio_dia: number;
  dimensiones: string | null;
  peso_kg: number | null;
  estado: EstadoEquipo;
  banda_nombre: string | null;
  banda_min_mhz: number | null;
  banda_max_mhz: number | null;
  activo: boolean;
  fotos: { id: string; ruta: string; orden: number }[];
};

type Foto =
  | { tipo: "guardada"; id: string; ruta: string; orden: number }
  | { tipo: "nueva"; clave: string; blob: Blob; url: string };

type Props = {
  companiaId: string;
  depositoPct: number;
  categorias: Categoria[];
  equipo?: EquipoInicial;
};

const COMISION_COMPANIA = 0.1;
const conPuntos = (v: string) => {
  const n = v.replace(/\D/g, "");
  return n ? Number(n).toLocaleString("es-CO") : "";
};
const entero = (v: string) => Number(v.replace(/\D/g, "") || 0);
const decimal = (v: string) => (v.trim() === "" ? null : Number(v.replace(",", ".")));

export function FormEquipo({ companiaId, depositoPct, categorias, equipo }: Props) {
  const router = useRouter();
  const [supabase] = useState(createClient);
  const [f, setF] = useState({
    nombre: equipo?.nombre ?? "",
    categoria: equipo?.categoria_id ?? "",
    incluye: equipo?.incluye ?? "",
    unidades: String(equipo?.unidades ?? 1),
    precio: equipo ? Number(equipo.precio_dia).toLocaleString("es-CO") : "",
    dimensiones: equipo?.dimensiones ?? "",
    peso: equipo?.peso_kg != null ? String(equipo.peso_kg) : "",
    estado: (equipo?.estado ?? "excelente") as EstadoEquipo,
    banda: equipo?.banda_nombre ?? "",
    desde: equipo?.banda_min_mhz != null ? String(equipo.banda_min_mhz) : "",
    hasta: equipo?.banda_max_mhz != null ? String(equipo.banda_max_mhz) : "",
    activo: equipo?.activo ?? true,
  });
  const [fotos, setFotos] = useState<Foto[]>(
    () => equipo?.fotos.map((x) => ({ tipo: "guardada" as const, ...x })) ?? [],
  );
  const [quitadas, setQuitadas] = useState<{ id: string; ruta: string }[]>([]);
  const [preparando, setPreparando] = useState(false);
  const [error, setError] = useState("");
  const [estadoGuardado, setEstadoGuardado] = useState("");
  const [confirmarBorrar, setConfirmarBorrar] = useState(false);
  const ocupado = estadoGuardado !== "";

  // Libera las vistas previas locales al salir de la página.
  const urlsLocales = useRef<string[]>([]);
  useEffect(() => () => urlsLocales.current.forEach((u) => URL.revokeObjectURL(u)), []);

  const set =
    (k: keyof typeof f) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setF((p) => ({ ...p, [k]: e.target.value }));
  const esRF = CATEGORIAS_RF.has(f.categoria);
  const precio = entero(f.precio);

  async function alElegirFotos(e: ChangeEvent<HTMLInputElement>) {
    const elegidas = Array.from(e.target.files ?? []);
    e.target.value = "";
    const libres = MAX_FOTOS - fotos.length;
    if (!elegidas.length || libres <= 0) return;
    setPreparando(true);
    setError("");
    const listas: Foto[] = [];
    let fallidas = 0;
    for (const archivo of elegidas.slice(0, libres)) {
      try {
        const blob = await prepararFoto(archivo);
        const url = URL.createObjectURL(blob);
        urlsLocales.current.push(url);
        listas.push({ tipo: "nueva", clave: crypto.randomUUID(), blob, url });
      } catch {
        fallidas++;
      }
    }
    setFotos((p) => [...p, ...listas].slice(0, MAX_FOTOS));
    setPreparando(false);
    if (fallidas) setError(`No pudimos abrir ${fallidas === 1 ? "una foto" : `${fallidas} fotos`}. Usa JPG, PNG o WebP.`);
    else if (elegidas.length > libres) setError(`Puedes subir hasta ${MAX_FOTOS} fotos por equipo.`);
  }

  function quitarFoto(i: number) {
    const x = fotos[i];
    if (x.tipo === "guardada") setQuitadas((p) => [...p, { id: x.id, ruta: x.ruta }]);
    else URL.revokeObjectURL(x.url);
    setFotos((p) => p.filter((_, j) => j !== i));
  }

  function hacerPortada(i: number) {
    setFotos((p) => [p[i], ...p.filter((_, j) => j !== i)]);
  }

  function validar() {
    if (f.nombre.trim().length < 2) return "Escribe la marca y el modelo del equipo.";
    if (!f.categoria) return "Elige la categoría del equipo.";
    const u = Number(f.unidades);
    if (!Number.isInteger(u) || u < 1 || u > 9999) return "Las unidades deben ser un número entero entre 1 y 9.999.";
    if (precio < 1000) return "Escribe el precio por 24 horas (mínimo $1.000).";
    const peso = decimal(f.peso);
    if (peso !== null && (!Number.isFinite(peso) || peso < 0 || peso > 99999)) return "Revisa el peso: escribe solo el número en kg.";
    if (esRF && (f.desde || f.hasta)) {
      const lo = decimal(f.desde);
      const hi = decimal(f.hasta);
      if (lo === null || hi === null || !Number.isFinite(lo) || !Number.isFinite(hi))
        return "Para la banda RF escribe desde y hasta en MHz, o deja ambos vacíos.";
      if (lo <= 0 || hi > 9999 || lo >= hi) return "Revisa la banda RF: “desde” debe ser menor que “hasta” (en MHz).";
    }
    return "";
  }

  async function alGuardar(ev: FormEvent) {
    ev.preventDefault();
    const problema = validar();
    if (problema) {
      setError(problema);
      return;
    }
    setError("");
    setEstadoGuardado("Guardando el equipo…");
    const id = equipo?.id ?? crypto.randomUUID();
    const rf = esRF && f.desde && f.hasta;
    const fila = {
      categoria_id: f.categoria,
      nombre: f.nombre.trim().replace(/\s+/g, " "),
      incluye: f.incluye.trim() || null,
      unidades: Number(f.unidades),
      precio_dia: precio,
      dimensiones: f.dimensiones.trim() || null,
      peso_kg: decimal(f.peso),
      estado: f.estado,
      banda_nombre: esRF ? f.banda.trim() || null : null,
      banda_min_mhz: rf ? decimal(f.desde) : null,
      banda_max_mhz: rf ? decimal(f.hasta) : null,
      activo: f.activo,
    };

    try {
      const { error: e1 } = equipo
        ? await supabase.from("equipos").update(fila).eq("id", id)
        : await supabase.from("equipos").insert({ id, compania_id: companiaId, ...fila });
      if (e1) throw new Error("equipo");

      if (quitadas.length) {
        setEstadoGuardado("Quitando fotos…");
        await supabase.storage.from("equipos").remove(quitadas.map((q) => q.ruta));
        await supabase.from("equipo_fotos").delete().in("id", quitadas.map((q) => q.id));
      }

      const nuevas = fotos.filter((x) => x.tipo === "nueva").length;
      if (nuevas) setEstadoGuardado(`Subiendo ${nuevas === 1 ? "1 foto" : `${nuevas} fotos`}…`);
      const resultados = await Promise.all(
        fotos.map(async (x, orden) => {
          if (x.tipo === "guardada") {
            if (x.orden !== orden) await supabase.from("equipo_fotos").update({ orden }).eq("id", x.id);
            return null;
          }
          const ruta = `${companiaId}/${id}/${crypto.randomUUID()}.jpg`;
          const { error: e2 } = await supabase.storage
            .from("equipos")
            .upload(ruta, x.blob, { contentType: "image/jpeg", cacheControl: "31536000", upsert: false });
          if (e2) throw new Error("foto");
          return { equipo_id: id, ruta, orden };
        }),
      );
      const filasFotos = resultados.filter((r) => r !== null);
      if (filasFotos.length) {
        const { error: e3 } = await supabase.from("equipo_fotos").insert(filasFotos);
        if (e3) throw new Error("foto");
      }
    } catch (e) {
      setEstadoGuardado("");
      setError(
        e instanceof Error && e.message === "foto"
          ? "El equipo se guardó, pero algunas fotos no subieron. Ábrelo de nuevo desde tu inventario y vuelve a agregarlas."
          : "No pudimos guardar el equipo. Revisa tu conexión e intenta de nuevo.",
      );
      return;
    }
    router.push("/tengo/inventario");
    router.refresh();
  }

  async function alBorrar() {
    if (!equipo) return;
    setEstadoGuardado("Eliminando…");
    const rutas = [...equipo.fotos.map((x) => x.ruta)];
    if (rutas.length) await supabase.storage.from("equipos").remove(rutas);
    const { error: e } = await supabase.from("equipos").delete().eq("id", equipo.id);
    if (e) {
      setEstadoGuardado("");
      setConfirmarBorrar(false);
      setError("No pudimos eliminar el equipo. Si ya tiene reservas, mejor páusalo.");
      return;
    }
    router.push("/tengo/inventario");
    router.refresh();
  }

  return (
    <form className="form" onSubmit={alGuardar} noValidate>
      <section className="card">
        <h2>El equipo</h2>
        <div className="form-grid">
          <div className="field span2">
            <label htmlFor="eq-nombre">Marca y modelo</label>
            <input id="eq-nombre" placeholder="Ej.: Shure ULX-D · ULXD2 con SM58" value={f.nombre} onChange={set("nombre")} />
          </div>
          <div className="field">
            <label htmlFor="eq-cat">Categoría</label>
            <select id="eq-cat" value={f.categoria} onChange={set("categoria")}>
              <option value="">Elige una categoría</option>
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="eq-estado">Estado</label>
            <select id="eq-estado" value={f.estado} onChange={set("estado")}>
              {ESTADOS.map((x) => (
                <option key={x.id} value={x.id}>{x.nombre}</option>
              ))}
            </select>
          </div>
          <div className="field span2">
            <label htmlFor="eq-incluye">Qué incluye cada unidad</label>
            <textarea
              id="eq-incluye"
              rows={2}
              placeholder="Ej.: receptor + transmisor de mano, baterías recargables y cargador"
              value={f.incluye}
              onChange={set("incluye")}
            />
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Unidades y precio</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="eq-unidades">Unidades disponibles</label>
            <input id="eq-unidades" type="number" inputMode="numeric" min={1} step={1} value={f.unidades} onChange={set("unidades")} />
          </div>
          <div className="field">
            <label htmlFor="eq-precio">Precio por unidad cada 24 h</label>
            <input
              id="eq-precio"
              inputMode="numeric"
              placeholder="Ej.: 150.000"
              value={f.precio}
              onChange={(e) => setF((p) => ({ ...p, precio: conPuntos(e.target.value) }))}
            />
          </div>
          {precio > 0 && (
            <p className="fine span2">
              Recibes {pesos(Math.round(precio * (1 - COMISION_COMPANIA)))} por unidad cada 24 h, después de la comisión
              de ENRENTA (10 %). El cliente deja un depósito reembolsable del {depositoPct} % del valor de la renta.
            </p>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Fotos reales</h2>
        <p className="muted">
          El cliente las ve al agregar el equipo a su pedido: el equipo, su estuche y sus accesorios. La primera es la
          portada. Hasta {MAX_FOTOS}.
        </p>
        <div className="fotos">
          {fotos.map((x, i) => (
            <div key={x.tipo === "guardada" ? x.id : x.clave} className="foto">
              <img src={x.tipo === "guardada" ? urlFoto(x.ruta) : x.url} alt={`Foto ${i + 1} del equipo`} />
              <button type="button" className="quitar" onClick={() => quitarFoto(i)} aria-label={`Quitar la foto ${i + 1}`} disabled={ocupado}>
                ×
              </button>
              {i === 0 ? (
                <span className="portada">Portada</span>
              ) : (
                <button
                  type="button"
                  className="portada link-btn"
                  onClick={() => hacerPortada(i)}
                  disabled={ocupado}
                  aria-label={`Usar la foto ${i + 1} como portada`}
                >
                  ↑ Portada
                </button>
              )}
            </div>
          ))}
          {fotos.length < MAX_FOTOS && (
            <label className="foto-add">
              <span aria-hidden="true">+</span>
              {preparando ? "Preparando…" : "Agregar fotos"}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={alElegirFotos}
                disabled={preparando || ocupado}
              />
            </label>
          )}
        </div>
      </section>

      <section className="card">
        <h2>Medidas</h2>
        <div className="form-grid">
          <div className="field">
            <label htmlFor="eq-dim">Dimensiones del estuche (opcional)</label>
            <input id="eq-dim" placeholder="Ej.: 50 × 35 × 20 cm" value={f.dimensiones} onChange={set("dimensiones")} />
          </div>
          <div className="field">
            <label htmlFor="eq-peso">Peso por unidad en kg (opcional)</label>
            <input id="eq-peso" inputMode="decimal" placeholder="Ej.: 4,5" value={f.peso} onChange={set("peso")} />
          </div>
        </div>
      </section>

      {esRF && (
        <section className="card">
          <h2>Banda RF (opcional)</h2>
          <p className="muted">Ayuda a los técnicos a saber si el equipo sirve en el rango de frecuencias del show.</p>
          <div className="form-grid">
            <div className="field span2">
              <label htmlFor="eq-banda">Nombre de la banda</label>
              <input id="eq-banda" placeholder="Ej.: G50" value={f.banda} onChange={set("banda")} />
            </div>
            <div className="field">
              <label htmlFor="eq-desde">Desde (MHz)</label>
              <input id="eq-desde" inputMode="decimal" placeholder="Ej.: 470" value={f.desde} onChange={set("desde")} />
            </div>
            <div className="field">
              <label htmlFor="eq-hasta">Hasta (MHz)</label>
              <input id="eq-hasta" inputMode="decimal" placeholder="Ej.: 534" value={f.hasta} onChange={set("hasta")} />
            </div>
          </div>
        </section>
      )}

      <section className="card">
        <label className="switch">
          <input type="checkbox" checked={f.activo} onChange={(e) => setF((p) => ({ ...p, activo: e.target.checked }))} />
          Publicado en el mapa y las búsquedas
        </label>
        <p className="fine">Si lo desmarcas, el equipo queda en pausa: no aparece para los clientes, pero no lo pierdes.</p>
      </section>

      {error && <p className="form-err" role="alert">{error}</p>}
      <div className="row-actions">
        <button type="submit" className="btn primary lg" disabled={ocupado || preparando}>
          {estadoGuardado || (equipo ? "Guardar cambios" : "Publicar equipo")}
        </button>
        <Link href="/tengo/inventario" className="link-btn">Cancelar</Link>
      </div>

      {equipo && (
        <section className="card">
          <h2>Eliminar equipo</h2>
          <p className="muted">Se borran el equipo y sus fotos. Si solo quieres dejar de ofrecerlo un tiempo, mejor quítalo de “Publicado”.</p>
          <div className="danger-zone">
            {confirmarBorrar ? (
              <>
                <button type="button" className="btn danger solid" onClick={alBorrar} disabled={ocupado}>
                  Sí, eliminar para siempre
                </button>
                <button type="button" className="link-btn" onClick={() => setConfirmarBorrar(false)} disabled={ocupado}>
                  No, conservarlo
                </button>
              </>
            ) : (
              <button type="button" className="btn danger" onClick={() => setConfirmarBorrar(true)} disabled={ocupado}>
                Eliminar equipo
              </button>
            )}
          </div>
        </section>
      )}
    </form>
  );
}

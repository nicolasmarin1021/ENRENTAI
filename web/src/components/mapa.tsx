"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { GeoJSONSource, Map as MapaML, Marker } from "maplibre-gl";
import { useEffect, useRef, useState } from "react";
import { ESTILO_MAPA, LIMITES, MEDELLIN, type Punto } from "@/lib/geo";

export type Marcador = Punto & {
  id: string;
  texto: string;
  titulo?: string; // texto accesible del botón
  tipo?: "compania" | "lugar";
  nivel?: "alto" | "medio" | "nada";
  activo?: boolean;
};

type Margenes = { top: number; bottom: number; left: number; right: number };

type Props = {
  etiqueta: string;
  marcadores?: Marcador[];
  onMarcador?: (id: string) => void;
  pin?: Punto | null; // pin arrastrable (bodega o lugar del show)
  onPin?: (p: Punto) => void;
  pinConClic?: boolean; // tocar el mapa mueve el pin
  enfoque?: (Punto & { zoom?: number }) | null; // vuela a este punto cuando cambia
  encuadrar?: boolean; // ajusta la vista a los marcadores la primera vez
  margenes?: Margenes; // espacio que tapan los paneles flotantes
  anillos?: { centro: Punto; km: number[] } | null; // círculos de distancia alrededor del show
  ruta?: { desde: Punto; hasta: Punto; texto: string } | null; // línea de la bodega al show
  zoom?: number;
  className?: string;
};

// Polígono aproximado de un círculo de `km` alrededor de un punto (para los anillos).
function circulo(c: Punto, km: number, pasos = 72): [number, number][] {
  const lat = (km / 6371) * (180 / Math.PI);
  const lng = lat / Math.cos((c.lat * Math.PI) / 180);
  return Array.from({ length: pasos + 1 }, (_, i) => {
    const t = (i / pasos) * 2 * Math.PI;
    return [c.lng + lng * Math.cos(t), c.lat + lat * Math.sin(t)];
  });
}

const VACIO = { type: "FeatureCollection" as const, features: [] };

// Mapa real (MapLibre + OpenStreetMap). Solo corre en el navegador.
export function Mapa({
  etiqueta,
  marcadores = [],
  onMarcador,
  pin = null,
  onPin,
  pinConClic = false,
  enfoque = null,
  encuadrar = false,
  margenes = { top: 40, bottom: 40, left: 40, right: 40 },
  anillos = null,
  ruta = null,
  zoom = 12,
  className = "",
}: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaML | null>(null);
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
  const marcas = useRef<Marker[]>([]);
  const etiquetas = useRef<Marker[]>([]);
  const marcaPin = useRef<Marker | null>(null);
  const yaEncuadro = useRef(false);
  const avisos = useRef({ onMarcador, onPin, pinConClic, margenes });
  const [listo, setListo] = useState(false);
  const [falla, setFalla] = useState(false);

  useEffect(() => {
    avisos.current = { onMarcador, onPin, pinConClic, margenes };
  });

  // Crea el mapa una sola vez.
  useEffect(() => {
    let cancelado = false;
    (async () => {
      try {
        const lib = await import("maplibre-gl");
        if (cancelado || !caja.current) return;
        // El worker se sirve desde public/maplibre/ (lo copia scripts/worker-mapa.mjs).
        lib.setWorkerUrl(`/maplibre/maplibre-gl-worker-${lib.getVersion()}.js`);
        ml.current = lib;
        const m = new lib.Map({
          container: caja.current,
          style: ESTILO_MAPA,
          center: [MEDELLIN.lng, MEDELLIN.lat],
          zoom,
          maxBounds: LIMITES,
          attributionControl: { compact: true },
          dragRotate: false,
          pitchWithRotate: false,
        });
        m.touchZoomRotate.disableRotation();
        m.addControl(new lib.NavigationControl({ showCompass: false }), "top-right");
        m.on("click", (e) => {
          if (avisos.current.pinConClic) avisos.current.onPin?.({ lat: e.lngLat.lat, lng: e.lngLat.lng });
        });
        m.on("error", () => {
          if (!m.loaded()) setFalla(true);
        });
        m.once("load", () => {
          if (cancelado) return;
          // Capas para los anillos de distancia y la ruta (se llenan después).
          m.addSource("anillos", { type: "geojson", data: VACIO });
          m.addLayer({
            id: "anillos",
            type: "line",
            source: "anillos",
            paint: { "line-color": "#3B5BDB", "line-width": 1.4, "line-opacity": 0.55, "line-dasharray": [2, 2.5] },
          });
          m.addSource("ruta", { type: "geojson", data: VACIO });
          m.addLayer({
            id: "ruta",
            type: "line",
            source: "ruta",
            layout: { "line-cap": "round" },
            paint: { "line-color": "#3B5BDB", "line-width": 3, "line-dasharray": [1.2, 1.6] },
          });
          setListo(true);
        });
        mapa.current = m;
      } catch {
        setFalla(true);
      }
    })();
    return () => {
      cancelado = true;
      mapa.current?.remove();
      mapa.current = null;
    };
    // El zoom inicial solo importa al crear el mapa.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Marcadores (compañías o lugares). Se dibujan con textContent: nunca HTML de los usuarios.
  useEffect(() => {
    const m = mapa.current;
    const lib = ml.current;
    if (!listo || !m || !lib) return;
    marcas.current.forEach((x) => x.remove());
    marcas.current = marcadores.map((mk) => {
      const el = document.createElement("button");
      el.type = "button";
      el.setAttribute("aria-label", mk.titulo ?? mk.texto);
      if (mk.tipo === "lugar") {
        el.className = "mk-lugar";
        el.appendChild(document.createElement("span")).className = "rombo";
        el.appendChild(document.createElement("span")).textContent = mk.texto;
      } else {
        el.className = ["mk", mk.nivel ?? "", mk.activo ? "activo" : ""].join(" ").trim();
        el.textContent = mk.texto;
      }
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        avisos.current.onMarcador?.(mk.id);
      });
      return new lib.Marker({ element: el, anchor: mk.tipo === "lugar" ? "top" : "center" })
        .setLngLat([mk.lng, mk.lat])
        .addTo(m);
    });
    if (encuadrar && !yaEncuadro.current && marcadores.length) {
      yaEncuadro.current = true;
      const b = new lib.LngLatBounds();
      marcadores.forEach((mk) => b.extend([mk.lng, mk.lat]));
      if (marcadores.length > 1) m.fitBounds(b, { padding: avisos.current.margenes, maxZoom: 14, duration: 0 });
      else m.jumpTo({ center: [marcadores[0].lng, marcadores[0].lat], zoom: 13 });
    }
  }, [listo, marcadores, encuadrar]);

  // Anillos de 2, 5 y 10 km alrededor del show, con su etiqueta arriba.
  const anLat = anillos?.centro.lat;
  const anLng = anillos?.centro.lng;
  const anKm = anillos?.km.join(",");
  useEffect(() => {
    const m = mapa.current;
    const lib = ml.current;
    if (!listo || !m || !lib) return;
    etiquetas.current.forEach((x) => x.remove());
    etiquetas.current = [];
    const fuente = m.getSource("anillos") as GeoJSONSource | undefined;
    if (anLat === undefined || anLng === undefined || !anKm) {
      fuente?.setData(VACIO);
      return;
    }
    const centro = { lat: anLat, lng: anLng };
    const kms = anKm.split(",").map(Number);
    fuente?.setData({
      type: "FeatureCollection",
      features: kms.map((km) => ({
        type: "Feature",
        properties: { km },
        geometry: { type: "LineString", coordinates: circulo(centro, km) },
      })),
    });
    etiquetas.current = kms.map((km) => {
      const el = document.createElement("span");
      el.className = "mk-anillo";
      el.textContent = `${km} km`;
      const norte = circulo(centro, km, 4)[1]; // punto del norte
      return new lib.Marker({ element: el, anchor: "bottom" }).setLngLat(norte).addTo(m);
    });
  }, [listo, anLat, anLng, anKm]);

  // Ruta de la bodega elegida al show.
  const rutaClave = ruta ? `${ruta.desde.lat},${ruta.desde.lng},${ruta.hasta.lat},${ruta.hasta.lng},${ruta.texto}` : "";
  const etiquetaRuta = useRef<Marker | null>(null);
  useEffect(() => {
    const m = mapa.current;
    const lib = ml.current;
    if (!listo || !m || !lib) return;
    etiquetaRuta.current?.remove();
    etiquetaRuta.current = null;
    const fuente = m.getSource("ruta") as GeoJSONSource | undefined;
    if (!rutaClave) {
      fuente?.setData(VACIO);
      return;
    }
    const [a, b, c, d, ...texto] = rutaClave.split(",");
    const desde: [number, number] = [Number(b), Number(a)];
    const hasta: [number, number] = [Number(d), Number(c)];
    fuente?.setData({
      type: "FeatureCollection",
      features: [{ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [desde, hasta] } }],
    });
    const el = document.createElement("span");
    el.className = "mk-ruta";
    el.textContent = texto.join(",");
    etiquetaRuta.current = new lib.Marker({ element: el })
      .setLngLat([(desde[0] + hasta[0]) / 2, (desde[1] + hasta[1]) / 2])
      .addTo(m);
  }, [listo, rutaClave]);

  // Pin arrastrable.
  const pinLat = pin?.lat;
  const pinLng = pin?.lng;
  useEffect(() => {
    const m = mapa.current;
    const lib = ml.current;
    if (!listo || !m || !lib) return;
    if (pinLat === undefined || pinLng === undefined) {
      marcaPin.current?.remove();
      marcaPin.current = null;
      return;
    }
    if (!marcaPin.current) {
      // La caja la mueve MapLibre; la gota rotada va adentro.
      const el = document.createElement("div");
      el.className = "mk-pin-caja";
      el.setAttribute("aria-hidden", "true");
      el.appendChild(document.createElement("span")).className = "mk-pin";
      const p = new lib.Marker({ element: el, anchor: "bottom", draggable: true }).setLngLat([pinLng, pinLat]).addTo(m);
      p.on("dragend", () => {
        const ll = p.getLngLat();
        avisos.current.onPin?.({ lat: ll.lat, lng: ll.lng });
      });
      marcaPin.current = p;
      m.jumpTo({ center: [pinLng, pinLat], zoom: Math.max(m.getZoom(), 15) });
    } else {
      marcaPin.current.setLngLat([pinLng, pinLat]);
    }
  }, [listo, pinLat, pinLng]);

  // Volar a un punto, dejándolo en el centro del espacio que no tapan los paneles.
  const enfLat = enfoque?.lat;
  const enfLng = enfoque?.lng;
  const enfZoom = enfoque?.zoom;
  useEffect(() => {
    const m = mapa.current;
    if (!listo || !m || enfLat === undefined || enfLng === undefined) return;
    m.flyTo({
      center: [enfLng, enfLat],
      zoom: enfZoom ?? Math.max(m.getZoom(), 13),
      padding: avisos.current.margenes,
      duration: 700,
    });
  }, [listo, enfLat, enfLng, enfZoom]);

  return (
    <div className={`mapa ${className}`} role="region" aria-label={etiqueta}>
      <div ref={caja} className="mapa-lienzo" />
      {!listo && !falla && <p className="mapa-aviso">Cargando el mapa de Medellín…</p>}
      {falla && <p className="mapa-aviso">No pudimos cargar el mapa. Revisa tu conexión y recarga la página.</p>}
    </div>
  );
}

"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { Map as MapaML, Marker } from "maplibre-gl";
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

type Props = {
  etiqueta: string;
  marcadores?: Marcador[];
  onMarcador?: (id: string) => void;
  pin?: Punto | null; // pin arrastrable (bodega o lugar del show)
  onPin?: (p: Punto) => void;
  pinConClic?: boolean; // tocar el mapa mueve el pin
  enfoque?: (Punto & { zoom?: number }) | null; // vuela a este punto cuando cambia
  encuadrar?: boolean; // ajusta la vista a los marcadores la primera vez
  zoom?: number;
  className?: string;
};

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
  zoom = 12,
  className = "",
}: Props) {
  const caja = useRef<HTMLDivElement>(null);
  const mapa = useRef<MapaML | null>(null);
  const ml = useRef<typeof import("maplibre-gl") | null>(null);
  const marcas = useRef<Marker[]>([]);
  const marcaPin = useRef<Marker | null>(null);
  const yaEncuadro = useRef(false);
  const avisos = useRef({ onMarcador, onPin, pinConClic });
  const [listo, setListo] = useState(false);
  const [falla, setFalla] = useState(false);

  useEffect(() => {
    avisos.current = { onMarcador, onPin, pinConClic };
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
        m.once("load", () => !cancelado && setListo(true));
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
      el.className = ["mk", mk.tipo ?? "compania", mk.nivel ?? "", mk.activo ? "activo" : ""].join(" ").trim();
      el.textContent = mk.texto;
      el.setAttribute("aria-label", mk.titulo ?? mk.texto);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        avisos.current.onMarcador?.(mk.id);
      });
      return new lib.Marker({ element: el, anchor: "bottom" }).setLngLat([mk.lng, mk.lat]).addTo(m);
    });
    if (encuadrar && !yaEncuadro.current && marcadores.length) {
      yaEncuadro.current = true;
      const b = new lib.LngLatBounds();
      marcadores.forEach((mk) => b.extend([mk.lng, mk.lat]));
      if (marcadores.length > 1) m.fitBounds(b, { padding: 70, maxZoom: 14, duration: 0 });
      else m.jumpTo({ center: [marcadores[0].lng, marcadores[0].lat], zoom: 13 });
    }
  }, [listo, marcadores, encuadrar]);

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

  // Volar a un punto.
  const enfLat = enfoque?.lat;
  const enfLng = enfoque?.lng;
  const enfZoom = enfoque?.zoom;
  useEffect(() => {
    const m = mapa.current;
    if (!listo || !m || enfLat === undefined || enfLng === undefined) return;
    m.flyTo({ center: [enfLng, enfLat], zoom: enfZoom ?? Math.max(m.getZoom(), 13), duration: 700 });
  }, [listo, enfLat, enfLng, enfZoom]);

  return (
    <div className={`mapa ${className}`} role="region" aria-label={etiqueta}>
      <div ref={caja} className="mapa-lienzo" />
      {!listo && !falla && <p className="mapa-aviso">Cargando el mapa de Medellín…</p>}
      {falla && <p className="mapa-aviso">No pudimos cargar el mapa. Revisa tu conexión y recarga la página.</p>}
    </div>
  );
}

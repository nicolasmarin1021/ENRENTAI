// La página del mapa (MapLibre + mapa abierto de OpenStreetMap servido por OpenFreeMap, gratis y sin
// claves), que mapa.tsx muestra dentro de una vista web. Habla con la app por mensajes:
//  - la app le manda { t: "estado" | "encuadrar" | "volar" } con window.enrenta.recibir(...)
//  - la página avisa { t: "listo" | "marcador" | "fondo" | "pin" } con ReactNativeWebView.postMessage.
// __INICIO__ se reemplaza por { lat, lng, zoom }.

export const HTML_MAPA = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
<link rel="stylesheet" href="https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.css">
<script src="https://unpkg.com/maplibre-gl@5.6.0/dist/maplibre-gl.js"></script>
<style>
  html, body, #mapa { margin: 0; padding: 0; width: 100%; height: 100%; background: #EEF0F3; overflow: hidden; }
  * { -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
  .maplibregl-ctrl-attrib { font-size: 9px; }
  .pildora { white-space: nowrap; padding: 0 11px; height: 32px; line-height: 32px; border-radius: 16px; background: #FFFFFF;
    border: 1px solid rgba(16,24,40,.08); box-shadow: 0 3px 8px rgba(16,24,40,.22); font-weight: 700; font-size: 13.5px; color: #1E2230;
    cursor: pointer; }
  .pildora.sel { background: #1E2230; border-color: #1E2230; color: #FFFFFF; transform: scale(1.08); }
  .pildora.apagada { background: #F1F2F5; color: #5A6072; }
  .punto { width: 16px; height: 16px; border-radius: 8px; background: #FFFFFF; border: 4px solid #1E2230; box-sizing: border-box;
    box-shadow: 0 1px 4px rgba(16,24,40,.25); cursor: pointer; }
  .show { width: 26px; height: 26px; border-radius: 13px; background: rgba(59,91,219,.22); display: flex; align-items: center; justify-content: center; pointer-events: none; }
  .show i { width: 14px; height: 14px; border-radius: 7px; background: #3B5BDB; border: 2.5px solid #FFFFFF; box-sizing: border-box; display: block; }
  .aviso { font: 14px sans-serif; color: #5A6072; padding: 16px; }
</style>
</head><body>
<div id="mapa"></div>
<script>
(function () {
  var inicio = __INICIO__;
  var avisar = function (m) { if (window.ReactNativeWebView) window.ReactNativeWebView.postMessage(JSON.stringify(m)); };
  if (!window.maplibregl) { document.body.innerHTML = '<p class="aviso">No se pudo cargar el mapa. Revisa tu conexión.</p>'; avisar({ t: "listo" }); return; }

  var mapa = new maplibregl.Map({
    container: "mapa",
    style: "https://tiles.openfreemap.org/styles/positron",
    center: [inicio.lng, inicio.lat],
    zoom: inicio.zoom,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false
  });
  mapa.touchZoomRotate.disableRotation();

  var estado = { marcadores: [], activo: null, lugar: null, pin: null, editable: false, margen: { top: 40, right: 40, bottom: 40, left: 40 } };
  var puestos = [];
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); };
  var elemento = function (html) { var d = document.createElement("div"); d.innerHTML = html; return d.firstChild; };
  var PIN = '<svg width="34" height="44" viewBox="0 0 34 44"><path d="M17 43s14-15.2 14-26A14 14 0 0 0 3 17c0 10.8 14 26 14 26z" fill="#3B5BDB" stroke="#FFFFFF" stroke-width="2.5"/><circle cx="17" cy="17" r="5.5" fill="#FFFFFF"/></svg>';

  function poner(el, lng, lat, opciones) {
    var mk = new maplibregl.Marker(Object.assign({ element: el }, opciones || {})).setLngLat([lng, lat]).addTo(mapa);
    puestos.push(mk);
    return mk;
  }

  function dibujar() {
    puestos.forEach(function (m) { m.remove(); });
    puestos = [];
    if (estado.lugar) poner(elemento('<div class="show"><i></i></div>'), estado.lugar.lng, estado.lugar.lat).getElement().style.zIndex = 1;
    // Primero los apagados, luego los normales y al final el elegido (queda encima).
    var orden = (estado.marcadores || []).slice().sort(function (a, b) {
      var p = function (m) { return m.id === estado.activo ? 2 : m.nivel === "nada" ? 0 : 1; };
      return p(a) - p(b);
    });
    orden.forEach(function (m, i) {
      var sel = m.id === estado.activo;
      var apagado = m.nivel === "nada";
      var el = m.forma === "punto" && !sel
        ? elemento('<div class="punto"></div>')
        : elemento('<div class="pildora' + (sel ? " sel" : apagado ? " apagada" : "") + '">' + esc(m.texto) + "</div>");
      el.addEventListener("click", function (e) { e.stopPropagation(); avisar({ t: "marcador", id: m.id }); });
      var mk = poner(el, m.lng, m.lat);
      mk.getElement().style.zIndex = 2 + i;
    });
    if (estado.pin) {
      var p = poner(elemento('<div>' + PIN + '</div>'), estado.pin.lng, estado.pin.lat, { draggable: true, anchor: "bottom" });
      p.getElement().style.zIndex = 9999;
      p.on("dragend", function () { var ll = p.getLngLat(); avisar({ t: "pin", lat: ll.lat, lng: ll.lng }); });
    }
  }

  function puntos() {
    var ps = (estado.marcadores || []).map(function (m) { return [m.lng, m.lat]; });
    if (estado.lugar) ps.push([estado.lugar.lng, estado.lugar.lat]);
    return ps;
  }

  function encuadrar(animado) {
    var ps = puntos();
    var g = estado.margen || { top: 40, right: 40, bottom: 40, left: 40 };
    if (ps.length > 1) {
      var b = new maplibregl.LngLatBounds(ps[0], ps[0]);
      ps.forEach(function (p) { b.extend(p); });
      // Más espacio a los lados: las píldoras son más anchas que el punto que marcan.
      var pad = { top: g.top + 20, bottom: g.bottom + 20, left: g.left + 50, right: g.right + 50 };
      mapa.fitBounds(b, { padding: pad, animate: animado, duration: animado ? 350 : 0, maxZoom: 15.5 });
    } else if (ps.length === 1) {
      mapa.easeTo({ center: ps[0], zoom: 14, duration: animado ? 350 : 0 });
    }
  }

  mapa.on("click", function (e) {
    if (estado.editable) {
      estado.pin = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      dibujar();
      avisar({ t: "pin", lat: e.lngLat.lat, lng: e.lngLat.lng });
    } else {
      avisar({ t: "fondo" });
    }
  });

  window.enrenta = {
    recibir: function (m) {
      if (m.t === "estado") { estado = m; dibujar(); }
      else if (m.t === "encuadrar") encuadrar(!!m.animado);
      else if (m.t === "volar") mapa.easeTo({ center: [m.lng, m.lat], duration: 350 });
    }
  };
  avisar({ t: "listo" });
})();
</script>
</body></html>`;

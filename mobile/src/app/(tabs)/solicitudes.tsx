import { router, useFocusEffect } from "expo-router";
import { Fragment, useCallback, useState } from "react";
import { AccesoMensajes } from "@/componentes/acceso-mensajes";
import { TarjetaSolicitud, type MiResena } from "@/componentes/tarjeta-solicitud";
import { tituloDiaCO } from "@/lib/formato";
import { esActiva, RENTADA, SELECT_RESERVA, type ReservaFila } from "@/lib/reservas";
import { useSesion } from "@/lib/sesion";
import { supabase } from "@/lib/supabase";
import { Aviso, Boton, Cargando, Encabezado, Pantalla, Segmentos, Tarjeta, Texto } from "@/ui/base";

// Mis solicitudes: las cotizaciones que el cliente pidió por WhatsApp.
export default function Solicitudes() {
  const { usuario, nombre, listo } = useSesion();
  const [filas, setFilas] = useState<ReservaFila[]>([]);
  const [resenas, setResenas] = useState<Map<string, MiResena>>(new Map());
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState("");
  const [ver, setVer] = useState<"activas" | "historial">("activas");
  const [ahora, setAhora] = useState(() => Date.now());

  // silencioso: al volver a la pestaña se actualiza sin mostrar la ruedita de recarga.
  const cargar = useCallback(async (silencioso = false) => {
    if (!usuario) {
      setCargando(false);
      return;
    }
    if (!silencioso) setCargando(true);
    const { data, error: e } = await supabase.from("reservas").select(SELECT_RESERVA).eq("cliente", usuario.id).order("entrega");
    if (e) {
      setError("No pudimos cargar tus solicitudes. Desliza hacia abajo para intentar de nuevo.");
      setCargando(false);
      return;
    }
    const todas = (data ?? []) as unknown as ReservaFila[];
    const rentadas = todas.filter((r) => RENTADA.includes(r.estado)).map((r) => r.id);
    const { data: rs } = rentadas.length
      ? await supabase.from("resenas").select("reserva_id, estrellas, comentario").in("reserva_id", rentadas)
      : { data: [] };
    setResenas(new Map(((rs ?? []) as ({ reserva_id: string } & MiResena)[]).map((x) => [x.reserva_id, x])));
    setFilas(todas);
    setError("");
    setAhora(Date.now());
    setCargando(false);
  }, [usuario]);

  // Se recarga cada vez que la persona entra a esta pestaña.
  useFocusEffect(
    useCallback(() => {
      void cargar(true);
    }, [cargar]),
  );

  if (listo && !usuario) {
    return (
      <Pantalla>
        <Encabezado titulo="Mis solicitudes" />
        <Tarjeta>
          <Texto>Entra o crea tu cuenta para ver las cotizaciones que pediste por WhatsApp.</Texto>
          <Boton titulo="Entrar" onPress={() => router.push("/entrar")} />
        </Tarjeta>
      </Pantalla>
    );
  }

  // Por el día en que se hizo la solicitud: la más reciente primero (Hoy, Ayer, fechas anteriores…).
  const masReciente = (a: ReservaFila, b: ReservaFila) => b.creado.localeCompare(a.creado);
  const activas = filas.filter((r) => esActiva(r, ahora)).sort(masReciente);
  const pasadas = filas.filter((r) => !esActiva(r, ahora)).sort(masReciente);
  const lista = ver === "activas" ? activas : pasadas;
  const sinCalificar = pasadas.some((r) => RENTADA.includes(r.estado) && !resenas.has(r.id));

  return (
    <Pantalla refrescando={cargando && filas.length > 0} onRefrescar={cargar}>
      <Encabezado
        titulo="Mis solicitudes"
        sub={`Las cotizaciones que pediste por WhatsApp${nombre ? `, ${nombre}` : ""}. Cuando la compañía marca una como rentada, el equipo queda apartado para ti.`}
      />
      <AccesoMensajes lado="cliente" />
      {sinCalificar && ver === "activas" ? (
        <Aviso tono="acento" texto="Tienes rentas que ya terminaron sin calificar. Califica a la compañía para ayudar a otros clientes.">
          <Boton titulo="Ver historial" chico tipo="secundario" onPress={() => setVer("historial")} />
        </Aviso>
      ) : null}
      <Segmentos
        opciones={[
          { id: "activas", texto: `Activas · ${activas.length}` },
          { id: "historial", texto: `Historial · ${pasadas.length}` },
        ]}
        valor={ver}
        onCambio={setVer}
      />
      {error ? <Aviso tono="mal" texto={error} /> : null}
      {cargando && !filas.length ? (
        <Cargando texto="Cargando tus solicitudes…" />
      ) : lista.length ? (
        lista.map((r, i) => (
          <Fragment key={r.id}>
            {i === 0 || tituloDiaCO(lista[i - 1].creado, ahora) !== tituloDiaCO(r.creado, ahora) ? <Texto v="etiqueta">{tituloDiaCO(r.creado, ahora)}</Texto> : null}
            <TarjetaSolicitud r={r} vista="cliente" resena={resenas.get(r.id) ?? null} ahora={ahora} onCambio={cargar} />
          </Fragment>
        ))
      ) : (
        <Tarjeta>
          <Texto tono="#5A6072">
            {ver === "historial"
              ? "Aquí verás las rentas que ya terminaron (para calificar a la compañía), las que no se concretaron y las que cancelaste."
              : "No tienes solicitudes activas."}
          </Texto>
          {ver === "activas" ? <Boton titulo="Buscar equipos" onPress={() => router.navigate("/buscar")} /> : null}
        </Tarjeta>
      )}
    </Pantalla>
  );
}

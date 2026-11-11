"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Mapa } from "@/components/mapa";
import { MEDELLIN, type Punto } from "@/lib/geo";
import { createClient } from "@/lib/supabase/client";

// La compañía arrastra el pin hasta la puerta de su bodega. Con eso las distancias
// y el costo de entrega que ven los clientes son exactos.
export function UbicacionBodega({ companiaId, inicial }: { companiaId: string; inicial: Punto | null }) {
  const router = useRouter();
  const [pin, setPin] = useState<Punto>(inicial ?? MEDELLIN);
  const [cambiado, setCambiado] = useState(false);
  const [estado, setEstado] = useState<"" | "guardando" | "ok" | "error">("");

  async function guardar() {
    setEstado("guardando");
    const lat = Math.round(pin.lat * 1e6) / 1e6;
    const lng = Math.round(pin.lng * 1e6) / 1e6;
    const { error } = await createClient().from("companias").update({ lat, lng }).eq("id", companiaId);
    if (error) {
      setEstado("error");
      return;
    }
    setEstado("ok");
    setCambiado(false);
    router.refresh();
  }

  return (
    <>
      <div className="mapa-mini">
        <Mapa
          etiqueta="Mapa para ubicar tu bodega"
          pin={pin}
          onPin={(p) => {
            setPin(p);
            setCambiado(true);
            setEstado("");
          }}
          pinConClic
          zoom={15}
        />
      </div>
      <div className="row-actions">
        <button type="button" className="btn primary" onClick={guardar} disabled={!cambiado || estado === "guardando"}>
          {estado === "guardando" ? "Guardando…" : "Guardar ubicación"}
        </button>
        {estado === "ok" && <span className="tag ok" role="status">Ubicación guardada</span>}
        {estado === "error" && (
          <span className="tag warn" role="alert">No se pudo guardar. Intenta de nuevo.</span>
        )}
        {!cambiado && estado === "" && <span className="fine">Toca el mapa o arrastra el pin para moverlo.</span>}
      </div>
    </>
  );
}

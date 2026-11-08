"use client";

import { useMemo, useState } from "react";
import type { Categoria } from "@/lib/catalogo";
import type { Catalogo } from "@/lib/catalogo-publico";
import { usePedido } from "@/lib/pedido";
import { PasoCuando, PasoDonde, PasoQue, fechasSugeridas } from "./pasos";
import { VistaMapa } from "./vista-mapa";

type Paso = 1 | 2 | 3 | "mapa";
const PASOS = [
  { n: 1, texto: "Qué" },
  { n: 2, texto: "Cuándo" },
  { n: 3, texto: "Dónde" },
] as const;

// Modo "Necesito equipos": primero el pedido guiado, después el mapa.
export function Explorador({
  catalogo,
  categorias,
  conSesion,
}: {
  catalogo: Catalogo;
  categorias: Categoria[];
  conSesion: boolean;
}) {
  const [pedido, guardar] = usePedido();
  const [pasoElegido, setPaso] = useState<Paso | null>(null);
  const completo = pedido.listo && pedido.lugar !== null && pedido.necesidades.length > 0 && pedido.entrega !== "";
  const paso: Paso = pasoElegido ?? (completo ? "mapa" : 1);
  const equipos = useMemo(() => catalogo.companias.flatMap((c) => c.equipos), [catalogo]);

  const ir = (p: Paso) => {
    setPaso(p);
    window.scrollTo({ top: 0 });
  };

  if (paso === "mapa" && completo) {
    return (
      <VistaMapa
        pedido={pedido}
        guardar={guardar}
        categorias={categorias}
        catalogo={catalogo}
        conSesion={conSesion}
        onEditar={ir}
      />
    );
  }

  const actual = paso === "mapa" ? 1 : paso;
  return (
    <div className="wz">
      <div className="wz-top">
        <ol className="pasos" aria-label="Pasos del pedido">
          {PASOS.map((p) => (
            <li key={p.n} aria-current={p.n === actual ? "step" : undefined} className={p.n < actual ? "hecho" : ""}>
              <span className="num">{p.n}</span>
              {p.texto}
            </li>
          ))}
        </ol>
        {completo && (
          <button type="button" className="btn sm" onClick={() => ir("mapa")}>
            Volver al mapa
          </button>
        )}
      </div>

      {actual === 1 && (
        <PasoQue
          pedido={pedido}
          guardar={guardar}
          categorias={categorias}
          equipos={equipos}
          onSiguiente={() => {
            if (!pedido.entrega || !pedido.recogida) guardar({ ...pedido, ...fechasSugeridas() });
            ir(2);
          }}
        />
      )}
      {actual === 2 && <PasoCuando pedido={pedido} guardar={guardar} onSiguiente={() => ir(3)} onAtras={() => ir(1)} />}
      {actual === 3 && (
        <PasoDonde
          pedido={pedido}
          guardar={guardar}
          lugares={catalogo.lugares}
          onSiguiente={() => ir("mapa")}
          onAtras={() => ir(2)}
        />
      )}
    </div>
  );
}

import { View } from "react-native";
import { conPuntos, pesos, soloNumero } from "@/lib/formato";
import { costoTransporte } from "@/lib/geo";
import { Campo, Chip, Segmentos, Texto } from "@/ui/base";

// Campos de entrega y técnico de una compañía (se usan en Registro y en Tarifas).
export type DatosEntrega = {
  cobertura: string; // km; "0" = solo retiro en bodega
  modo: "fijo" | "variable";
  fijo: string;
  base: string;
  km: string;
  tecnico: string;
  tarifaTecnico: string;
};

export const COBERTURAS = [0, 10, 15, 20, 25, 30, 35, 40, 45];

export function validarEntrega(f: DatosEntrega) {
  const entrega = f.cobertura !== "0";
  if (entrega && f.modo === "fijo" && f.fijo.trim() === "") return "Escribe el valor fijo del transporte (puede ser 0 si va incluido).";
  if (entrega && f.modo === "variable" && soloNumero(f.km) <= 0) return "Escribe cuánto cobras por kilómetro de transporte.";
  if (f.tecnico.trim() && soloNumero(f.tarifaTecnico) <= 0) return "Escribe la tarifa por día del técnico.";
  if (!f.tecnico.trim() && soloNumero(f.tarifaTecnico) > 0) return "Escribe qué técnico ofreces (p. ej. Técnico RF).";
  return "";
}

// Lo que se guarda en la tabla companias. Si deja de entregar, se conservan sus valores de transporte.
export const entregaAGuardar = (f: DatosEntrega) => ({
  cobertura_km: Number(f.cobertura),
  transporte_modo: f.modo,
  transporte_fijo: soloNumero(f.fijo),
  transporte_base: soloNumero(f.base),
  transporte_km: soloNumero(f.km),
  tecnico_nombre: f.tecnico.trim() || null,
  tecnico_tarifa_dia: f.tecnico.trim() ? soloNumero(f.tarifaTecnico) : null,
});

export function CamposEntrega({ f, cambiar }: { f: DatosEntrega; cambiar: (c: Partial<DatosEntrega>) => void }) {
  const entrega = f.cobertura !== "0";
  const v = entregaAGuardar(f);
  const distancias = [...new Set([5, 15, v.cobertura_km])].filter((d) => d <= v.cobertura_km);
  const ejemplo =
    v.transporte_modo === "fijo"
      ? `Cada servicio de entrega y recogida cuesta ${pesos(v.transporte_fijo)}, sin importar la distancia.`
      : distancias.map((d) => `a ${d} km: ${pesos(costoTransporte(v, d) ?? 0)}`).join(" · ");
  const coberturas = COBERTURAS.includes(v.cobertura_km) ? COBERTURAS : [...COBERTURAS, v.cobertura_km].sort((a, b) => a - b);

  return (
    <>
      <Texto peso={500} style={{ fontSize: 14 }}>
        ¿Hasta dónde entregas?
      </Texto>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {coberturas.map((k) => (
          <Chip key={k} texto={k === 0 ? "Solo retiro en bodega" : `${k} km`} activo={f.cobertura === String(k)} onPress={() => cambiar({ cobertura: String(k) })} />
        ))}
      </View>
      {entrega ? (
        <>
          <Segmentos
            opciones={[
              { id: "variable", texto: "Según la distancia" },
              { id: "fijo", texto: "Valor fijo" },
            ]}
            valor={f.modo}
            onCambio={(modo) => cambiar({ modo })}
          />
          {f.modo === "fijo" ? (
            <Campo etiqueta="Entrega y recogida (valor fijo)" keyboardType="number-pad" placeholder="80.000" value={f.fijo} onChangeText={(x) => cambiar({ fijo: conPuntos(x) })} />
          ) : (
            <View style={{ flexDirection: "row", gap: 10 }}>
              <Campo etiqueta="Base" keyboardType="number-pad" placeholder="40.000" value={f.base} onChangeText={(x) => cambiar({ base: conPuntos(x) })} style={{ flex: 1 }} />
              <Campo etiqueta="Por km" keyboardType="number-pad" placeholder="3.000" value={f.km} onChangeText={(x) => cambiar({ km: conPuntos(x) })} style={{ flex: 1 }} />
            </View>
          )}
          <Texto v="fino">{ejemplo}</Texto>
        </>
      ) : (
        <Texto v="fino">Los clientes recogen y devuelven el equipo en tu bodega.</Texto>
      )}
      <View style={{ flexDirection: "row", gap: 10 }}>
        <Campo etiqueta="Técnico (opcional)" placeholder="Técnico RF" value={f.tecnico} onChangeText={(x) => cambiar({ tecnico: x })} style={{ flex: 1.3 }} />
        <Campo etiqueta="Tarifa por día" keyboardType="number-pad" placeholder="250.000" value={f.tarifaTecnico} onChangeText={(x) => cambiar({ tarifaTecnico: conPuntos(x) })} style={{ flex: 1 }} />
      </View>
    </>
  );
}

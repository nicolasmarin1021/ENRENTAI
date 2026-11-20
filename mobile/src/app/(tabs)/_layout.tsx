import { NativeTabs } from "expo-router/native-tabs";
import { useState } from "react";
import { BarraContexto } from "@/lib/barra";
import { usePedido } from "@/lib/pedido";
import { useSesion } from "@/lib/sesion";
import { color, fuente } from "@/tema";

// Pestañas de abajo (las nativas del iPhone). Cambian según el modo:
// cliente → Explorar, Rider y Solicitudes · compañía → Panel, Inventario y Tarifas. Cuenta siempre.
export default function Pestanas() {
  const { modo } = useSesion();
  const { pedido } = usePedido();
  const cliente = modo === "necesito";
  const enRider = pedido.rider.reduce((a, i) => a + i.cantidad, 0);
  // El mapa de Explorar esconde la barra mientras está en primer plano (lib/barra.tsx).
  const [barraOculta, setBarraOculta] = useState(false);

  return (
    <BarraContexto value={setBarraOculta}>
    <NativeTabs
      hidden={barraOculta}
      tintColor={color.acento}
      labelStyle={{ fontFamily: fuente[500] }}
      backgroundColor={color.superficie}
      badgeBackgroundColor={color.coral}
    >
      <NativeTabs.Trigger name="explorar" hidden={!cliente}>
        <NativeTabs.Trigger.Label>Explorar</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "map", selected: "map.fill" }} md="map" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="guardados" hidden={!cliente}>
        <NativeTabs.Trigger.Label>Guardados</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "heart", selected: "heart.fill" }} md="favorite" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="rider" hidden={!cliente}>
        <NativeTabs.Trigger.Label>Rider</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "list.bullet.clipboard", selected: "list.bullet.clipboard.fill" }} md="list_alt" />
        {enRider > 0 ? <NativeTabs.Trigger.Badge>{String(enRider)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="solicitudes" hidden={!cliente}>
        <NativeTabs.Trigger.Label>Solicitudes</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "paperplane", selected: "paperplane.fill" }} md="send" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="panel" hidden={cliente}>
        <NativeTabs.Trigger.Label>Panel</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "square.grid.2x2", selected: "square.grid.2x2.fill" }} md="dashboard" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inventario" hidden={cliente}>
        <NativeTabs.Trigger.Label>Inventario</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "shippingbox", selected: "shippingbox.fill" }} md="inventory_2" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="tarifas" hidden={cliente}>
        <NativeTabs.Trigger.Label>Tarifas</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "dollarsign.circle", selected: "dollarsign.circle.fill" }} md="payments" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="cuenta">
        <NativeTabs.Trigger.Label>Cuenta</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
    </BarraContexto>
  );
}

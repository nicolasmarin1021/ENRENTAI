# ENRENTA

Marketplace para rentar equipos de audio y RF para shows, entre clientes ("Necesito equipos") y compañías ("Tengo equipos"). Lanzamiento inicial en **Medellín**.

## Estructura

- `prototipo/` — el prototipo navegable (HTML) que define el diseño y los flujos. Es la referencia de cómo debe verse y comportarse la app.
- `web/` — la app real (Next.js 16 + TypeScript).

## Cómo correr la app en tu computador

Requiere Node.js 20 o superior.

```bash
cd web
npm install
npm run dev
```

Luego abre http://localhost:3000.

## Hoja de ruta

1. **Fase 1:** base con el diseño de ENRENTA (hecho), base de datos y cuentas (Supabase), inventario con fotos, pedido guiado, mapa de Medellín, rider y reservas, entregas con fotos, casos, chat, cotizaciones y facturas en PDF. Pagos en modo de prueba.
2. **Fase 2:** pagos reales (pasarela colombiana), depósitos y pagos a compañías, factura electrónica, notificaciones y panel de administración.
3. **Fase 3:** dominio, publicación, términos y condiciones, y piloto con compañías en Medellín.

## Reglas de negocio acordadas

- Comisiones: 7 % al cliente y 10 % a la compañía.
- Los precios los define solo cada compañía.
- Se cobra un día por cada 24 horas entre la entrega y la recogida.
- Depósito: porcentaje del alquiler que define cada compañía.
- Transporte: valor fijo o variable por kilómetro, a elección de la compañía; el cliente puede recoger en la bodega sin costo.
- Entregas en 4 pasos con fotos (salida, recepción, devolución, revisión final); un caso abierto retiene el depósito.

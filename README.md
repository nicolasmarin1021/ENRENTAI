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

## Base de datos (Supabase)

1. En [supabase.com](https://supabase.com) crea un proyecto llamado `ENRENTA` en una región cercana a Colombia (por ejemplo, São Paulo) y guarda la contraseña de la base de datos en un lugar seguro.
2. Copia `web/.env.example` como `web/.env.local` y pega ahí la **Project URL** y la **publishable key** del proyecto (Project Settings → API Keys). Nunca uses la *secret key* ni la *service_role key* en este archivo.
3. En el **SQL Editor** de Supabase, pega y ejecuta en orden `supabase/migrations/0001_esquema_inicial.sql` y `supabase/migrations/0002_lugares_medellin.sql` (lugares de show de Medellín).
4. En **Authentication → URL Configuration**, pon `http://localhost:3000` como *Site URL* y agrega `http://localhost:3000/**` en *Redirect URLs*.
5. Reinicia `npm run dev` para que tome las variables nuevas.

La entrada a ENRENTA es sin contraseña: llega un correo con un enlace (y, con plantillas propias, también un código de 6 dígitos).

> **Correos en pruebas:** se usan los correos que trae Supabase, en inglés y solo con enlace. Mandan pocos correos por hora y únicamente a los miembros de tu equipo en Supabase, así que prueba con el correo de tu cuenta de Supabase y abre el enlace en el mismo navegador donde lo pediste.
>
> **Antes del lanzamiento:** con el dominio de ENRENTA se conecta un servicio de correo (SMTP propio, por ejemplo Resend) en **Authentication → Emails → SMTP Settings**. Ahí sí se personalizan las plantillas **Confirm sign up** y **Magic link** en español y con el código `{{ .Token }}`.

Mientras no exista `web/.env.local`, la app funciona igual, solo que sin cuentas.

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

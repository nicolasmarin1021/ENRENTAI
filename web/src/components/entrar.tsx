"use client";

import { useEffect, useState, type FormEvent } from "react";
import { marcarEnlacePedido } from "@/lib/enlace";
import { createClient } from "@/lib/supabase/client";

export type Modo = "necesito" | "tengo";
type Supabase = ReturnType<typeof createClient>;

const ESPERA_REENVIO = 60; // segundos; Supabase no deja pedir otro correo antes
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_CLAVE = 8;

function mensajeError(e: { code?: string; status?: number }) {
  switch (e.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Todavía no confirmas tu correo. Abre el correo que te enviamos y toca el enlace.";
    case "user_already_exists":
    case "email_exists":
      return "Ya existe una cuenta con ese correo. Entra con tu contraseña.";
    case "weak_password":
      return `La contraseña es muy débil: usa al menos ${MIN_CLAVE} caracteres, con letras y números.`;
    case "signup_disabled":
      return "Por ahora no se pueden crear cuentas nuevas.";
    case "otp_expired":
      return "El código no es correcto o ya venció. Revisa el último correo o pide uno nuevo.";
    case "email_address_invalid":
      return "Ese correo no parece válido. Revísalo e intenta de nuevo.";
    case "email_address_not_authorized":
      return "Este correo todavía no puede recibir correos de ENRENTA: mientras estamos en pruebas, solo llegan al correo de la cuenta de Supabase.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Pediste varios correos seguidos. Espera un minuto y vuelve a intentarlo.";
  }
  if (e.status === 429) return "Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.";
  return "No pudimos completar este paso. Intenta de nuevo en un momento.";
}

// Celular de Colombia: 10 dígitos que empiezan por 3 (acepta +57, espacios y guiones).
function celularColombia(v: string) {
  let d = v.replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("57")) d = d.slice(2);
  return /^3\d{9}$/.test(d) ? `+57${d}` : null;
}

// A dónde va cada persona después de entrar.
async function destino(supabase: Supabase, uid: string, modo: Modo) {
  if (modo === "necesito") return "/explorar";
  const { data } = await supabase.from("companias").select("id").eq("duenio", uid).limit(1);
  return data?.length ? "/tengo/panel" : "/tengo/registro";
}

type Paso = "entrar" | "registro" | "confirmar" | "enlace" | "revisar";

// Entrada a ENRENTA con correo y contraseña, igual que en la app. Crear cuenta pide nombre completo,
// celular, correo y contraseña (dos veces); el correo que envía Supabase solo sirve para activar la cuenta,
// no para obtener contraseña. Las cuentas antiguas, creadas sin contraseña, todavía pueden entrar con
// un enlace o un código al correo.
export function EntrarConClave({ modo }: { modo: Modo }) {
  const [supabase] = useState(createClient);
  const [paso, setPaso] = useState<Paso>("entrar");
  const [nombre, setNombre] = useState("");
  const [celular, setCelular] = useState("");
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [clave2, setClave2] = useState("");
  const [verClave, setVerClave] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [uid, setUid] = useState("");
  const [nombreFalta, setNombreFalta] = useState(false);
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  const enlaceCorreo = () => `${window.location.origin}/auth/confirmar?siguiente=/${modo}`;

  function ir(p: Paso) {
    setError("");
    setAviso("");
    setClave("");
    setClave2("");
    setCodigo("");
    setPaso(p);
  }

  // Después de entrar: pide el nombre si falta y luego lleva a la página que corresponde.
  async function continuar(id: string) {
    const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", id).maybeSingle();
    if (!perfil?.nombre) {
      setUid(id);
      setOcupado(false);
      setNombreFalta(true);
      return;
    }
    // Recarga completa para que toda la página (y el encabezado) vea la sesión nueva.
    window.location.assign(await destino(supabase, id, modo));
  }

  async function alEntrar(ev: FormEvent) {
    ev.preventDefault();
    const email = correo.trim().toLowerCase();
    if (!CORREO_VALIDO.test(email)) return setError("Escribe tu correo, por ejemplo nombre@correo.com.");
    if (!clave) return setError("Escribe tu contraseña.");
    setOcupado(true);
    setError("");
    const { data, error: e } = await supabase.auth.signInWithPassword({ email, password: clave });
    if (e || !data.user) {
      setOcupado(false);
      setClave("");
      setCorreo(email);
      setError(mensajeError(e ?? {}));
      if (e?.code === "email_not_confirmed") setPaso("confirmar");
      return;
    }
    setClave("");
    await continuar(data.user.id);
  }

  async function alCrearCuenta(ev: FormEvent) {
    ev.preventDefault();
    const nombreLimpio = nombre.trim().replace(/\s+/g, " ");
    const email = correo.trim().toLowerCase();
    const tel = celularColombia(celular);
    if (nombreLimpio.split(" ").length < 2 || nombreLimpio.length < 5) return setError("Escribe tu nombre completo (nombre y apellido).");
    if (!tel) return setError("Escribe tu celular de Colombia: 10 dígitos, empieza por 3.");
    if (!CORREO_VALIDO.test(email)) return setError("Escribe un correo válido, por ejemplo nombre@correo.com.");
    if (clave.length < MIN_CLAVE || !/[a-zA-Z]/.test(clave) || !/\d/.test(clave))
      return setError(`La contraseña necesita al menos ${MIN_CLAVE} caracteres, con letras y números.`);
    if (clave !== clave2) return setError("Las contraseñas no coinciden.");
    setOcupado(true);
    setError("");
    marcarEnlacePedido();
    const { data, error: e } = await supabase.auth.signUp({
      email,
      password: clave,
      options: { emailRedirectTo: enlaceCorreo(), data: { nombre: nombreLimpio.slice(0, 120), telefono: tel } },
    });
    setOcupado(false);
    setCorreo(email);
    if (e) return setError(mensajeError(e));
    // Si el correo ya tenía cuenta, Supabase no lo dice directamente: devuelve un usuario sin identidades.
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      ir("entrar");
      return setError("Ya existe una cuenta con ese correo. Entra con tu contraseña.");
    }
    setClave("");
    setClave2("");
    // Sin confirmación de correo (si está apagada en Supabase) ya hay sesión.
    if (data.session && data.user) return void (await continuar(data.user.id));
    setEspera(ESPERA_REENVIO);
    setPaso("confirmar");
  }

  // Confirmación con el código del correo (si la plantilla de Supabase lo incluye).
  async function alConfirmarConCodigo(ev: FormEvent) {
    ev.preventDefault();
    if (codigo.length < 6) return setError("Escribe el código completo que llegó a tu correo.");
    setOcupado(true);
    setError("");
    setAviso("");
    const { data, error: e } = await supabase.auth.verifyOtp({ email: correo, token: codigo, type: "signup" });
    if (e || !data.user) {
      setOcupado(false);
      return setError(mensajeError(e ?? {}));
    }
    await continuar(data.user.id);
  }

  async function reenviarConfirmacion() {
    setOcupado(true);
    setError("");
    setAviso("");
    marcarEnlacePedido();
    const { error: e } = await supabase.auth.resend({ type: "signup", email: correo, options: { emailRedirectTo: enlaceCorreo() } });
    setOcupado(false);
    if (e) return setError(mensajeError(e));
    setEspera(ESPERA_REENVIO);
    setAviso("Te enviamos el correo de nuevo. Usa el más reciente.");
  }

  // Cuentas antiguas sin contraseña: enlace o código al correo (no crea cuentas nuevas).
  async function enviarEnlace() {
    const email = correo.trim().toLowerCase();
    if (!CORREO_VALIDO.test(email)) {
      setError("Escribe un correo válido, por ejemplo nombre@correo.com.");
      return false;
    }
    setOcupado(true);
    setError("");
    setAviso("");
    marcarEnlacePedido();
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false, emailRedirectTo: enlaceCorreo() },
    });
    setOcupado(false);
    if (e) {
      setError(
        e.code === "otp_disabled" || e.code === "user_not_found" || e.status === 422
          ? "No hay una cuenta con ese correo. Crea una nueva."
          : mensajeError(e),
      );
      return false;
    }
    setCorreo(email);
    setEspera(ESPERA_REENVIO);
    return true;
  }

  async function alEnviarEnlace(ev: FormEvent) {
    ev.preventDefault();
    if (await enviarEnlace()) setPaso("revisar");
  }

  async function alVerificarCodigo(ev: FormEvent) {
    ev.preventDefault();
    if (codigo.length < 6) return setError("Escribe el código completo que llegó a tu correo.");
    setOcupado(true);
    setError("");
    const { data, error: e } = await supabase.auth.verifyOtp({ email: correo, token: codigo, type: "email" });
    if (e || !data.user) {
      setOcupado(false);
      return setError(mensajeError(e ?? {}));
    }
    await continuar(data.user.id);
  }

  if (nombreFalta) return <FormNombre uid={uid} modo={modo} />;

  const mensajes = (
    <>
      {error && <p className="form-err" role="alert">{error}</p>}
      {aviso && <p className="form-ok" role="status">{aviso}</p>}
    </>
  );
  const verOcultar = (
    <button type="button" className="link-btn" style={{ justifySelf: "end" }} onClick={() => setVerClave((v) => !v)}>
      {verClave ? "Ocultar contraseña" : "Ver contraseña"}
    </button>
  );
  const tipoClave = verClave ? "text" : "password";

  if (paso === "registro") {
    return (
      <form className="card form" onSubmit={alCrearCuenta} noValidate>
        <h2>Crea tu cuenta</h2>
        <p className="fine">Con tu cuenta pides cotizaciones, guardas equipos o publicas los de tu compañía.</p>
        <div className="field">
          <label htmlFor="reg-nombre">Nombre completo</label>
          <input id="reg-nombre" autoComplete="name" placeholder="Nombre y apellido" maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
        </div>
        <div className="field">
          <label htmlFor="reg-celular">Celular</label>
          <input
            id="reg-celular"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="300 123 4567"
            value={celular}
            onChange={(e) => setCelular(e.target.value.replace(/[^\d+\s-]/g, "").slice(0, 16))}
          />
          <span className="hint">Celular de Colombia. Las compañías te contactan por WhatsApp.</span>
        </div>
        <div className="field">
          <label htmlFor="reg-correo">Correo electrónico</label>
          <input id="reg-correo" type="email" autoComplete="email" placeholder="nombre@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="reg-clave">Contraseña</label>
          <input id="reg-clave" type={tipoClave} autoComplete="new-password" value={clave} onChange={(e) => setClave(e.target.value)} />
          <span className="hint">Mínimo {MIN_CLAVE} caracteres, con letras y números.</span>
        </div>
        <div className="field">
          <label htmlFor="reg-clave2">Repite la contraseña</label>
          <input id="reg-clave2" type={tipoClave} autoComplete="new-password" value={clave2} onChange={(e) => setClave2(e.target.value)} />
          {clave2 && clave2.length >= clave.length && clave2 !== clave && <span className="form-err">No coincide con la contraseña.</span>}
        </div>
        {verOcultar}
        {mensajes}
        <button type="submit" className="btn primary lg block" disabled={ocupado}>
          {ocupado ? "Creando…" : "Crear cuenta"}
        </button>
        <p className="fine">Te enviaremos un correo para confirmar tu cuenta.</p>
        <div className="row-actions">
          <button type="button" className="link-btn" onClick={() => ir("entrar")}>
            ¿Ya tienes cuenta? Entra
          </button>
        </div>
      </form>
    );
  }

  if (paso === "confirmar") {
    return (
      <form className="card form" onSubmit={alConfirmarConCodigo} noValidate>
        <h2>Confirma tu correo</h2>
        <p>
          Te enviamos un correo a <b>{correo}</b>. Abre el enlace del correo para activar tu cuenta. Si no lo ves, revisa spam o
          promociones.
        </p>
        <p className="note">
          Si después de abrirlo se muestra una página que no carga o te pide entrar, no importa: tu cuenta ya quedó confirmada.
          Vuelve aquí y entra con tu contraseña.
        </p>
        <button type="button" className="btn primary lg block" onClick={() => ir("entrar")}>
          Ya lo confirmé, entrar
        </button>
        <div className="field">
          <label htmlFor="codigo-confirmar">Si el correo trae un código de 6 dígitos, también puedes confirmar con él</label>
          <input
            id="codigo-confirmar"
            className="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="123456"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
          />
        </div>
        {mensajes}
        <button type="submit" className="btn" disabled={ocupado || codigo.length < 6}>
          {ocupado ? "Confirmando…" : "Confirmar con el código"}
        </button>
        <div className="row-actions">
          <button type="button" className="link-btn" onClick={reenviarConfirmacion} disabled={ocupado || espera > 0}>
            {espera > 0 ? `Reenviar el correo en ${espera} s` : "Reenviar el correo"}
          </button>
        </div>
      </form>
    );
  }

  if (paso === "revisar") {
    return (
      <form className="card form" onSubmit={alVerificarCodigo} noValidate>
        <h2>Revisa tu correo</h2>
        <p>
          Te enviamos un correo a <b>{correo}</b>. Abre el enlace en este mismo navegador, o escribe el código si el correo trae uno.
        </p>
        <div className="field">
          <label htmlFor="codigo-enlace">Código del correo</label>
          <input
            id="codigo-enlace"
            className="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={8}
            placeholder="123456"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </div>
        {mensajes}
        <button type="submit" className="btn primary lg block" disabled={ocupado || codigo.length < 6}>
          {ocupado ? "Verificando…" : "Entrar con el código"}
        </button>
        <div className="row-actions">
          <button
            type="button"
            className="link-btn"
            disabled={ocupado || espera > 0}
            onClick={async () => {
              if (await enviarEnlace()) setAviso("Te enviamos un correo nuevo. Usa el más reciente.");
            }}
          >
            {espera > 0 ? `Reenviar en ${espera} s` : "Reenviar el correo"}
          </button>
          <button type="button" className="link-btn" onClick={() => ir("entrar")}>
            Volver
          </button>
        </div>
      </form>
    );
  }

  if (paso === "enlace") {
    return (
      <form className="card form" onSubmit={alEnviarEnlace} noValidate>
        <h2>Entrar con un enlace</h2>
        <p className="fine">Para cuentas creadas antes, sin contraseña: te enviamos un enlace a tu correo.</p>
        <div className="field">
          <label htmlFor="correo-enlace">Tu correo</label>
          <input id="correo-enlace" type="email" autoComplete="email" placeholder="nombre@correo.com" value={correo} onChange={(e) => setCorreo(e.target.value)} autoFocus />
        </div>
        {mensajes}
        <button type="submit" className="btn primary lg block" disabled={ocupado}>
          {ocupado ? "Enviando…" : "Enviarme el enlace"}
        </button>
        <div className="row-actions">
          <button type="button" className="link-btn" onClick={() => ir("entrar")}>
            Volver
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="card form" onSubmit={alEntrar} noValidate>
      <div className="field">
        <label htmlFor="correo">{modo === "tengo" ? "Correo de la compañía" : "Correo electrónico"}</label>
        <input
          id="correo"
          type="email"
          autoComplete="username"
          placeholder={modo === "tengo" ? "contacto@tucompania.com" : "nombre@correo.com"}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="clave">Contraseña</label>
        <input id="clave" type={tipoClave} autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} />
      </div>
      {verOcultar}
      {mensajes}
      <button type="submit" className="btn primary lg block" disabled={ocupado}>
        {ocupado ? "Entrando…" : "Entrar"}
      </button>
      <p className="fine" style={{ textAlign: "center" }}>¿Eres nuevo?</p>
      <button type="button" className="btn lg block" onClick={() => ir("registro")}>
        Crear cuenta
      </button>
      <div className="row-actions" style={{ justifyContent: "center" }}>
        <button type="button" className="link-btn" onClick={() => ir("enlace")}>
          ¿Sin contraseña? Entra con un enlace
        </button>
      </div>
    </form>
  );
}

// Pide el nombre la primera vez (o si la persona entró con el enlace del correo y aún no lo tiene).
export function FormNombre({ uid, modo }: { uid: string; modo: Modo }) {
  const [supabase] = useState(createClient);
  const [nombre, setNombre] = useState("");
  const [error, setError] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function alGuardar(ev: FormEvent) {
    ev.preventDefault();
    const limpio = nombre.trim().replace(/\s+/g, " ");
    if (limpio.length < 2) {
      setError("Escribe tu nombre para que las compañías sepan con quién hablan.");
      return;
    }
    setOcupado(true);
    setError("");
    const { error: e } = await supabase.from("perfiles").update({ nombre: limpio.slice(0, 120) }).eq("id", uid);
    if (e) {
      setOcupado(false);
      setError("No pudimos guardar tu nombre. Intenta de nuevo.");
      return;
    }
    window.location.assign(await destino(supabase, uid, modo));
  }

  return (
    <form className="card form" onSubmit={alGuardar} noValidate>
      <div className="field">
        <label htmlFor="nombre">{modo === "tengo" ? "Tu nombre (persona de contacto)" : "¿Cómo te llamas?"}</label>
        <span className="hint">Es la primera vez que entras con este correo.</span>
        <input
          id="nombre"
          autoComplete="name"
          placeholder="Nombre y apellido"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          autoFocus
        />
      </div>
      {error && <p className="form-err" role="alert">{error}</p>}
      <button type="submit" className="btn primary lg block" disabled={ocupado}>
        {ocupado ? "Guardando…" : "Continuar"}
      </button>
    </form>
  );
}

export function BotonSalir({ className = "link-btn", texto = "Salir" }: { className?: string; texto?: string }) {
  const [ocupado, setOcupado] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={ocupado}
      onClick={async () => {
        setOcupado(true);
        await createClient().auth.signOut();
        // Recarga completa a propósito: borra de la memoria del navegador las páginas
        // privadas que se vieron con la sesión (para que "Atrás" no las muestre).
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/");
      }}
    >
      {ocupado ? "Saliendo…" : texto}
    </button>
  );
}

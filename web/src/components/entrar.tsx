"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

export type Modo = "necesito" | "tengo";
type Supabase = ReturnType<typeof createClient>;

const ESPERA_REENVIO = 60; // segundos; Supabase no deja pedir otro código antes
// La entrada con contraseña es solo para la cuenta de prueba y solo existe en desarrollo
// (npm run dev). En la versión publicada no aparece.
const ACCESO_PRUEBA = process.env.NODE_ENV !== "production";

function mensajeError(e: { code?: string; status?: number }) {
  switch (e.code) {
    case "invalid_credentials":
      return "Correo o contraseña incorrectos.";
    case "email_not_confirmed":
      return "Esa cuenta aún no está confirmada. En Supabase créala marcando “Auto Confirm User”.";
    case "otp_expired":
      return "El código no es correcto o ya venció. Revisa el último correo o pide uno nuevo.";
    case "email_address_invalid":
      return "Ese correo no parece válido. Revísalo e intenta de nuevo.";
    case "email_address_not_authorized":
      return "Este correo todavía no puede recibir códigos: mientras ENRENTA está en pruebas, solo llegan al correo de tu cuenta de Supabase.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Pediste varios códigos seguidos. Espera un minuto y vuelve a intentarlo.";
  }
  if (e.status === 429) return "Demasiados intentos seguidos. Espera un minuto y vuelve a intentarlo.";
  return "No pudimos completar este paso. Intenta de nuevo en un momento.";
}

// A dónde va cada persona después de entrar.
async function destino(supabase: Supabase, uid: string, modo: Modo) {
  if (modo === "necesito") return "/explorar";
  const { data } = await supabase.from("companias").select("id").eq("duenio", uid).limit(1);
  return data?.length ? "/tengo/panel" : "/tengo/registro";
}

// Entrada sin contraseña: correo → código de un solo uso → (nombre, solo la primera vez).
export function EntrarConCodigo({ modo }: { modo: Modo }) {
  const [supabase] = useState(createClient);
  const [paso, setPaso] = useState<"correo" | "codigo" | "nombre" | "clave">("correo");
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [clave, setClave] = useState("");
  const [uid, setUid] = useState("");
  const [error, setError] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [espera, setEspera] = useState(0);

  useEffect(() => {
    if (espera <= 0) return;
    const t = setTimeout(() => setEspera((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [espera]);

  async function enviarCodigo() {
    const email = correo.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Escribe un correo válido, por ejemplo nombre@correo.com.");
      return false;
    }
    setOcupado(true);
    setError("");
    setAviso("");
    const { error: e } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        // Si la persona abre el enlace del correo en vez de escribir el código.
        emailRedirectTo: `${window.location.origin}/auth/confirmar?siguiente=/${modo}`,
      },
    });
    setOcupado(false);
    if (e) {
      setError(mensajeError(e));
      return false;
    }
    setCorreo(email);
    setEspera(ESPERA_REENVIO);
    return true;
  }

  async function alEnviarCorreo(ev: FormEvent) {
    ev.preventDefault();
    if (await enviarCodigo()) setPaso("codigo");
  }

  async function alReenviar() {
    if (await enviarCodigo()) setAviso("Te enviamos un código nuevo. Usa el del último correo.");
  }

  async function alVerificar(ev: FormEvent) {
    ev.preventDefault();
    if (codigo.length < 6) {
      setError("Escribe el código completo que llegó a tu correo.");
      return;
    }
    setOcupado(true);
    setError("");
    setAviso("");
    const { data, error: e } = await supabase.auth.verifyOtp({ email: correo, token: codigo, type: "email" });
    if (e || !data.user) {
      setOcupado(false);
      setError(mensajeError(e ?? {}));
      return;
    }
    await continuar(data.user.id);
  }

  async function alEntrarConClave(ev: FormEvent) {
    ev.preventDefault();
    const email = correo.trim().toLowerCase();
    if (!email || !clave) {
      setError("Escribe el correo y la contraseña de la cuenta de prueba.");
      return;
    }
    setOcupado(true);
    setError("");
    const { data, error: e } = await supabase.auth.signInWithPassword({ email, password: clave });
    if (e || !data.user) {
      setOcupado(false);
      setError(mensajeError(e ?? {}));
      return;
    }
    setClave("");
    await continuar(data.user.id);
  }

  // Después de entrar: pide el nombre si falta y luego lleva a la página que corresponde.
  async function continuar(id: string) {
    const { data: perfil } = await supabase.from("perfiles").select("nombre").eq("id", id).maybeSingle();
    if (!perfil?.nombre) {
      setUid(id);
      setOcupado(false);
      setPaso("nombre");
      return;
    }
    // Recarga completa para que toda la página (y el encabezado) vea la sesión nueva.
    window.location.assign(await destino(supabase, id, modo));
  }

  if (paso === "nombre") return <FormNombre uid={uid} modo={modo} />;

  if (paso === "clave") {
    return (
      <form className="card form" onSubmit={alEntrarConClave} noValidate>
        <span className="tag warn" style={{ justifySelf: "start" }}>Acceso de prueba</span>
        <div className="field">
          <label htmlFor="correo-prueba">Correo de la cuenta de prueba</label>
          <input
            id="correo-prueba"
            type="email"
            autoComplete="username"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            autoFocus
          />
        </div>
        <div className="field">
          <label htmlFor="clave-prueba">Contraseña</label>
          <input
            id="clave-prueba"
            type="password"
            autoComplete="current-password"
            value={clave}
            onChange={(e) => setClave(e.target.value)}
          />
        </div>
        {error && <p className="form-err" role="alert">{error}</p>}
        <button type="submit" className="btn primary lg block" disabled={ocupado}>
          {ocupado ? "Entrando…" : "Entrar"}
        </button>
        <div className="row-actions">
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setPaso("correo");
              setClave("");
              setError("");
            }}
          >
            Volver a la entrada con código
          </button>
        </div>
        <p className="fine">
          Solo aparece mientras desarrollamos la app en tu computador. Las personas reales entran con el código del
          correo.
        </p>
      </form>
    );
  }

  if (paso === "codigo") {
    return (
      <form className="card form" onSubmit={alVerificar} noValidate>
        <div className="field">
          <label htmlFor="codigo">Código de acceso</label>
          <span className="hint">
            Te escribimos a <b>{correo}</b>. Escribe el código del correo, o abre el enlace que trae en este mismo
            navegador. Si no lo ves, revisa spam o promociones.
          </span>
          <input
            id="codigo"
            className="code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={10}
            placeholder="••••••"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            autoFocus
          />
        </div>
        {error && <p className="form-err" role="alert">{error}</p>}
        {aviso && <p className="form-ok" role="status">{aviso}</p>}
        <button type="submit" className="btn primary lg block" disabled={ocupado}>
          {ocupado ? "Verificando…" : "Entrar"}
        </button>
        <div className="row-actions">
          <button type="button" className="link-btn" onClick={alReenviar} disabled={ocupado || espera > 0}>
            {espera > 0 ? `Reenviar código en ${espera} s` : "Reenviar código"}
          </button>
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              setPaso("correo");
              setCodigo("");
              setError("");
              setAviso("");
            }}
          >
            Usar otro correo
          </button>
        </div>
      </form>
    );
  }

  return (
    <form className="card form" onSubmit={alEnviarCorreo} noValidate>
      <div className="field">
        <label htmlFor="correo">{modo === "tengo" ? "Correo de la compañía" : "Tu correo"}</label>
        <input
          id="correo"
          type="email"
          autoComplete="email"
          placeholder={modo === "tengo" ? "contacto@tucompania.com" : "tu@correo.com"}
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
        />
      </div>
      {error && <p className="form-err" role="alert">{error}</p>}
      <button type="submit" className="btn primary lg block" disabled={ocupado}>
        {ocupado ? "Enviando…" : "Enviarme un código"}
      </button>
      <p className="fine">
        Sin contraseñas: te enviamos un código de un solo uso cada vez que entras. Si es tu primera vez, tu cuenta se crea
        con este correo.
      </p>
      {ACCESO_PRUEBA && (
        <button
          type="button"
          className="link-btn"
          style={{ justifySelf: "start" }}
          onClick={() => {
            setPaso("clave");
            setError("");
          }}
        >
          Entrar con la cuenta de prueba
        </button>
      )}
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

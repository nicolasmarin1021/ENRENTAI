import AsyncStorage from "@react-native-async-storage/async-storage";
import type { EmailOtpType, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { supabase, supabaseConfigurado } from "./supabase";

// Quién está usando la app, su compañía (si tiene) y el modo en que la usa:
// "necesito" (cliente que busca equipos) o "tengo" (compañía que los renta).

export type Modo = "necesito" | "tengo";
export type MiCompania = { id: string; nombre: string; verificada: boolean };

type EstadoSesion = {
  usuario: { id: string; correo: string } | null;
  nombre: string;
  compania: MiCompania | null;
  admin: boolean; // perfiles.es_admin: revisa las verificaciones de identidad
  modo: Modo;
  modoElegido: boolean; // la persona ya eligió en la pantalla de inicio (si no, se le muestra)
  listo: boolean; // ya se leyó la sesión guardada en el celular
  errorEnlace: string; // si el enlace del correo falló (vencido, ya usado…)
  cambiarModo: (m: Modo) => void;
  recargarPerfil: () => Promise<void>;
  salir: () => Promise<void>;
};

const Contexto = createContext<EstadoSesion | null>(null);
// v2: con la pantalla de inicio nueva, todos la ven una vez aunque ya hubieran elegido antes.
const CLAVE_MODO = "enrenta:modo:v2";

// Lee los parámetros de una URL a mano (?a=1&b=2 y #a=1&b=2).
function parametros(url: string) {
  const valores: Record<string, string> = {};
  const partes = [url.split("?")[1]?.split("#")[0] ?? "", url.split("#")[1] ?? ""];
  for (const parte of partes)
    for (const par of parte.split("&")) {
      const [k, v = ""] = par.split("=");
      if (k) valores[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, " "));
    }
  return valores;
}

// Completa la entrada cuando la persona toca el enlace del correo en el celular.
// Supabase devuelve la sesión en el enlace (tokens, código o token_hash, según la configuración).
async function entrarConEnlace(url: string): Promise<string> {
  const p = parametros(url);
  if (p.error_code || p.error) {
    return p.error_code === "otp_expired"
      ? "El enlace ya venció o ya se usó. Pide uno nuevo."
      : "No pudimos completar la entrada con ese enlace. Pide uno nuevo.";
  }
  let error: { message: string } | null = null;
  if (p.access_token && p.refresh_token) {
    ({ error } = await supabase.auth.setSession({ access_token: p.access_token, refresh_token: p.refresh_token }));
  } else if (p.code) {
    ({ error } = await supabase.auth.exchangeCodeForSession(p.code));
  } else if (p.token_hash && p.type) {
    ({ error } = await supabase.auth.verifyOtp({ token_hash: p.token_hash, type: p.type as EmailOtpType }));
  } else {
    return ""; // no es un enlace de entrada
  }
  return error ? "El enlace ya venció o ya se usó. Pide uno nuevo." : "";
}

type Perfil = { uid: string; nombre: string; admin: boolean; compania: MiCompania | null };

// Lee el perfil y, la primera vez, guarda en él el nombre y el celular que la persona escribió al
// crear la cuenta (llegan en los metadatos del registro).
async function leerPerfil(uid: string, meta?: Record<string, unknown>): Promise<Perfil> {
  const [{ data: p }, { data: c }] = await Promise.all([
    supabase.from("perfiles").select("nombre, telefono, es_admin").eq("id", uid).maybeSingle(),
    supabase.from("companias").select("id, nombre, verificada").eq("duenio", uid).order("creado").limit(1).maybeSingle(),
  ]);
  const fila = p as { nombre: string | null; telefono: string | null; es_admin: boolean | null } | null;
  let nombre = fila?.nombre ?? "";
  const metaNombre = typeof meta?.nombre === "string" ? meta.nombre.trim().slice(0, 120) : "";
  const metaTelefono = typeof meta?.telefono === "string" ? meta.telefono.trim().slice(0, 20) : "";
  const cambios: { nombre?: string; telefono?: string } = {};
  if (fila && !nombre && metaNombre) cambios.nombre = metaNombre;
  if (fila && !fila.telefono && metaTelefono) cambios.telefono = metaTelefono;
  if (cambios.nombre || cambios.telefono) {
    const { error } = await supabase.from("perfiles").update(cambios).eq("id", uid);
    if (!error && cambios.nombre) nombre = cambios.nombre;
  }
  return { uid, nombre, admin: fila?.es_admin === true, compania: (c as MiCompania | null) ?? null };
}

export function SesionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [modo, setModo] = useState<Modo>("necesito");
  const [modoElegido, setModoElegido] = useState(false);
  const [sesionLeida, setSesionLeida] = useState(!supabaseConfigurado);
  const [modoLeido, setModoLeido] = useState(false);
  const [errorEnlace, setErrorEnlace] = useState("");
  const enlacesVistos = useRef(new Set<string>());
  const url = Linking.useLinkingURL();

  // Sesión guardada y cambios de sesión (entrar, salir, renovar).
  useEffect(() => {
    let vivo = true;
    AsyncStorage.getItem(CLAVE_MODO)
      .then((m) => {
        if (vivo && (m === "necesito" || m === "tengo")) {
          setModo(m);
          setModoElegido(true);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (vivo) setModoLeido(true);
      });
    if (!supabaseConfigurado) return;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (vivo) setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (vivo) setSesionLeida(true);
      });
    const { data } = supabase.auth.onAuthStateChange((_evento, s) => setUser(s?.user ?? null));
    return () => {
      vivo = false;
      data.subscription.unsubscribe();
    };
  }, []);

  // El enlace del correo abre la app con la sesión en la URL.
  useEffect(() => {
    if (!url || !supabaseConfigurado || enlacesVistos.current.has(url)) return;
    if (!/access_token|[?&#]code=|token_hash|error_code/.test(url)) return;
    enlacesVistos.current.add(url);
    void entrarConEnlace(url).then(setErrorEnlace);
  }, [url]);

  // Nombre y compañía de la persona que entró (se guardan con su id para no mostrar
  // los de otra cuenta después de salir y entrar con otra).
  const recargarPerfil = useCallback(async () => {
    if (!user) return;
    setPerfil(await leerPerfil(user.id, user.user_metadata));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    let vivo = true;
    void leerPerfil(user.id, user.user_metadata).then((p) => {
      if (vivo) setPerfil(p);
    });
    return () => {
      vivo = false;
    };
  }, [user]);

  const vigente = user && perfil?.uid === user.id ? perfil : null;
  const nombre = vigente?.nombre ?? "";
  const compania = vigente?.compania ?? null;
  const admin = vigente?.admin ?? false;

  const cambiarModo = useCallback((m: Modo) => {
    setModo(m);
    setModoElegido(true);
    AsyncStorage.setItem(CLAVE_MODO, m).catch(() => {});
  }, []);

  const salir = useCallback(async () => {
    await supabase.auth.signOut();
    setErrorEnlace("");
  }, []);

  return (
    <Contexto
      value={{
        usuario: user ? { id: user.id, correo: user.email ?? "" } : null,
        nombre,
        compania,
        admin,
        modo,
        modoElegido,
        listo: sesionLeida && modoLeido,
        errorEnlace,
        cambiarModo,
        recargarPerfil,
        salir,
      }}
    >
      {children}
    </Contexto>
  );
}

export function useSesion() {
  const s = use(Contexto);
  if (!s) throw new Error("useSesion debe usarse dentro de <SesionProvider>");
  return s;
}

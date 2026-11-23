// Marca que este navegador pidió un correo de confirmación o un enlace de entrada (dura un día, lo que el enlace).
// /auth/confirmar solo acepta el enlace del correo si la encuentra (ver esa ruta).
export const COOKIE_ENLACE = "enrenta_enlace";

export function marcarEnlacePedido() {
  const seguro = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${COOKIE_ENLACE}=1; Max-Age=86400; Path=/; SameSite=Lax${seguro}`;
}

// Avisos de la portada de entrada según cómo terminó el enlace del correo.
export const AVISOS_ENLACE: Record<string, string> = {
  vencido: "No pudimos abrir tu sesión con ese enlace. Si ya confirmaste tu correo, entra con tu contraseña.",
  otro: "Por seguridad, abre el enlace en el mismo navegador donde lo pediste. Si ya confirmaste tu correo, entra con tu contraseña.",
};

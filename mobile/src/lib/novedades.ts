// Lo que trae ENRENTA completa (el modelo full, que vive en la rama modelo-full de git).
// Copia de web/src/lib/novedades.ts (se muestra en Cómo funciona).

export type Novedad = { titulo: string; texto: string; icono: string }; // icono: trazo SVG de 24×24

export const NOVEDADES_FULL: Novedad[] = [
  {
    titulo: "Pago protegido",
    texto: "Pagas en ENRENTA y la compañía recibe el dinero cuando devuelves el equipo sin novedades.",
    icono: "M12 3 19 6v6c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6zM9 12l2.2 2.2L15.5 10",
  },
  {
    titulo: "Depósito en garantía",
    texto: "ENRENTA guarda el depósito y te lo devuelve automáticamente al cerrar la renta.",
    icono: "M4 8h15a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4zM4 8l2.5-3.5h11L19 8M15.5 13.5h2",
  },
  {
    titulo: "Entregas con fotos",
    texto: "Salida, recepción, devolución y revisión final con fotos y lista de chequeo para ambas partes.",
    icono: "M4 8.5h3.2l1.8-2.5h6l1.8 2.5H20V19H4zM12 16.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6z",
  },
  {
    titulo: "Casos con respaldo",
    texto: "¿Daño, faltante o retraso? Abres un caso y ENRENTA media con las fotos de cada paso.",
    icono: "M4.5 13a7.5 7.5 0 0 1 15 0M4.5 13v3.5A1.5 1.5 0 0 0 6 18h1.5v-5.5H6M19.5 13v3.5A1.5 1.5 0 0 1 18 18h-1.5v-5.5H18",
  },
  {
    titulo: "Chat en ENRENTA",
    texto: "Coordina con la compañía sin compartir tu número, con avisos automáticos de cada paso.",
    icono: "M4 5.5h16v10H9.5L5 19.5v-4H4zM8 9.5h8M8 12.5h5",
  },
  {
    titulo: "Comprobantes y liquidaciones",
    texto: "Documentos en PDF para clientes y compañías, listos para la contabilidad.",
    icono: "M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6",
  },
];

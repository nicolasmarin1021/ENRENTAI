// Sección que todavía no existe: explica qué va a tener.
export function Proximamente({ titulo, texto, puntos }: { titulo: string; texto: string; puntos: string[] }) {
  return (
    <section className="page-mid">
      <div className="empty proximamente">
        <span className="tag">Próximamente</span>
        <h1 className="title-lg">{titulo}</h1>
        <p className="muted">{texto}</p>
        <ul className="lista-proximamente">
          {puntos.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </div>
    </section>
  );
}

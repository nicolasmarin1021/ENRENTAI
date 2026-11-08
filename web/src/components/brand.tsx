// Marca de ENRENTA: el ícono de señal dentro de un cuadro lavanda.
export function BrandMark({ size = "md" }: { size?: "md" | "lg" }) {
  const px = size === "lg" ? 30 : 20;
  return (
    <span className={size === "lg" ? "brand-mark lg" : "brand-mark"} aria-hidden="true">
      <svg viewBox="0 0 32 32" width={px} height={px} fill="none" stroke="currentColor" strokeWidth={2.8} strokeLinecap="round">
        <circle cx="16" cy="18" r="3" fill="currentColor" stroke="none" />
        <path d="M11.5 13.5a6.4 6.4 0 0 0 0 9M20.5 13.5a6.4 6.4 0 0 1 0 9M7.6 9.6a11.9 11.9 0 0 0 0 16.8M24.4 9.6a11.9 11.9 0 0 1 0 16.8" />
      </svg>
    </span>
  );
}

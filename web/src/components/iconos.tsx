// Íconos de categorías de equipo (los mismos trazos del prototipo de ENRENTA).
const TRAZOS: Record<string, React.ReactNode> = {
  mic: (
    <>
      <circle cx="12" cy="6" r="3.5" />
      <path d="M9.6 9.2 10.8 21h2.4l1.2-11.8" />
      <path d="M10.2 13.5h3.6" />
    </>
  ),
  iem: (
    <>
      <rect x="4" y="8" width="9" height="13" rx="1.6" />
      <path d="M6.5 8V3" />
      <path d="M13 14c3.2 0 4.2-2.2 4.2-4.6" />
      <circle cx="17.2" cy="7" r="2.2" />
      <path d="M7 17h3" />
    </>
  ),
  antena: (
    <>
      <path d="M12 13v8M8.5 21h7" />
      <path d="M12 13 7 3h10z" />
      <path d="M9.5 8h5" />
    </>
  ),
  coord: (
    <>
      <path d="M3 20h18" />
      <path d="m4 17 2-5 2 3 2-8 2 6 2-3 2 5 2-9 2 11" />
    </>
  ),
  consola: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="M7 8v8M12 8v8M17 8v8" />
      <path d="M5.6 11.5h2.8M10.6 14h2.8M15.6 10h2.8" />
    </>
  ),
  pa: (
    <>
      <path d="M5.5 3h13l-1.2 4H6.7z" />
      <path d="M6.8 8.5h10.4l-1 3.8H7.8z" />
      <path d="M8 13.8h8l-.8 3.6H8.8z" />
      <path d="M12 17.5V21" />
    </>
  ),
  monitor: (
    <>
      <path d="M3 18 9.5 7H21v11z" />
      <circle cx="15.2" cy="12.8" r="3" />
    </>
  ),
  intercom: (
    <>
      <path d="M5 13v-1a7 7 0 0 1 14 0v1" />
      <rect x="3" y="13" width="4" height="6" rx="1" />
      <rect x="17" y="13" width="4" height="6" rx="1" />
      <path d="M19 19c0 1.6-2 2.5-5 2.5" />
    </>
  ),
};

export function IconoCategoria({ cat, size = 20 }: { cat: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRAZOS[cat] ?? TRAZOS.mic}
    </svg>
  );
}

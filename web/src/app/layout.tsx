import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";
import Link from "next/link";
import { Suspense } from "react";
import { AbrirAnuncio, AnuncioFull } from "@/components/anuncio-full";
import { Logo } from "@/components/brand";
import { SesionHdr } from "@/components/sesion-hdr";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "ENRENTA", template: "%s · ENRENTA" },
  description: "Renta de equipos de audio y RF para shows en Medellín, entre productoras y compañías verificadas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={spaceGrotesk.variable}>
      <body>
        <header className="hdr">
          <div className="wrap hdr-row">
            <Link href="/" className="brand" aria-label="ENRENTA, ir al inicio">
              <Logo className="brand-logo" />
              <span className="beta" title="Versión de prueba: ENRENTA conecta, el pago se acuerda por WhatsApp">
                BETA
              </span>
              <span className="brand-sub">Renta de equipos para espectáculos</span>
            </Link>
            {/* Interruptor de modo, cuenta y pestañas: dependen de la sesión y de la página. */}
            <Suspense fallback={null}>
              <SesionHdr />
            </Suspense>
          </div>
        </header>
        <main className="wrap site-main">{children}</main>
        <footer className="wrap site-foot">
          ENRENTA BETA · Medellín, Colombia · <Link href="/como-funciona">Cómo funciona y condiciones de la BETA</Link> ·{" "}
          <AbrirAnuncio />
        </footer>
        {/* Anuncio de lo que trae ENRENTA completa: sale una vez al entrar. */}
        <AnuncioFull />
      </body>
    </html>
  );
}

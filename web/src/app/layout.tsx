import type { Metadata } from "next";
import { Figtree } from "next/font/google";
import Link from "next/link";
import { BrandMark } from "@/components/brand";
import "./globals.css";

const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "ENRENTA", template: "%s · ENRENTA" },
  description: "Renta de equipos de audio y RF para shows en Medellín, entre productoras y compañías verificadas.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className={figtree.variable}>
      <body>
        <header className="site-hdr">
          <div className="wrap site-hdr-in">
            <Link href="/" className="brand" aria-label="ENRENTA, ir al inicio">
              <BrandMark />
              <span className="brand-txt">
                <span className="brand-name">ENRENTA</span>
                <span className="brand-sub">Renta de audio y RF · Medellín</span>
              </span>
            </Link>
            <span className="stage-pill">Versión en construcción</span>
          </div>
        </header>
        <main className="wrap site-main">{children}</main>
        <footer className="wrap site-foot">ENRENTA · Medellín, Colombia</footer>
      </body>
    </html>
  );
}

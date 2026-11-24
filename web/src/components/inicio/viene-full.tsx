import { AbrirAnuncio } from "@/components/anuncio-full";
import { NOVEDADES_FULL } from "@/lib/novedades";
import { Ico, v } from "./piezas";
import s from "./inicio.module.css";

// Portada · adelanto de ENRENTA completa: una tarjeta oscura con borde de luz que gira y las
// novedades encendiéndose una por una. El botón abre el anuncio con todos los detalles.
export function VieneFull() {
  return (
    <section className={`${s.viene} ${s.revela}`} aria-labelledby="inicio-viene">
      <div className={s.vieneMarco}>
        <div className={s.vieneCaja}>
          <div className={s.vieneTxt}>
            <span className={s.pill}>
              <i aria-hidden="true" />
              Próximamente
            </span>
            <h2 id="inicio-viene">
              Viene ENRENTA <span>completa</span>
            </h2>
            <p>Pagas en ENRENTA, el equipo sale y vuelve con fotos y, si algo falla, te respaldamos.</p>
            <span className={s.prueba}>
              <span className={s.carga} aria-hidden="true" />
              En pruebas internas
            </span>
            <AbrirAnuncio texto="Ver todo lo que viene" className={`btn lg ${s.botonClaro}`} />
          </div>
          <ul className={s.novedades}>
            {NOVEDADES_FULL.map((n, i) => (
              <li key={n.titulo} className={s.novedad} style={v({ "--i": i })}>
                <span className={s.novedadIco}>
                  <Ico d={n.icono} size={20} grueso={1.7} />
                </span>
                <b>{n.titulo}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

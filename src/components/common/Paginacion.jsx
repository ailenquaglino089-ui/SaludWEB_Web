// Importamos React y los hooks que usa el componente.
import React, { useEffect, useState } from 'react';
// Importamos los estilos propios de la paginación.
import './Paginacion.css';

/**
 * Componente reutilizable de paginación para los listados.
 *
 * Props:
 *  - pagina: número de página actual (empieza en 1)
 *  - porPagina: cantidad de items por página
 *  - total: cantidad total de registros que coinciden con el listado
 *  - totalPaginas: cantidad total de páginas
 *  - onCambiarPagina: función a llamar con el nuevo número de página
 *
 * POR QUÉ EL COMPONENTE MIDE EL ANCHO
 *
 * La guía de diseño responsive exige áreas táctiles de 44x44px en los botones.
 * Eso tiene un costo que no es obvious: con 44px más el gap, cada botón de
 * página ocupa unos 48px, y el listado puede tener hasta 9 controles
 * (primera, última, dos flechas, dos separadores "…" y cinco números). En una
 * pantalla de 375px eso da ~432px: se desborda.
 *
 * Las dos salidas posibles eran malas: achicar los botones (rompe el objetivo
 * táctil, que es justo lo que se quiere proteger) o dejar que salten de línea
 * en tres filas (lleno de feo y confuso). La que se eligió es la tercera:
 * mostrar menos páginas en pantallas chicas. En mobile se reduce la ventana
 * alrededor de la página actual, y el usuario sigue viendo totalPaginas en el
 * texto "Mostrando X–Y de Z" y sabe cuántas hay.
 *
 * El tradeoff es que en mobile no se puede saltar a una página lejana con un
 * toque. Se acepta: en un celular el scroll vertical ya es un obstáculo, y
 * agregar "ir a la primera/última" sería más UI que el problema original.
 */
export default function Paginacion({ pagina, porPagina, total, totalPaginas, onCambiarPagina }) {
  // Ventana de páginas a mostrar según el ancho disponible.
  // En desktop se ven 2 páginas a cada lado; en mobile solo 1, para que entre
  // todo en una fila.
  const [radio, setRadio] = useState(2);

  // matchMedia es la forma correcta de preguntar por el ancho: dispara el
  // callback cuando el usuario rota el dispositivo, no solo al montar.
  // Se usa el mismo umbral que el resto de la app (768px).
  useEffect(() => {
    const consulta = window.matchMedia('(max-width: 768px)');
    const actualizar = () => setRadio(consulta.matches ? 1 : 2);
    actualizar();
    consulta.addEventListener('change', actualizar);

    // Se saca el listener al desmontar: si no, cada cambio de página dejaría
    // un listener acumulado y el móvil se pondría lento a la larga.
    return () => consulta.removeEventListener('change', actualizar);
  }, []);

  // Si hay 0 o 1 página los controles no aportan nada: no se renderizan.
  //
  // OJO: este return va DESPUÉS de los hooks, a propósito. Si se pusiera antes,
  // el componente ejecutaría 0 hooks cuando totalPaginas es 1 y 2 cuando es
  // mayor, y React lanzaría "Rendered fewer hooks than expected" en el momento
  // exacto en que el listado pasa a una sola página. Los hooks siempre arriba.
  if (totalPaginas <= 1) return null;

  // Rango visible: "Mostrando 1-10 de 117". Si no hay registros, empieza en 0.
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  // Nunca se supera el total (la última página puede tener menos items).
  const hasta = Math.min(pagina * porPagina, total);

  // Genera la lista de botones de página, colapsando rangos largos con "…".
  // Siempre la primera y la última página, más las `radio` anteriores y
  // posteriores a la actual.
  const numeros = [];
  for (let p = 1; p <= totalPaginas; p++) {
    const visible = p === 1 || p === totalPaginas || Math.abs(p - pagina) <= radio;
    if (visible) {
      numeros.push(p);
    } else if (numeros[numeros.length - 1] !== '…') {
      numeros.push('…'); // Un solo separador entre rangos
    }
  }

  return (
    // <nav> le dice al lector de pantalla "esto es navegación", que es lo que
    // es. Sin el landmark, un usuario de TalkBack saltearía los botones.
    <nav className="paginacion" aria-label="Paginación de resultados">
      {/* Texto informativo del rango visible.
          aria-live para que el cambio de página se anuncie: si no, al pulsar
          "Siguiente" el usuario de lector de pantalla no se entera de nada. */}
      <span className="paginacion-info" aria-live="polite">
        Mostrando {desde}–{hasta} de {total}
      </span>

      {/* Botones de navegación entre páginas */}
      <div className="paginacion-botones">
        <button
          type="button"
          className="btn btn-sm"
          // En la primera página el botón Anterior no tiene sentido: deshabilitado
          disabled={pagina === 1}
          onClick={() => onCambiarPagina(pagina - 1)}
          // El texto "← Anterior" no dice a qué página lleva, así que el
          // aria-label lo completa.
          aria-label="Ir a la página anterior"
        >
          ← Anterior
        </button>

        {/* Números de página / separadores */}
        {numeros.map((item, index) =>
          item === '…' ? (
            // El separador no es un botón: es solo texto.
            // aria-hidden porque si no el lector anuncia "puntos suspensivos"
            // entre los números, que es ruido.
            <span key={`sep-${index}`} className="paginacion-ellipsis" aria-hidden="true">…</span>
          ) : (
            <button
              key={item}
              type="button"
              // La página actual se resalta con el estilo primario
              className={`btn btn-sm ${item === pagina ? 'btn-primary' : ''}`}
              onClick={() => onCambiarPagina(item)}
              // aria-current le dice al lector de pantalla "este es el botón
              // de la página en la que estás", que el resaltado de color solo
              // le dice a quien ve la pantalla.
              aria-current={item === pagina ? 'page' : undefined}
              aria-label={`Ir a la página ${item}`}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          className="btn btn-sm"
          // En la última página el botón Siguiente no tiene sentido: deshabilitado
          disabled={pagina === totalPaginas}
          onClick={() => onCambiarPagina(pagina + 1)}
          aria-label="Ir a la página siguiente"
        >
          Siguiente →
        </button>
      </div>
    </nav>
  );
}

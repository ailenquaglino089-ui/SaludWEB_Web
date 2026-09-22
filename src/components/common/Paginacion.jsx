// Importamos React para crear el componente.
import React from 'react';
// Importamos los estilos propios de la paginación.
import './Paginacion.css';

// Componente reutilizable de paginación para los listados.
// Recibe los datos del resultado paginado y un callback para cambiar de página.
// Props:
//  - pagina: número de página actual (empieza en 1)
//  - porPagina: cantidad de items por página
//  - total: cantidad total de registros que coinciden con el listado
//  - totalPaginas: cantidad total de páginas
//  - onCambiarPagina: función a llamar con el nuevo número de página
export default function Paginacion({ pagina, porPagina, total, totalPaginas, onCambiarPagina }) {
  // Si hay 0 o 1 página los controles no aportan nada: no se renderizan.
  if (totalPaginas <= 1) return null;

  // Rango visible: "Mostrando 1-10 de 117". Si no hay registros, empieza en 0.
  const desde = total === 0 ? 0 : (pagina - 1) * porPagina + 1;
  // Nunca se supera el total (la última página puede tener menos items).
  const hasta = Math.min(pagina * porPagina, total);

  // Genera la lista de botones de página, colapsando rangos largos con "…".
  // Estrategia: siempre la primera y la última página, más las 2 anteriores
  // y posteriores a la actual (evita decenas de botones cuando hay muchas páginas).
  const numeros = [];
  for (let p = 1; p <= totalPaginas; p++) {
    const visible = p === 1 || p === totalPaginas || Math.abs(p - pagina) <= 2;
    if (visible) {
      numeros.push(p);
    } else if (numeros[numeros.length - 1] !== '…') {
      numeros.push('…'); // Un solo separador entre rangos
    }
  }

  return (
    <div className="paginacion">
      {/* Texto informativo del rango visible */}
      <span className="paginacion-info">
        Mostrando {desde}–{hasta} de {total}
      </span>

      {/* Botones de navegación entre páginas */}
      <div className="paginacion-botones">
        <button
          className="btn btn-sm"
          // En la primera página el botón Anterior no tiene sentido: deshabilitado
          disabled={pagina === 1}
          onClick={() => onCambiarPagina(pagina - 1)}
        >
          ← Anterior
        </button>

        {/* Números de página / separadores */}
        {numeros.map((item, index) =>
          item === '…' ? (
            // El separador no es un botón: es solo texto
            <span key={`sep-${index}`} className="paginacion-ellipsis">…</span>
          ) : (
            <button
              key={item}
              // La página actual se resalta con el estilo primario
              className={`btn btn-sm ${item === pagina ? 'btn-primary' : ''}`}
              onClick={() => onCambiarPagina(item)}
            >
              {item}
            </button>
          )
        )}

        <button
          className="btn btn-sm"
          // En la última página el botón Siguiente no tiene sentido: deshabilitado
          disabled={pagina === totalPaginas}
          onClick={() => onCambiarPagina(pagina + 1)}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
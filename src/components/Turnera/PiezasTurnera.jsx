// ============================================================
// Piezas de interfaz compartidas por el módulo Turnera
// ============================================================
// Se separan en su propio archivo porque las usan las cuatro pantallas del
// módulo (catálogo, agenda, reserva y mis turnos). Duplicar el bloque de
// "cargando" cuatro veces haría que un cambio de estilo se aplicara solo en
// algunos lugares, que es la forma habitual de que una interfaz quede
// inconsistente sin que nadie se dé cuenta.
// ============================================================

import './Turnera.css';
// Los estilos del módulo se importan una sola vez desde acá. El resto de los
// componentes del módulo también los importan, pero como el navegador ignora
// los imports repetidos del mismo archivo, no se carga dos veces.

/**
 * Indicador de carga con mensaje.
 *
 * @param {string} texto Texto a mostrar debajo del spinner.
 * @param {object} [opciones]
 * @param {boolean} [opciones.discreto=false] Si es true no muestra el spinner,
 *        solo el texto (para actualizaciones que no deben tapar la pantalla).
 */
export function Cargando({ texto = 'Cargando...', discreto = false }) {
  return (
    <div className={discreto ? 'actualizacion-info' : 'turnera-cargando'}>
      {/* Spinner salvo que sea discreto */}
      {!discreto && <div className="spinner" aria-hidden="true" />}
      {/* aria-hidden: el spinner es decorativo. Si no se ocultara, un lector
          de pantalla anunciaría "elemento gráfico" antes del texto real, que
          es ruido para quien está usando el lector de pantalla */}
      <p>{texto}</p>
    </div>
  );
}

/**
 * Mensaje de estado: error, información o éxito.
 *
 * Se marca con role="alert" cuando es un error porque es lo que hace que un
 * lector de pantalla lo anuncie de inmediato sin que el usuario tenga que
 * navegar hasta él. Sin ese atributo, el mensaje de error aparecía en
 * pantalla y para quien usa lector de pantalla simplemente no existía.
 *
 * @param {string} tipo 'error' | 'info' | 'exito'
 * @param {string} texto Mensaje a mostrar.
 */
export function Aviso({ tipo = 'info', texto }) {
  if (!texto) {
    return null;
    // Sin texto no se renderiza nada: evita dejar un recuadro vacío.
  }

  return (
    <div
      className={`aviso aviso-${tipo}`}
      // 'alert' para errores: se anuncia al instante y de forma insistente.
      // Para info y exito se usa 'status', que es el rol pensado para mensajes
      // informativos que no necesitan interrumpir lo que el lector está
      // leyendo.
      role={tipo === 'error' ? 'alert' : 'status'}
    >
      <p className="aviso-texto">{texto}</p>
    </div>
  );
}

/**
 * Mensaje de "no hay nada para mostrar", con la acción opcional de reintentar.
 *
 * @param {string} texto Explicación de por qué está vacío.
 * @param {string} [textoBoton] Texto del botón de reintento (si no se pasa, no se muestra).
 * @param {Function} [alReintentar] Función que se invoca al pulsar el botón.
 * @param {string} [icono] Emoji a mostrar arriba.
 */
export function Vacio({ texto, textoBoton, alReintentar, icono = '📭' }) {
  return (
    <div className="vacio">
      {/* aria-hidden por la misma razón que en Cargando: es decorativo */}
      <span className="vacio-icono" aria-hidden="true">{icono}</span>
      <p>{texto}</p>
      {/* El botón de reintentar solo aparece si le pasaron la función */}
      {textoBoton && alReintentar && (
        <button type="button" className="btn-turnera btn-secundario" onClick={alReintentar}>
          {textoBoton}
        </button>
      )}
    </div>
  );
}

/**
 * Indicador de actualización automática.
 *
 * Muestra hace cuánto se actualizó la última vez y un punto verde que late
 * mientras la pantalla se refresca sola. Sin esto, una pantalla que se
 * actualiza por polling da la impresión de estar "clavada": el usuario no
 * tiene forma de saber si lo que ve está al día o congelado hace un minuto.
 *
 * @param {Date|null} ultimaActualizacion Fecha de la última respuesta.
 * @param {Function} alActualizar Función del botón "Actualizar".
 * @param {number} segundos Segundos transcurridos (los calcula useSegundosDesde).
 * @param {boolean} refrescando true mientras hay una recarga en curso.
 */
export function IndicadorActualizacion({ ultimaActualizacion, alActualizar, segundos, refrescando }) {
  if (!ultimaActualizacion) {
    return null;
    // Todavía no llegó la primera respuesta: no hay nada que fechar.
  }

  return (
    <div className="actualizacion-info">
      {/* El punto late solo si hay datos: antes de la primera respuesta no
          hay nada "vivo" que mostrar, y un punto verde sobre una pantalla
          vacía sería engañoso */}
      <span
        className={`punto-vivo ${refrescando ? 'animando' : ''}`}
        aria-hidden="true"
      />
      <span>
        {/* Texto del último refresco. El <time> con dateTime permite que el
            dato sea legible por máquinas y por lectores de pantalla */}
        Actualizado{' '}
        <time dateTime={ultimaActualizacion.toISOString()}>
          {segundos === 0 ? 'hace instantes' : `hace ${segundos} s`}
        </time>
      </span>
      <button
        type="button"
        className="btn-turnera btn-secundario btn-chico"
        onClick={alActualizar}
        disabled={refrescando}
      >
        {refrescando ? 'Actualizando...' : 'Actualizar ahora'}
      </button>
    </div>
  );
}

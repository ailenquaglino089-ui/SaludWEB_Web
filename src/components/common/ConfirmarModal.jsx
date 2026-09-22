// Importamos React y el hook useState para manejar el estado de procesamiento.
import React, { useState } from 'react';
// Importamos los estilos propios del modal.
import './ConfirmarModal.css';

// Modal de confirmación reutilizable (guía CRUD: "Modal de Confirmación").
// En lugar del confirm() nativo, muestra qué se va a eliminar y exige una
// confirmación activa. Además bloquea el botón mientras la petición está en
// vuelo (guía: "Prevención de Doble Clic") y lo re-habilita si falla.
// Props:
//  - abierto: si el modal está visible
//  - titulo: título de la ventana
//  - mensaje: descripción exacta de la acción (ej: qué registro se elimina)
//  - textoConfirmar: texto del botón de confirmación (por defecto "Eliminar")
//  - onConfirmar: función ASYNC a ejecutar al confirmar (hace el DELETE y
//                 cierra el modal en éxito; si lanza error, el modal queda
//                 abierto y el botón se re-habilita para reintentar)
//  - onCancelar: cierra el modal
export default function ConfirmarModal({ abierto, titulo, mensaje, textoConfirmar = 'Eliminar', onConfirmar, onCancelar }) {
  // Estado que indica si la operación está en curso (bloquea ambos botones).
  const [procesando, setProcesando] = useState(false);

  // Handler del botón de confirmación.
  const handleConfirmar = async () => {
    // Guardia anti doble clic: si ya se está procesando, ignoramos el nuevo clic.
    if (procesando) return;
    // Bloqueamos la confirmación mientras viaja la petición HTTP.
    setProcesando(true);
    try {
      // Ejecuta la acción del padre (DELETE + recarga + cierre en éxito).
      await onConfirmar();
    } catch (error) {
      // El padre ya mostró el error; el modal queda abierto para reintentar.
    } finally {
      // Se re-habilita el botón (o el modal quedó cerrado: no afecta).
      setProcesando(false);
    }
  };

  // Si el modal no está abierto no se renderiza nada.
  if (!abierto) return null;

  return (
    // Fondo oscuro que cubre la pantalla; al hacer clic fuera se cancela.
    <div className="modal-fondo" onClick={() => { if (!procesando) onCancelar(); }}>
      {/* Caja del modal. role="alertdialog" + aria-modal dan accesibilidad. */}
      <div className="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-titulo" onClick={(e) => e.stopPropagation()}>
        <h3 id="modal-titulo">{titulo}</h3>
        {/* Mensaje con la descripción exacta de la acción (qué se elimina). */}
        <p>{mensaje}</p>
        <div className="modal-acciones">
          {/* Cancelar: deshabilitado mientras se procesa para no dejar la operación a medias */}
          <button className="btn btn-secondary" onClick={onCancelar} disabled={procesando}>
            Cancelar
          </button>
          {/* Confirmar: deshabilitado mientras procesa (anti doble clic) */}
          <button className="btn btn-danger" onClick={handleConfirmar} disabled={procesando}>
            {procesando ? '⏳ Procesando…' : textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  );
}
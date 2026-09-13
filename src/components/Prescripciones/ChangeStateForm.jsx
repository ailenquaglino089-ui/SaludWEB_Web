// Importamos React y el hook useState para manejar el estado del selector de estado.
import React, { useState } from 'react';
// Importamos los estilos CSS de Prescripciones.
import './Prescripciones.css';

// Componente para cambiar el estado de una prescripción (vencida, dispensada, cancelada, etc.).
// Props: prescripcion (objeto con los datos a mostrar), onGuardar (callback que recibe el nuevo estado), onCancelar (callback al cancelar).
export default function ChangeStateForm({ prescripcion, onGuardar, onCancelar }) {
  // Estado del nuevo estado elegido; se inicializa con el estado actual de la prescripción.
  const [nuevoEstado, setNuevoEstado] = useState(prescripcion.estado);

  // Handler del envío del formulario.
  const handleSubmit = (e) => {
    // Evitamos la recarga de página por defecto del navegador.
    e.preventDefault();
    // Solo tiene sentido guardar si el usuario cambió realmente el estado.
    if (nuevoEstado !== prescripcion.estado) {
      // Si cambió, invocamos onGuardar con el nuevo estado elegido.
      onGuardar(nuevoEstado);
    } else {
      // Si no hubo cambios, cancelamos y volvemos a la lista.
      onCancelar();
    }
  };

  return (
    // Contenedor con las mismas clases de lista para mantener coherencia visual.
    <div className="lista-container">
      {/* Cabecera del formulario */}
      <div className="lista-header">
        <h1>🔄 Cambiar Estado de Prescripción</h1>
      </div>

      {/* Formulario que dispara handleSubmit al enviarse */}
      <form className="formulario" onSubmit={handleSubmit}>
        {/* Bloque informativo con los datos de la prescripción */}
        <div className="form-info">
          {/* Lista de medicamentos convertida a texto separado por comas: el || [] evita errores si es null */}
          <p><strong>Medicamentos:</strong> {(prescripcion.medicamentos || []).map(m => m.nombre).join(', ')}</p>
          {/* Nombre del paciente asociado */}
          <p><strong>Paciente:</strong> {prescripcion.nombre_paciente}</p>
          {/* Nombre del médico que prescribió */}
          <p><strong>Médico:</strong> {prescripcion.nombre_medico}</p>
          {/* Estado actual resaltado en un badge azul */}
          <p><strong>Estado Actual:</strong> <span className="estado-actual">{prescripcion.estado}</span></p>
        </div>

        {/* Grupo del selector de nuevo estado */}
        <div className="form-grupo">
          <label>Nuevo Estado *</label>
          {/* Select controlado por el estado nuevoEstado: cada cambio de opción lo actualiza */}
          <select
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value)}
          >
            {/* Cada opción tiene como value el código de estado del backend */}
            <option value="activa">✓ Activa</option>
            <option value="vencida">⚠ Vencida</option>
            <option value="dispensada">✓ Dispensada</option>
            <option value="cancelada">✗ Cancelada</option>
          </select>
        </div>

        {/* Acciones del formulario: botones de confirmar y cancelar */}
        <div className="form-acciones">
          {/* Botón submit que guarda el cambio de estado */}
          <button type="submit" className="btn btn-primary">
            ✓ Cambiar Estado
          </button>
          {/* Botón tipo "button" (no submit) que cancela sin enviar el form */}
          <button type="button" className="btn btn-secondary" onClick={onCancelar}>
            ✕ Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
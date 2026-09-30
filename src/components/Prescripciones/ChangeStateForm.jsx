// ============================================================
// ChangeStateForm.jsx - Cambio de estado de una prescripción
// ============================================================
// Pantalla intermedia entre la lista de prescripciones y el guardado. Muestra
// de qué prescripción se trata para que el cambio sea auditable antes de
// confirmarlo, y deja elegir el estado destino.
//
// No es un <select> genérico sobre un campo más: cambiar el estado de una
// prescripción es una acción con consecuencias clínicas y administrativas
// (una dispensada ya no se puede entregar, una cancelada deja de contar), así
// que el formulario obliga a ver los datos primero. Por eso el submit es un
// <form> y no un <button onClick>: el flujo es Explorar, Confirmar, Guardar.
import React, { useState } from 'react';
import './Prescripciones.css';

// Props:
//  - prescripcion: objeto con los datos a mostrar y su estado actual.
//  - onGuardar: callback que recibe el nuevo estado. Lo recibe el padre, que
//    es quien habla con la API. Este componente no conoce el endpoint a
//    propósito: así el formulario se puede testear sin mockear la red.
//  - onCancelar: callback al cancelar, sin guardar nada.
export default function ChangeStateForm({ prescripcion, onGuardar, onCancelar }) {
  // Estado inicial: el estado ACTUAL de la prescripción, no un valor por
  // defecto como "activa". Arranca en el valor real para que el select no
  // sugiera un cambio que la persona no pidió, y para que el botón de
  // confirmar quede sin efecto hasta que elija algo distinto.
  //
  // Fragilidad conocida: el <select> solo conoce los cuatro valores de
  // ESTADOS_DEFINIDOS. Si el backend llegara a devolver un estado fuera de esa
  // lista, el select quedaría visualmente en blanco (value sin option que lo
  // corresponda) y se vería como un select vacío. Cuando se agregue un estado
  // nuevo en el backend hay que agregarlo también acá, o leer el catálogo de
  // estados desde la API en vez de hardcodearlo.
  const [nuevoEstado, setNuevoEstado] = useState(prescripcion.estado);

  const handleSubmit = (e) => {
    // El submit por defecto recargaría la página y se perdería el estado de
    // la aplicación.
    e.preventDefault();

    // Guardar y no-seleccionar-nada se tratan como la misma cosa, y a
    // propósito: el botón dice "Cambiar Estado" y al pulsarlo sin haber
    // elegido nada, lo más honesto es cerrar el formulario sin tocar nada.
    // La alternativa (dejar el botón deshabilitado) obligaría a agregar
    // estado extra para el caso "no hay nada que guardar" y llevaría al
    // mismo resultado. onCancelar devuelve al usuario a la lista sin
    // escribir en la base, que es lo que espera al prescriptivear sin
    // cambiar nada.
    if (nuevoEstado !== prescripcion.estado) {
      onGuardar(nuevoEstado);
    } else {
      onCancelar();
    }
  };

  return (
    <div className="lista-container">
      <div className="lista-header">
        <h1>🔄 Cambiar Estado de Prescripción</h1>
      </div>

      <form className="formulario" onSubmit={handleSubmit}>
        {/* Datos de la prescripción: se muestran para que el cambio se pueda
            verificar contra lo que la persona recuerda haber hecho. */}
        <div className="form-info">
          {/* El || [] no es decorativo: medicamentos llega como array del
              backend, y un join sobre null rompe el render completo de la
              pantalla, no solo esta línea. */}
          <p><strong>Medicamentos:</strong> {(prescripcion.medicamentos || []).map(m => m.nombre).join(', ')}</p>
          <p><strong>Paciente:</strong> {prescripcion.nombre_paciente}</p>
          <p><strong>Médico:</strong> {prescripcion.nombre_medico}</p>
          <p><strong>Estado Actual:</strong> <span className="estado-actual">{prescripcion.estado}</span></p>
        </div>

        <div className="form-grupo">
          {/* htmlFor / id van emparejados: sin eso, hacer clic en el texto
              "Nuevo Estado" no enfoca el select, y un lector de pantalla no
              anuncia qué campo se está modificando. */}
          <label htmlFor="prescripcion-nuevo-estado">Nuevo Estado *</label>
          <select
            id="prescripcion-nuevo-estado"
            value={nuevoEstado}
            onChange={(e) => setNuevoEstado(e.target.value)}
          >
            {/* Los value son los códigos que espera el backend. Los emojis
                van DENTRO de la etiqueta, nunca en el value: un value con
                emoji llegaría al servidor como un estado desconocido.
                Los cuatro estados se ofrecen siempre, sin filtrar por el
                actual, porque el backend es quien decide si una
                transición es válida y rechaza las que no lo son. Filtrar acá
                duplicaría esa regla y se desincronizaría apenas el backend
                cambie sus transiciones. */}
            <option value="activa">✓ Activa</option>
            <option value="vencida">⚠ Vencida</option>
            <option value="dispensada">✓ Dispensada</option>
            <option value="cancelada">✗ Cancelada</option>
          </select>
        </div>

        <div className="form-acciones">
          <button type="submit" className="btn btn-primary">
            ✓ Cambiar Estado
          </button>
          {/* type="button" es obligatorio acá: dentro de un <form>, un
              <button> sin type es submit por defecto, y el botón "Cancelar"
              guardaría el cambio en vez de cerrar el formulario. */}
          <button type="button" className="btn btn-secondary" onClick={onCancelar}>
            ✕ Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

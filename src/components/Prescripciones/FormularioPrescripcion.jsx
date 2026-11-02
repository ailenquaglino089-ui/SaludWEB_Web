// Importamos React y los hooks useState y useEffect para el manejo de estado y ciclo de vida.
import React, { useState, useEffect } from 'react';
// Importamos la instancia de axios configurada (base URL + interceptores de token y 401).
import client from '../../api/client';
// Importamos getDatos para desempacar las listas de pacientes y médicos que devuelve la API.
import { getDatos } from '../../utils/crudHelpers';
// Importamos los estilos CSS de Prescripciones.
import './Prescripciones.css';

// Componente de formulario para crear/editar prescripciones.
// Props: prescripcion (objeto a editar o null si es alta nueva), onGuardar (callback al guardar), onCancelar (callback al cancelar).
export default function FormularioPrescripcion({ prescripcion, onGuardar, onCancelar }) {
  // Estado inicial del formulario con valores por defecto.
  const [formData, setFormData] = useState({
    id_paciente: '',                    // Id del paciente seleccionado
    id_medico: '',                      // Id del médico seleccionado
    medicamentos: [{ nombre: '', dosis: '' }], // Lista dinámica de medicamentos (empieza con una fila vacía)
    indicaciones: '',                   // Instrucciones de administración
    fecha_vencimiento: '',              // Fecha de vencimiento de la receta
    estado: 'activa'                    // Estado inicial de una prescripción nueva
  });

  // Estado con la lista de pacientes disponibles para el selector.
  const [pacientes, setPacientes] = useState([]);
  // Estado con la lista de médicos disponibles para el selector.
  const [medicos, setMedicos] = useState([]);
  // Estado con los mensajes de error de validación (objeto {campo: mensaje}).
  const [errores, setErrores] = useState({});
  // Estado de carga: mientras se obtienen pacientes y médicos el formulario muestra un spinner.
  const [cargando, setCargando] = useState(true);

  // useEffect de montaje: carga los datos necesarios (pacientes y médicos) la primera vez.
  useEffect(() => {
    cargarDatos();
  }, []); // Dependencias vacías: se ejecuta una sola vez

  // useEffect: se ejecuta cuando la prop 'prescripcion' cambia.
  useEffect(() => {
    // Si llegó una prescripción (modo edición), precargamos sus datos en el formulario.
    if (prescripcion) {
      setFormData({
        // El operador ?? usa el valor de la derecha solo si es null/undefined
        id_paciente: prescripcion.id_paciente ?? '',
        id_medico: prescripcion.id_medico ?? '',
        // Si la prescripción trae medicamentos usamos esa lista; si no, creamos una fila vacía
        medicamentos: (prescripcion.medicamentos && prescripcion.medicamentos.length)
          ? prescripcion.medicamentos
          : [{ nombre: '', dosis: '' }],
        // El operador || usa el valor por defecto cuando el texto viene vacío o null
        indicaciones: prescripcion.indicaciones || '',
        fecha_vencimiento: prescripcion.fecha_vencimiento || '',
        estado: prescripcion.estado || 'activa'
      });
    }
  }, [prescripcion]); // Dependencia: solo reacciona a cambios en 'prescripcion'

  // Función asíncrona que carga pacientes y médicos en paralelo.
  const cargarListaCompleta = async (ruta) => {
    const items = [];
    let pagina = 1;
    let totalPaginas = 1;

    do {
      const response = await client.get(ruta, {
        params: { pagina, por_pagina: 100 }
      });
      const datos = getDatos(response, { items: [], total_paginas: 1 });
      const itemsPagina = Array.isArray(datos) ? datos : (datos.items || []);
      items.push(...itemsPagina);
      totalPaginas = Array.isArray(datos)
        ? 1
        : Math.max(1, Number(datos.total_paginas) || 1);
      pagina += 1;
    } while (pagina <= totalPaginas);

    return items;
  };

  const cargarDatos = async () => {
    try {
      // Promise.all ejecuta ambas peticiones a la vez para acelerar la carga inicial.
      const [listaPacientes, listaMedicos] = await Promise.all([
        // GET a /api/pacientes (para el selector de paciente). El endpoint es
        // paginado: se pide el máximo permitido y luego se lee data.items.
        cargarListaCompleta('/api/pacientes'),
        // GET a /api/medicos (para el selector de médico), también paginado.
        cargarListaCompleta('/api/medicos')
      ]);
      // getDatos devuelve la estructura paginada completa ({ items, total... }).
      // Antes se guardaba ese objeto en un estado que después se recorría con
      // .map(), lo que rompía el formulario y dejaba ambos selectores vacíos.
      setPacientes(listaPacientes);
      setMedicos(listaMedicos);
    } catch (err) {
      // Registramos el error en consola (no es crítico para el funcionamiento del form).
      console.error('Error cargando datos:', err);
    } finally {
      // Apagamos el spinner hayamos cargado o no.
      setCargando(false);
    }
  };

  // En edición, paciente y médico son datos de la receta original y no se
  // modifican: el backend ignora esos campos en el PUT. Solo se exigen al crear.
  const esEdicion = Boolean(prescripcion);

  // Función de validación de los campos obligatorios del formulario.
  const validar = () => {
    // Objeto de errores nuevo (vacío = sin errores).
    const newErrores = {};
    
    // Validación del paciente seleccionado.
    if (!formData.id_paciente) newErrores.id_paciente = 'Paciente requerido';
    // El médico solo es obligatorio en el alta. Las recetas antiguas pueden
    // tener id_medico nulo y tienen que poder editarse sin completarlo.
    if (!esEdicion && !formData.id_medico) newErrores.id_medico = 'Médico requerido';
    // Al menos un medicamento debe tener nombre (some comprueba si algún elemento lo cumple).
    const hayMedicamento = formData.medicamentos.some(m => m.nombre?.trim());
    // Si ninguna fila de medicamento tiene nombre, el formulario no es válido.
    if (!hayMedicamento) newErrores.medicamentos = 'Debe agregar al menos un medicamento';

    // Persistimos el objeto de errores en el estado.
    setErrores(newErrores);
    // El formulario es válido solo si no quedó ninguna clave en el objeto de errores.
    return Object.keys(newErrores).length === 0;
  };

  // Handler genérico de cambios para los campos simples del formulario (no medicamentos).
  const handleChange = (e) => {
    // Desestructuramos name y value del evento.
    const { name, value } = e.target;
    // Actualizamos formData preservando los otros campos (spread ...prev).
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Limpiar error de este campo
    // Si el campo tenía un error previo, se limpia apenas el usuario empieza a corregirlo.
    if (errores[name]) {
      setErrores(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handler específico para los inputs de la lista de medicamentos.
  const handleMedicamentoChange = (index, campo, value) => {
    // Actualizamos formData (incluida la lista de medicamentos).
    setFormData(prev => {
      // Mapeamos la lista: solo la fila 'index' se modifica en el 'campo' indicado.
      const medicamentos = prev.medicamentos.map((m, i) =>
        i === index ? { ...m, [campo]: value } : m
      );
      // Devolvemos formData con la nueva lista de medicamentos.
      return { ...prev, medicamentos };
    });
    // Si había error de medicamentos, se limpia al editar una fila.
    if (errores.medicamentos) {
      setErrores(prev => ({ ...prev, medicamentos: null }));
    }
  };

  // Función que agrega una fila de medicamento nueva al formulario.
  const agregarMedicamento = () => {
    setFormData(prev => ({
      ...prev,
      // Agregamos un objeto vacío al final de la lista actual (spread de la lista).
      medicamentos: [...prev.medicamentos, { nombre: '', dosis: '' }]
    }));
  };

  // Función que elimina una fila de medicamento según su índice.
  const quitarMedicamento = (index) => {
    setFormData(prev => ({
      ...prev,
      // filter elimina el elemento cuyo índice coincide (mantiene todos los demás).
      medicamentos: prev.medicamentos.filter((_, i) => i !== index)
    }));
  };

  // Handler del envío del formulario.
  const handleSubmit = (e) => {
    // Evitamos la recarga de página por defecto del navegador.
    e.preventDefault();
    // Solo si pasa la validación invocamos onGuardar con un payload limpio.
    if (validar()) {
      const payload = {
        // Filtramos las filas de medicamento que quedaron sin nombre (vacías incompletas).
        medicamentos: formData.medicamentos.filter(m => m.nombre?.trim()),
        indicaciones: formData.indicaciones,
        // Si no hay fecha se envía null (no '' ), respetando el contrato del backend.
        fecha_vencimiento: formData.fecha_vencimiento || null,
        estado: formData.estado
      };

      // En el alta viajan los vínculos elegidos. En edición se omiten a
      // propósito: el backend no los actualiza y enviarlos daría la falsa
      // impresión de que el paciente o el médico se pueden reasignar.
      if (!esEdicion) {
        payload.id_paciente = formData.id_paciente;
        payload.id_medico = formData.id_medico;
      }

      onGuardar(payload);
    }
  };

  // Renderizado de carga: mientras se obtienen pacientes y médicos mostramos solo el spinner.
  if (cargando) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  // Si la receta se creó con un paciente o médico que ya no está en la lista
  // (ficha dada de baja, o fuera de las primeras páginas), se agrega igual
  // como opción usando el nombre que vino en la propia prescripción. Sin esto
  // el <select> quedaría sin coincidencia y mostraría el placeholder.
  const pacienteActual = prescripcion?.id_paciente
    ? pacientes.find(p => Number(p.id) === Number(prescripcion.id_paciente))
      || {
        id: prescripcion.id_paciente,
        nombre: prescripcion.nombre_paciente || 'Paciente actual',
        dni: null
      }
    : null;

  const medicoActual = prescripcion?.id_medico
    ? medicos.find(m => Number(m.id) === Number(prescripcion.id_medico))
      || {
        id: prescripcion.id_medico,
        nombre: prescripcion.nombre_medico || 'Médico actual',
        especialidad: null
      }
    : null;

  const opcionesPacientes = pacienteActual
    && !pacientes.some(p => Number(p.id) === Number(pacienteActual.id))
    ? [...pacientes, pacienteActual]
    : pacientes;

  const opcionesMedicos = medicoActual
    && !medicos.some(m => Number(m.id) === Number(medicoActual.id))
    ? [...medicos, medicoActual]
    : medicos;

  return (
    // Contenedor con las mismas clases de lista para mantener coherencia visual.
    <div className="lista-container">
      {/* Cabecera del formulario: título dinámico según el modo (editar o nuevo) */}
      <div className="lista-header">
        {/* Condicional: si existe 'prescripcion' es edición, si no es alta nueva */}
        <h1>{prescripcion ? '✏️ Editar Prescripción' : '➕ Nueva Prescripción'}</h1>
      </div>

      {/* Formulario que dispara handleSubmit al enviarse */}
      <form className="formulario" onSubmit={handleSubmit}>
        {/* Grupo del selector de Paciente */}
        <div className="form-grupo">
          {/* htmlFor apunta al id del select: habilita el clic en el texto para
              enfocar el campo y la lectura de la etiqueta por lector de pantalla */}
          <label htmlFor="prescripcion-paciente">Paciente *</label>
          {/* El value del select es el id del paciente seleccionado y cada cambio lo actualiza.
              En edición queda deshabilitado: el vínculo pertenece a la receta original. */}
          <select
            id="prescripcion-paciente"
            name="id_paciente"
            value={formData.id_paciente}
            onChange={handleChange}
            disabled={esEdicion}
            className={errores.id_paciente ? 'input-error' : ''}
          >
            {/* Opción placeholder: aún no hay paciente elegido */}
            <option value="">Selecciona un paciente</option>
            {/* Mapeamos los pacientes cargados a opciones del selector */}
            {opcionesPacientes.map(p => (
              // key única por opción = id del paciente
              <option key={p.id} value={p.id}>
                {p.nombre}{p.dni ? ` (DNI: ${p.dni})` : ''}
              </option>
            ))}
          </select>
          {esEdicion && (
            <span className="texto-ayuda">El paciente no se puede cambiar al editar.</span>
          )}
          {/* Renderizado condicional del mensaje de error del campo */}
          {errores.id_paciente && <span className="error-text">{errores.id_paciente}</span>}
        </div>

        {/* Grupo del selector de Médico */}
        <div className="form-grupo">
          <label htmlFor="prescripcion-medico">Médico {esEdicion ? '' : '*'}</label>
          <select
            id="prescripcion-medico"
            name="id_medico"
            value={formData.id_medico}
            onChange={handleChange}
            disabled={esEdicion}
            className={errores.id_medico ? 'input-error' : ''}
          >
            {/* En edición, una receta histórica puede no tener médico. */}
            <option value="">
              {esEdicion ? 'Sin médico asignado' : 'Selecciona un médico'}
            </option>
            {/* Mapeamos los médicos cargados a opciones del selector */}
            {opcionesMedicos.map(m => (
              // key única por opción = id del médico
              <option key={m.id} value={m.id}>
                {m.nombre}{m.especialidad ? ` (${m.especialidad})` : ''}
              </option>
            ))}
          </select>
          {esEdicion && (
            <span className="texto-ayuda">El médico no se puede cambiar al editar.</span>
          )}
          {/* Renderizado condicional del mensaje de error del médico */}
          {errores.id_medico && <span className="error-text">{errores.id_medico}</span>}
        </div>

        {/* Grupo de la lista de medicamentos */}
        {/* role="group" + aria-labelledby: este rótulo describe un CONJUNTO de
            campos (una fila por medicamento), no un control único, así que
            htmlFor no serviría. Con aria-labelledby el lector de pantalla
            anuncia "Medicamentos" al entrar en cualquiera de los campos del
            grupo, que es exactamente lo que necesita para saber qué está
            completeando. */}
        <div className="form-grupo" role="group" aria-labelledby="grupo-medicamentos">
          <label id="grupo-medicamentos">Medicamentos *</label>
          {/* Mapeamos cada fila de medicamento a un bloque con dos inputs y botón de quitar */}
          {formData.medicamentos.map((med, index) => (
            // key por índice (aceptable para listas dinámicas locales de inputs)
            <div className="medicamento-row" key={index}>
              {/* Input del nombre del medicamento, controlado por el valor de la fila */}
              <input
                type="text"
                placeholder="Nombre del medicamento"
                value={med.nombre}
                onChange={(e) => handleMedicamentoChange(index, 'nombre', e.target.value)}
              />
              {/* Input de la dosis, controlado por el valor de la fila */}
              <input
                type="text"
                placeholder="Dosis (Ej: 500mg)"
                value={med.dosis}
                onChange={(e) => handleMedicamentoChange(index, 'dosis', e.target.value)}
              />
              {/* El botón de quitar solo aparece si hay más de una fila (nunca quedarse sin fila) */}
              {formData.medicamentos.length > 1 && (
                <button
                  type="button"
                  className="btn btn-sm btn-danger"
                  onClick={() => quitarMedicamento(index)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
          {/* Renderizado condicional del mensaje de error de medicamentos */}
          {errores.medicamentos && <span className="error-text">{errores.medicamentos}</span>}
        </div>

        {/* Botón que agrega una fila de medicamento nueva */}
        <div className="form-acciones">
          <button type="button" className="btn btn-secondary" onClick={agregarMedicamento}>
            ➕ Agregar medicamento
          </button>
        </div>

        {/* Grupo del campo de indicaciones */}
        <div className="form-grupo">
          <label htmlFor="prescripcion-indicaciones">Indicaciones</label>
          {/* Área de texto controlada por formData.indicaciones: guarda las instrucciones */}
          <textarea
            id="prescripcion-indicaciones"
            name="indicaciones"
            value={formData.indicaciones}
            onChange={handleChange}
            placeholder="Instrucciones de administración..."
            rows="4"
          />
        </div>

        {/* Grupo del campo de fecha de vencimiento */}
        <div className="form-grupo">
          <label htmlFor="prescripcion-vencimiento">Fecha de Vencimiento</label>
          {/* Input tipo fecha controlado por formData.fecha_vencimiento */}
          <input
            type="date"
            id="prescripcion-vencimiento"
            name="fecha_vencimiento"
            value={formData.fecha_vencimiento}
            onChange={handleChange}
          />
        </div>

        {/* Grupo del selector de estado */}
        <div className="form-grupo">
          <label htmlFor="prescripcion-estado">Estado</label>
          {/* Select de estado controlado por formData.estado */}
          <select
            id="prescripcion-estado"
            name="estado"
            value={formData.estado}
            onChange={handleChange}
          >
            {/* Cada opción tiene como value el código de estado del backend */}
            <option value="activa">✓ Activa</option>
            <option value="vencida">⚠ Vencida</option>
            <option value="dispensada">✓ Dispensada</option>
            <option value="cancelada">✗ Cancelada</option>
          </select>
        </div>

        {/* Acciones del formulario: botones Guardar y Cancelar */}
        <div className="form-acciones">
          {/* Botón submit que guarda los datos */}
          <button type="submit" className="btn btn-primary">
            💾 Guardar
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
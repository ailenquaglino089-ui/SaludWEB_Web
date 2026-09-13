// Importamos React y los hooks useState y useEffect para el manejo de estado y ciclo de vida.
import React, { useState, useEffect } from 'react';
// Importamos la instancia de axios configurada (base URL + interceptores de token y 401).
import client from '../../api/client';
// Importamos el componente de formulario que se muestra al crear/editar.
import FormularioPrescripcion from './FormularioPrescripcion';
// Importamos el componente de cambio de estado de prescripción.
import ChangeStateForm from './ChangeStateForm';
// Importamos el hook useAuth para conocer el rol del usuario (RBAC en la UI).
import { useAuth } from '../../hooks/useAuth';
// Importamos utilidades CRUD: manejo de errores, extracción de datos, badges de estado y formato de fecha.
import { handleApiError, getDatos, getStatusBadge, getStatusColor, formatDate } from '../../utils/crudHelpers';
// Importamos los estilos CSS de Prescripciones.
import './Prescripciones.css';

// Componente principal: lista de prescripciones con operaciones CRUD y cambio de estado.
export default function ListaPrescripciones() {
  // Obtenemos el usuario logueado desde el contexto de autenticación.
  const { usuario } = useAuth();
  // RBAC en UI: 'esAdmin' es true solo si el tipo_usuario del usuario es 'admin'.
  const esAdmin = usuario?.tipo_usuario === 'admin';
  // Estado con el listado de prescripciones obtenidas de la API.
  const [prescripciones, setPrescripciones] = useState([]);
  // Estado de carga: controla la visualización del spinner mientras llega la respuesta.
  const [cargando, setCargando] = useState(true);
  // Estado del mensaje de error global de la lista (null = sin error).
  const [error, setError] = useState(null);
  // Estado que alterna entre mostrar la lista o el formulario de prescripción.
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // Estado que guarda la prescripción en edición (null = modo alta nueva).
  const [prescripcionEditando, setPrescripcionEditando] = useState(null);
  // Estado que alterna entre mostrar la lista o el formulario de cambio de estado.
  const [mostrarCambioEstado, setMostrarCambioEstado] = useState(false);
  // Estado con la prescripción de la cual se está cambiando el estado.
  const [prescripcionParaCambioEstado, setPrescripcionParaCambioEstado] = useState(null);
  // Estado del texto de búsqueda para filtrar la tabla.
  const [busqueda, setBusqueda] = useState('');
  // Estado del filtro por estado (cadena vacía = todos los estados).
  const [filtroEstado, setFiltroEstado] = useState('');

  // useEffect de montaje: carga las prescripciones la primera vez que se renderiza el componente.
  useEffect(() => {
    cargarPrescripciones();
  }, []); // Dependencias vacías: se ejecuta una sola vez

  // Función asíncrona que obtiene las prescripciones desde el backend.
  const cargarPrescripciones = async () => {
    try {
      // Activamos el estado de carga antes de hacer la petición.
      setCargando(true);
      // GET a /api/prescripciones usando la instancia de axios (client) que agrega el token JWT automáticamente.
      const response = await client.get('/api/prescripciones');
      // getDatos extrae la lista real de la envoltura de la API ({ ok, mensaje, data }).
      setPrescripciones(getDatos(response, []));
      // Al cargar bien, limpiamos cualquier error previo.
      setError(null);
    } catch (err) {
      // handleApiError convierte el error de axios en un mensaje legible para el usuario.
      // (Nota: un 401 ya es redirigido a /login por el interceptor de client).
      setError(handleApiError(err));
    } finally {
      // En cualquier caso apagamos el spinner.
      setCargando(false);
    }
  };

  // Handler del botón "Nueva Prescripción": prepara el modo alta nueva.
  const handleNuevaPrescripcion = () => {
    // Limpiamos la prescripción en edición para que el formulario arranque vacío.
    setPrescripcionEditando(null);
    // Mostramos el formulario.
    setMostrarFormulario(true);
  };

  // Handler del botón "Editar": recibe la prescripción de la fila.
  const handleEditarPrescripcion = (prescripcion) => {
    // Guardamos la prescripción para precargar los datos en el formulario.
    setPrescripcionEditando(prescripcion);
    // Mostramos el formulario en modo edición.
    setMostrarFormulario(true);
  };

  // Handler del botón "Cambiar Estado": prepara el formulario de cambio de estado.
  const handleCambiarEstado = (prescripcion) => {
    // Guardamos la prescripción seleccionada para pasarla al formulario.
    setPrescripcionParaCambioEstado(prescripcion);
    // Mostramos el formulario de cambio de estado.
    setMostrarCambioEstado(true);
  };

  // Handler del botón "Eliminar": recibe el id de la prescripción.
  const handleEliminarPrescripcion = async (id) => {
    // Confirmación nativa del navegador: si el usuario cancela, salimos sin eliminar.
    if (!window.confirm('¿Estás seguro de que quieres eliminar esta prescripción?')) return;

    try {
      // DELETE a /api/prescripciones/{id} (el interceptor de client adjunta el token).
      await client.delete(`/api/prescripciones/${id}`);
      // Actualizamos el estado local filtrando la prescripción eliminada (optimiza sin recargar).
      setPrescripciones(prescripciones.filter(p => p.id !== id));
      // Limpiamos errores tras operación exitosa.
      setError(null);
    } catch (err) {
      // Mostramos el mensaje de error traducido de la API.
      setError(handleApiError(err));
    }
  };

  // Handler del guardado: recibe los datos provenientes de FormularioPrescripcion.
  const handleGuardarPrescripcion = async (datosFormulario) => {
    try {
      if (prescripcionEditando) {
        // Actualizar
        // PUT a /api/prescripciones/{id} con los datos editados.
        await client.put(`/api/prescripciones/${prescripcionEditando.id}`, datosFormulario);
        // Reemplazamos en el estado la prescripción editada, conservando su id.
        setPrescripciones(prescripciones.map(p => p.id === prescripcionEditando.id ? { ...datosFormulario, id: prescripcionEditando.id } : p));
      } else {
        // Crear
        // POST a /api/prescripciones con los datos nuevos (create).
        const response = await client.post('/api/prescripciones', datosFormulario);
        // Agregamos la prescripción creada (devuelta por la API) al final de la lista local.
        setPrescripciones([...prescripciones, getDatos(response)]);
      }
      // Tras guardar, ocultamos el formulario.
      setMostrarFormulario(false);
      // Limpiamos la prescripción en edición para futuros formularios.
      setPrescripcionEditando(null);
      // Limpiamos errores.
      setError(null);
    } catch (err) {
      // Mostramos el error de la API en la lista.
      setError(handleApiError(err));
    }
  };

  // Handler del guardado de cambio de estado: recibe el nuevo estado desde ChangeStateForm.
  const handleGuardarCambioEstado = async (nuevoEstado) => {
    try {
      // PATCH a /api/prescripciones/{id}/estado con el nuevo estado en el body.
      await client.patch(`/api/prescripciones/${prescripcionParaCambioEstado.id}/estado`, {
        estado: nuevoEstado
      });
      // Actualizamos la prescripción correspondiente en el estado local con el nuevo estado.
      setPrescripciones(prescripciones.map(p => 
        // Buscamos la prescripción que se estaba editando
        p.id === prescripcionParaCambioEstado.id 
          // Solo a esa prescripción le actualizamos el campo 'estado'
          ? { ...p, estado: nuevoEstado } 
          // Al resto las dejamos intactas
          : p
      ));
      // Ocultamos el formulario de cambio de estado.
      setMostrarCambioEstado(false);
      // Limpiamos la prescripción seleccionada.
      setPrescripcionParaCambioEstado(null);
      // Limpiamos errores.
      setError(null);
    } catch (err) {
      // Mostramos el error de la API en la lista.
      setError(handleApiError(err));
    }
  };

  // Función auxiliar: convierte la lista de medicamentos de una prescripción en un texto separado por comas.
  const nombresMedicamentos = (p) =>
    // El || [] evita errores si el campo 'medicamentos' viene null o indefinido
    (p.medicamentos || []).map(m => m.nombre).join(', ');

  // Filtrado combinado: por búsqueda (texto) y por estado (select).
  const prescripcionesFiltr = prescripciones.filter(p => {
    // Coincide si el texto de búsqueda aparece en medicamentos, paciente o médico.
    const matchBusqueda = nombresMedicamentos(p).toLowerCase().includes(busqueda.toLowerCase()) ||
                         p.nombre_paciente?.toLowerCase().includes(busqueda.toLowerCase()) ||
                         p.nombre_medico?.toLowerCase().includes(busqueda.toLowerCase());
    // Coincide si no hay filtro de estado ('') o si el estado coincide exactamente.
    const matchEstado = !filtroEstado || p.estado === filtroEstado;
    // La prescripción se muestra solo si cumple AMBAS condiciones.
    return matchBusqueda && matchEstado;
  });

  // Si 'mostrarFormulario' es true, en lugar de la lista renderizamos el formulario de alta/edición.
  if (mostrarFormulario) {
    return (
      <FormularioPrescripcion
        // La prop 'prescripcion' es el objeto a editar o null para alta nueva
        prescripcion={prescripcionEditando}
        // La prop 'onGuardar' es el callback que recibe los datos del formulario
        onGuardar={handleGuardarPrescripcion}
        // La prop 'onCancelar' restaura la vista de la lista
        onCancelar={() => {
          setMostrarFormulario(false);
          setPrescripcionEditando(null);
        }}
      />
    );
  }

  // Si 'mostrarCambioEstado' está activo y hay prescripción, renderizamos el formulario de cambio de estado.
  if (mostrarCambioEstado && prescripcionParaCambioEstado) {
    return (
      <ChangeStateForm
        // La prop 'prescripcion' es la que será modificada
        prescripcion={prescripcionParaCambioEstado}
        // La prop 'onGuardar' recibe el nuevo estado elegido
        onGuardar={handleGuardarCambioEstado}
        // La prop 'onCancelar' restaura la vista de la lista
        onCancelar={() => {
          setMostrarCambioEstado(false);
          setPrescripcionParaCambioEstado(null);
        }}
      />
    );
  }

  return (
    // Contenedor principal de la lista.
    <div className="lista-container">
      {/* Cabecera con título y botón de nueva prescripción */}
      <div className="lista-header">
        <h1>💊 Gestión de Prescripciones</h1>
        {/* Botón que dispara el modo alta nueva */}
        <button className="btn btn-primary" onClick={handleNuevaPrescripcion}>
          ➕ Nueva Prescripción
        </button>
      </div>

      {/* Renderizado condicional: solo mostramos el alert si hay error */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Barra de búsqueda + filtro de estado */}
      <div className="lista-filtros">
        {/* Input controlado por el estado 'busqueda': cada tecla actualiza la búsqueda */}
        <input
          type="text"
          placeholder="🔍 Buscar por medicamento, paciente o médico..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />
        {/* Select controlado por el estado 'filtroEstado': cada cambio filtra por estado */}
        <select 
          value={filtroEstado} 
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="select-filtro"
        >
          {/* Opción por defecto: todos los estados */}
          <option value="">Todos los estados</option>
          <option value="activa">✓ Activa</option>
          <option value="vencida">⚠ Vencida</option>
          <option value="dispensada">✓ Dispensada</option>
          <option value="cancelada">✗ Cancelada</option>
        </select>
      </div>

      {/* Renderizado condicional en tres estados: cargando / vacío / tabla */}
      {cargando ? (
        // Estado 1: mostrando el spinner mientras carga
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando prescripciones...</p>
        </div>
      ) : prescripcionesFiltr.length === 0 ? (
        // Estado 2: el filtro no devolvió resultados
        <div className="lista-vacia">
          <p>No hay prescripciones registradas</p>
        </div>
      ) : (
        // Estado 3: hay prescripciones para mostrar en la tabla
        <div className="tabla-container">
          <table className="tabla">
            <thead>
              <tr>
                <th>Medicamentos</th>
                <th>Paciente</th>
                <th>Médico</th>
                <th>Fecha Emisión</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Iteramos sobre la lista filtrada para generar una fila por prescripción */}
              {prescripcionesFiltr.map(prescripcion => (
                // La key única por fila debe ser el id de la prescripción
                <tr key={prescripcion.id}>
                  {/* Medicamentos formateados: "Nombre (Dosis)" separados por comas */}
                  <td>{(prescripcion.medicamentos || [])
                      .map(m => `${m.nombre}${m.dosis ? ` (${m.dosis})` : ''}`)
                      .join(', ')}</td>
                  <td>{prescripcion.nombre_paciente}</td>
                  <td>{prescripcion.nombre_medico}</td>
                  {/* formatDate convierte la fecha ISO del backend al formato local dd/mm/aaaa */}
                  <td>{formatDate(prescripcion.fecha_emision)}</td>
                  <td>
                    {/* Badge con color de fondo según el estado (getStatusColor) y texto con ícono (getStatusBadge) */}
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(prescripcion.estado) }}
                    >
                      {/* getStatusBadge devuelve el texto con ícono del estado */}
                      {getStatusBadge(prescripcion.estado)}
                    </span>
                  </td>
                  <td className="acciones">
                    {/* Botón de editar: pasa la prescripción completa al handler */}
                    <button 
                      className="btn btn-sm btn-info"
                      onClick={() => handleEditarPrescripcion(prescripcion)}
                    >
                      ✏️ Editar
                    </button>
                    {/* Botón para cambiar el estado (disponible para todos los usuarios) */}
                    <button 
                      className="btn btn-sm btn-warning"
                      onClick={() => handleCambiarEstado(prescripcion)}
                    >
                      🔄 Cambiar Estado
                    </button>
                    {/* RBAC: el botón Eliminar solo se muestra si el usuario es admin */}
                    {esAdmin && (
                    <button 
                      className="btn btn-sm btn-danger"
                      onClick={() => handleEliminarPrescripcion(prescripcion.id)}
                    >
                      🗑️ Eliminar
                    </button>
                  )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
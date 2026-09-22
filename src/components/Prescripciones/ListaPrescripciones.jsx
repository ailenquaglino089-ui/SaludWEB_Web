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
// Importamos el componente de paginación reutilizable.
import Paginacion from '../common/Paginacion';
// Importamos el modal de confirmación (guía CRUD: eliminar con confirmación activa).
import ConfirmarModal from '../common/ConfirmarModal';
// Importamos las notificaciones flotantes (guía CRUD: feedback de éxito/error).
import Toast from '../common/Toast';

// Componente principal: lista de prescripciones con operaciones CRUD y cambio de estado.
export default function ListaPrescripciones() {
  // Obtenemos el usuario logueado desde el contexto de autenticación.
  const { usuario } = useAuth();
  // RBAC en UI: 'esAdmin' es true solo si el tipo_usuario del usuario es 'admin'.
  const esAdmin = usuario?.tipo_usuario === 'admin';
  // RBAC: 'esMedico' identifica al rol médico.
  const esMedico = usuario?.tipo_usuario === 'medico';
  // Regla de negocio: "Las prescripciones sólo pueden ser hechas por Médicos".
  // Solo un médico puede recetar/editar; ni admin ni paciente ven estas opciones.
  const puedeRecetar = esMedico;
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
  // Estado del texto de búsqueda ya "debounceado": se usa recién 400 ms después
  // de que el usuario deja de escribir (evita un request por cada tecla).
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  // Paginado: número de página actual, cantidad por página y totales del backend.
  const [pagina, setPagina] = useState(1);         // Empieza en la página 1
  const [porPagina, setPorPagina] = useState(10);  // 10 prescripciones por página
  const [total, setTotal] = useState(0);           // Total de prescripciones (para la paginación)
  const [totalPaginas, setTotalPaginas] = useState(1); // Total de páginas
  // Estado del filtro por estado (cadena vacía = todos los estados).
  const [filtroEstado, setFiltroEstado] = useState('');
  // Estado de la prescripción pendiente de eliminación (null = no hay ninguna): abre el modal.
  const [paraEliminar, setParaEliminar] = useState(null);
  // Estado de la notificación flotante: { tipo: 'exito'|'error'|'info', texto }.
  const [notif, setNotif] = useState({ tipo: 'info', texto: '' });

  // Helper centralizado del sistema de notificaciones (guía: mostrarMensaje(tipo, texto)).
  const mostrarNotif = (tipo, texto) => setNotif({ tipo, texto });

  // Debounce de búsqueda: 400 ms después de la última tecla se aplica el filtro.
  useEffect(() => {
    // setTimeout programa la ejecución; clearTimeout la cancela si se escribe otra tecla antes.
    const timer = setTimeout(() => {
      setPagina(1);                        // Con un filtro nuevo volvemos a la página 1
      setBusquedaAplicada(busqueda);       // Aplica el texto de búsqueda al backend
    }, 400);
    return () => clearTimeout(timer);      // Limpieza: cancela el timer anterior
  }, [busqueda]); // Dependencia: se re-programa cada vez que cambia el texto

  // Recarga la lista cuando cambia la página, el tamaño de página, la búsqueda
  // aplicada o el filtro de estado.
  useEffect(() => {
    cargarPrescripciones();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, porPagina, busquedaAplicada, filtroEstado]); // Dependencias que disparan la recarga

  // Función asíncrona que obtiene una página de prescripciones desde el backend.
  const cargarPrescripciones = async () => {
    try {
      // Activamos el estado de carga antes de hacer la petición.
      setCargando(true);
      // GET a /api/prescripciones con los parámetros de paginado (pagina, por_pagina),
      // búsqueda (q) y filtro de estado (estado).
      const response = await client.get('/api/prescripciones', {
        params: { pagina, por_pagina: porPagina, q: busquedaAplicada, estado: filtroEstado }
      });
      // getDatos extrae la estructura paginada ({ ok, mensaje, data: {items, total, ...} }).
      const datos = getDatos(response, { items: [], total: 0, total_paginas: 1, pagina: 1 });
      // Solo se guarda la página actual en el estado (no los cientos de registros juntos).
      setPrescripciones(datos.items);
      setTotal(datos.total);
      setTotalPaginas(datos.total_paginas);
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

  // Handler del botón "Eliminar": abre el modal de confirmación (no el confirm nativo).
  const handleEliminarPrescripcion = (prescripcion) => {
    // Guardamos la prescripción en el estado para que el modal describa qué se elimina.
    setParaEliminar(prescripcion);
  };

  // Confirmación del modal: ejecuta el DELETE con prevención de doble clic.
  const confirmarEliminar = async () => {
    try {
      // DELETE a /api/prescripciones/{id} (el interceptor de client adjunta el token).
      await client.delete(`/api/prescripciones/${paraEliminar.id}`);
      // Con paginado conviene recargar la página actual: así el total y las
      // páginas se recalculan con el dato real del backend (no con un filtro local).
      await cargarPrescripciones();
      // Cierra el modal de confirmación.
      setParaEliminar(null);
      // Limpia el error global y avisa con un toast de éxito.
      setError(null);
      mostrarNotif('exito', 'Prescripción eliminada correctamente.');
    } catch (err) {
      // El error queda visible (alert persistente) y el modal se mantiene abierto
      // para que el usuario pueda reintentar (el botón se re-habilita).
      setError(handleApiError(err));
      // Se propaga para que el modal re-habilite el botón de confirmación.
      throw err;
    }
  };

  // Handler del guardado: recibe los datos provenientes de FormularioPrescripcion.
  const handleGuardarPrescripcion = async (datosFormulario) => {
    try {
      if (prescripcionEditando) {
        // Actualizar
        // PUT a /api/prescripciones/{id} con los datos editados.
        await client.put(`/api/prescripciones/${prescripcionEditando.id}`, datosFormulario);
        // Con paginado recargamos la página actual para reflejar el cambio guardado.
      } else {
        // Crear
        // POST a /api/prescripciones con los datos nuevos (create).
        await client.post('/api/prescripciones', datosFormulario);
        // Tras crear volvemos a la página 1 (donde suelen verse los registros más recientes).
        setPagina(1);
      }
      // Recarga la página actual para sincronizar con los datos reales del backend.
      await cargarPrescripciones();
      // Feedback de éxito con el sistema centralizado de notificaciones.
      mostrarNotif('exito', prescripcionEditando ? 'Prescripción actualizada correctamente.' : 'Prescripción creada correctamente.');
      // Tras guardar, ocultamos el formulario y limpiamos la prescripción en edición.
      setMostrarFormulario(false);
      setPrescripcionEditando(null);
      // Limpiamos errores globales de la lista.
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
      // Recargamos la página: si el filtro de estado está activo, el registro
      // puede dejar de pertenecer a esta página (lo decide el backend).
      await cargarPrescripciones();
      // Feedback de éxito del cambio de estado.
      mostrarNotif('exito', `Estado actualizado a "${nuevoEstado}" correctamente.`);
      // Ocultamos el formulario de cambio de estado.
      setMostrarCambioEstado(false);
      // Limpiamos la prescripción seleccionada.
      setPrescripcionParaCambioEstado(null);
      // Limpiamos errores globales de la lista.
      setError(null);
    } catch (err) {
      // Mostramos el error de la API en la lista.
      setError(handleApiError(err));
    }
  };

  // Nota: con paginado la búsqueda y los filtros se resuelven en el backend
  // (params pagina/por_pagina/q/estado). NO hay filtrado local: el estado
  // 'prescripciones' ya es la página actual filtrada.

  // Si 'mostrarFormulario' está activo y el rol está habilitado, lo mostramos.
  // RBAC: un paciente nunca ve el formulario de prescripción (regla de negocio).
  if (mostrarFormulario && puedeRecetar) {
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
        {/* RBAC: la creación de prescripciones es operación médica; el paciente no la ve */}
        {puedeRecetar && (
          <button className="btn btn-primary" onClick={handleNuevaPrescripcion}>
            ➕ Nueva Prescripción
          </button>
        )}
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
      ) : prescripciones.length === 0 ? (
        // Estado 2: el filtro no devolvió resultados
        <div className="lista-vacia">
          <p>{busqueda ? 'No hay resultados para tu búsqueda' : 'No hay prescripciones registradas'}</p>
        </div>
      ) : (
        // Estado 3: hay prescripciones para mostrar en la tabla
        <>
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
              {/* Iteramos sobre la página actual para generar una fila por prescripción */}
              {prescripciones.map(prescripcion => (
                // La key única por fila debe ser el id de la prescripción
                <tr key={prescripcion.id}>
                  {/* Medicamentos formateados: "Nombre (Dosis)" separados por comas */}
                  <td data-label="Medicamentos">{(prescripcion.medicamentos || [])
                      .map(m => `${m.nombre}${m.dosis ? ` (${m.dosis})` : ''}`)
                      .join(', ')}</td>
                  <td data-label="Paciente">{prescripcion.nombre_paciente}</td>
                  <td data-label="Médico">{prescripcion.nombre_medico}</td>
                  {/* formatDate convierte la fecha ISO del backend al formato local dd/mm/aaaa */}
                  <td data-label="Fecha Emisión">{formatDate(prescripcion.fecha_emision)}</td>
                  <td data-label="Estado">
                    {/* Badge con color de fondo según el estado (getStatusColor) y texto con ícono (getStatusBadge) */}
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(prescripcion.estado) }}
                    >
                      {/* getStatusBadge devuelve el texto con ícono del estado */}
                      {getStatusBadge(prescripcion.estado)}
                    </span>
                  </td>
                  <td className="acciones" data-label="Acciones">
                    {/* RBAC: solo médico o admin pueden editar una prescripción */}
                    {puedeRecetar && (
                      <button 
                        className="btn btn-sm btn-info"
                        onClick={() => handleEditarPrescripcion(prescripcion)}
                      >
                        ✏️ Editar
                      </button>
                    )}
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
                      onClick={() => handleEliminarPrescripcion(prescripcion)}
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

          {/* Controles de paginado: se muestran cuando hay más de una página */}
          <Paginacion
            pagina={pagina}
            porPagina={porPagina}
            total={total}
            totalPaginas={totalPaginas}
            onCambiarPagina={setPagina}
          />
        </>
      )}

      {/* Modal de confirmación de eliminación (reemplaza al confirm() nativo).
          Mensaje descriptivo: qué prescripción se elimina y que no se puede deshacer. */}
      <ConfirmarModal
        abierto={paraEliminar !== null}
        titulo="Eliminar prescripción"
        mensaje={paraEliminar ? `¿Eliminar la prescripción #${paraEliminar.id} de "${paraEliminar.nombre_paciente}"? Esta acción no se puede deshacer.` : ''}
        textoConfirmar="Eliminar"
        onConfirmar={confirmarEliminar}
        onCancelar={() => setParaEliminar(null)}
      />

      {/* Notificación flotante centralizada (éxitos se ocultan solos, errores quedan). */}
      <Toast tipo={notif.tipo} texto={notif.texto} onCerrar={() => setNotif({ tipo: 'info', texto: '' })} />
    </div>
  );
}
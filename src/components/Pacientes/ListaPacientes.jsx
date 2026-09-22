// Importamos React y los hooks useState y useEffect para el manejo de estado y ciclo de vida.
import React, { useState, useEffect } from 'react';
// Importamos la instancia de axios configurada (base URL + interceptores de token y 401).
import client from '../../api/client';
// Importamos el componente de formulario que se muestra al crear/editar.
import FormularioPaciente from './FormularioPaciente';
// Importamos el hook useAuth para conocer el rol del usuario (RBAC en la UI).
import { useAuth } from '../../hooks/useAuth';
// Importamos utilidades CRUD: manejo de errores de API, extracción de datos y helpers de badges de estado.
import { handleApiError, getDatos, getStatusBadge, getStatusColor } from '../../utils/crudHelpers';
// Importamos los estilos CSS de Pacientes.
import './Pacientes.css';
// Importamos el componente de paginación reutilizable.
import Paginacion from '../common/Paginacion';
// Importamos el modal de confirmación (guía CRUD: eliminar con confirmación activa).
import ConfirmarModal from '../common/ConfirmarModal';
// Importamos las notificaciones flotantes (guía CRUD: feedback de éxito/error).
import Toast from '../common/Toast';

// Componente principal: lista de pacientes con operaciones CRUD completas.
export default function ListaPacientes() {
  // Obtenemos el usuario logueado desde el contexto de autenticación.
  const { usuario } = useAuth();
  // RBAC en UI: 'esAdmin' es true solo si el tipo_usuario del usuario es 'admin'.
  const esAdmin = usuario?.tipo_usuario === 'admin';
  // Estado con el listado de pacientes obtenidos de la API.
  const [pacientes, setPacientes] = useState([]);
  // Estado de carga: controla la visualización del spinner mientras llega la respuesta.
  const [cargando, setCargando] = useState(true);
  // Estado del mensaje de error global de la lista (null = sin error).
  const [error, setError] = useState(null);
  // Estado que alterna entre mostrar la lista o el formulario de paciente.
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // Estado que guarda el paciente en edición (null = modo alta nueva).
  const [pacienteEditando, setPacienteEditando] = useState(null);
  // Estado del texto de búsqueda para filtrar la tabla.
  const [busqueda, setBusqueda] = useState('');
  // Estado del texto de búsqueda ya "debounceado": se usa recién 400 ms después
  // de que el usuario deja de escribir (evita un request por cada tecla).
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  // Paginado: número de página actual, cantidad por página y totales del backend.
  const [pagina, setPagina] = useState(1);         // Empieza en la página 1
  const [porPagina, setPorPagina] = useState(10);  // 10 pacientes por página
  const [total, setTotal] = useState(0);           // Total de pacientes (para la paginación)
  const [totalPaginas, setTotalPaginas] = useState(1); // Total de páginas
  // Estado del registro pendiente de eliminación (null = no hay ninguno): abre el modal.
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

  // Recarga la lista cuando cambia la página, el tamaño de página o la búsqueda aplicada.
  useEffect(() => {
    cargarPacientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagina, porPagina, busquedaAplicada]); // Dependencias que disparan la recarga

  // Función asíncrona que obtiene una página de pacientes desde el backend.
  const cargarPacientes = async () => {
    try {
      // Activamos el estado de carga antes de hacer la petición.
      setCargando(true);
      // GET a /api/pacientes con los parámetros de paginado (pagina, por_pagina) y búsqueda (q).
      // El backend valida/acota los valores; así nunca se trae toda la tabla.
      const response = await client.get('/api/pacientes', { params: { pagina, por_pagina: porPagina, q: busquedaAplicada } });
      // getDatos extrae la estructura paginada ({ ok, mensaje, data: {items, total, ...} }).
      const datos = getDatos(response, { items: [], total: 0, total_paginas: 1, pagina: 1 });
      // Solo se guarda la página actual en el estado (no los 100+ pacientes juntos).
      setPacientes(datos.items);
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

  // Handler del botón "Nuevo Paciente": prepara el modo alta nueva.
  const handleNuevoPaciente = () => {
    // Limpiamos el paciente en edición para que el formulario arranque vacío.
    setPacienteEditando(null);
    // Mostramos el formulario.
    setMostrarFormulario(true);
  };

  // Handler del botón "Editar": recibe el paciente de la fila.
  const handleEditarPaciente = (paciente) => {
    // Guardamos el paciente para precargar los datos en el formulario.
    setPacienteEditando(paciente);
    // Mostramos el formulario en modo edición.
    setMostrarFormulario(true);
  };

  // Handler del botón "Eliminar": abre el modal de confirmación (no el confirm nativo).
  const handleEliminarPaciente = (paciente) => {
    // Guardamos el paciente en el estado para que el modal describa qué se elimina.
    setParaEliminar(paciente);
  };

  // Confirmación del modal: ejecuta el DELETE con prevención de doble clic.
  const confirmarEliminar = async () => {
    try {
      // DELETE a /api/pacientes/{id} (el interceptor de client adjunta el token).
      await client.delete(`/api/pacientes/${paraEliminar.id}`);
      // Con paginado conviene recargar la página actual: así el total y las
      // páginas se recalculan con el dato real del backend (no con un filtro local).
      await cargarPacientes();
      // Cierra el modal de confirmación.
      setParaEliminar(null);
      // Limpia el error global y avisa con un toast de éxito.
      setError(null);
      mostrarNotif('exito', 'Paciente eliminado correctamente.');
    } catch (err) {
      // El error queda visible (alert persistente) y el modal se mantiene abierto
      // para que el usuario pueda reintentar (el botón se re-habilita).
      setError(handleApiError(err));
      // Se propaga para que el modal re-habilite el botón de confirmación.
      throw err;
    }
  };

  // Handler del guardado: recibe los datos provenientes de FormularioPaciente.
  const handleGuardarPaciente = async (datosFormulario) => {
    try {
      if (pacienteEditando) {
        // Actualizar
        // PUT a /api/pacientes/{id} con los datos editados.
        await client.put(`/api/pacientes/${pacienteEditando.id}`, datosFormulario);
        // Con paginado recargamos la página actual para reflejar el cambio guardado.
      } else {
        // Crear
        // POST a /api/pacientes con los datos nuevos (create).
        await client.post('/api/pacientes', datosFormulario);
        // Tras crear volvemos a la página 1 (donde suelen verse los primeros registros).
        setPagina(1);
      }
      // Recarga la página actual para sincronizar con los datos reales del backend.
      await cargarPacientes();
      // Feedback de éxito con el sistema centralizado de notificaciones.
      mostrarNotif('exito', pacienteEditando ? 'Paciente actualizado correctamente.' : 'Paciente creado correctamente.');
      // Tras guardar, ocultamos el formulario y limpiamos el paciente en edición.
      setMostrarFormulario(false);
      setPacienteEditando(null);
      // Limpiamos errores globales de la lista.
      setError(null);
    } catch (err) {
      // Mostramos el error de la API en la lista.
      setError(handleApiError(err));
    }
  };

  // Nota: con paginado la búsqueda y el filtrado se resuelven en el backend (params pagina/por_pagina/q).
  // Por eso aquí NO hay filtrado local: el estado 'pacientes' ya es la página actual filtrada.

  // Si 'mostrarFormulario' es true, en lugar de la lista renderizamos el formulario.
  if (mostrarFormulario) {
    return (
      <FormularioPaciente
        // La prop 'paciente' es el objeto a editar o null para alta nueva
        paciente={pacienteEditando}
        // La prop 'onGuardar' es el callback que recibe los datos del formulario
        onGuardar={handleGuardarPaciente}
        // La prop 'onCancelar' restaura la vista de la lista
        onCancelar={() => {
          setMostrarFormulario(false);
          setPacienteEditando(null);
        }}
      />
    );
  }

  return (
    // Contenedor principal de la lista.
    <div className="lista-container">
      {/* Cabecera con título y botón de nuevo paciente */}
      <div className="lista-header">
        <h1>👥 Gestión de Pacientes</h1>
        {/* Botón que dispara el modo alta nueva */}
        <button className="btn btn-primary" onClick={handleNuevoPaciente}>
          ➕ Nuevo Paciente
        </button>
      </div>

      {/* Renderizado condicional: solo mostramos el alert si hay error */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Barra de búsqueda */}
      <div className="lista-filtro">
        {/* Input controlado por el estado 'busqueda': cada tecla actualiza la búsqueda */}
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, DNI u obra social..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="input-busqueda"
        />
      </div>

      {/* Renderizado condicional en tres estados: cargando / vacío / tabla */}
      {cargando ? (
        // Estado 1: mostrando el spinner mientras carga
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando pacientes...</p>
        </div>
      ) : pacientes.length === 0 ? (
        // Estado 2: el filtro no devolvió resultados
        <div className="lista-vacia">
          <p>{busqueda ? 'No hay resultados para tu búsqueda' : 'No hay pacientes registrados'}</p>
        </div>
      ) : (
        // Estado 3: hay pacientes para mostrar en la tabla
        <>
          <div className="tabla-container">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>DNI</th>
                <th>Obra Social</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Iteramos sobre la página actual para generar una fila por paciente */}
              {pacientes.map(paciente => (
                // La key única por fila debe ser el id del paciente
                <tr key={paciente.id}>
                  <td data-label="Nombre">{paciente.nombre}</td>
                  <td data-label="DNI">{paciente.dni}</td>
                  <td data-label="Obra Social">{paciente.obra_social}</td>
                  <td data-label="Estado">
                    {/* Badge con color de fondo según el estado (getStatusColor) y texto con ícono (getStatusBadge) */}
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(paciente.activo ? 'activo' : 'inactivo') }}
                    >
                      {/* getStatusBadge devuelve el texto con ícono del estado */}
                      {getStatusBadge(paciente.activo ? 'activo' : 'inactivo')}
                    </span>
                  </td>
                  <td className="acciones" data-label="Acciones">
                    {/* Botón de editar: pasa el paciente completo al handler */}
                    <button 
                      className="btn btn-sm btn-info"
                      onClick={() => handleEditarPaciente(paciente)}
                    >
                      ✏️ Editar
                    </button>
                    {/* RBAC: el botón Eliminar solo se muestra si el usuario es admin */}
                    {esAdmin && (
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleEliminarPaciente(paciente)}
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
          Mensaje descriptivo: qué paciente se elimina y que la acción no se puede deshacer. */}
      <ConfirmarModal
        abierto={paraEliminar !== null}
        titulo="Eliminar paciente"
        mensaje={paraEliminar ? `¿Eliminar al paciente "${paraEliminar.nombre}"? Esta acción no se puede deshacer.` : ''}
        textoConfirmar="Eliminar"
        onConfirmar={confirmarEliminar}
        onCancelar={() => setParaEliminar(null)}
      />

      {/* Notificación flotante centralizada (éxitos se ocultan solos, errores quedan). */}
      <Toast tipo={notif.tipo} texto={notif.texto} onCerrar={() => setNotif({ tipo: 'info', texto: '' })} />
    </div>
  );
}
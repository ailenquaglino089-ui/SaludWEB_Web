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

  // useEffect de montaje: carga los pacientes la primera vez que se renderiza el componente.
  useEffect(() => {
    cargarPacientes();
  }, []); // Dependencias vacías: se ejecuta una sola vez

  // Función asíncrona que obtiene los pacientes desde el backend.
  const cargarPacientes = async () => {
    try {
      // Activamos el estado de carga antes de hacer la petición.
      setCargando(true);
      // GET a /api/pacientes usando la instancia de axios (client) que agrega el token JWT automáticamente.
      const response = await client.get('/api/pacientes');
      // getDatos extrae la lista real de la envoltura de la API ({ ok, mensaje, data }).
      setPacientes(getDatos(response, []));
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

  // Handler del botón "Eliminar": recibe el id del paciente.
  const handleEliminarPaciente = async (id) => {
    // Confirmación nativa del navegador: si el usuario cancela, salimos sin eliminar.
    if (!window.confirm('¿Estás seguro de que quieres eliminar este paciente?')) return;

    try {
      // DELETE a /api/pacientes/{id} (el interceptor de client adjunta el token).
      await client.delete(`/api/pacientes/${id}`);
      // Actualizamos el estado local filtrando el paciente eliminado (optimiza sin recargar).
      setPacientes(pacientes.filter(p => p.id !== id));
      // Limpiamos errores tras operación exitosa.
      setError(null);
    } catch (err) {
      // Mostramos el mensaje de error traducido de la API.
      setError(handleApiError(err));
    }
  };

  // Handler del guardado: recibe los datos provenientes de FormularioPaciente.
  const handleGuardarPaciente = async (datosFormulario) => {
    try {
      if (pacienteEditando) {
        // Actualizar
        // PUT a /api/pacientes/{id} con los datos editados.
        await client.put(`/api/pacientes/${pacienteEditando.id}`, datosFormulario);
        // Reemplazamos en el estado el paciente editado, conservando su id.
        setPacientes(pacientes.map(p => p.id === pacienteEditando.id ? { ...datosFormulario, id: pacienteEditando.id } : p));
      } else {
        // Crear
        // POST a /api/pacientes con los datos nuevos (create).
        const response = await client.post('/api/pacientes', datosFormulario);
        // Agregamos el paciente creado (devuelto por la API) al final de la lista local.
        setPacientes([...pacientes, getDatos(response)]);
      }
      // Tras guardar, ocultamos el formulario.
      setMostrarFormulario(false);
      // Limpiamos el paciente en edición para futuros formularios.
      setPacienteEditando(null);
      // Limpiamos errores.
      setError(null);
    } catch (err) {
      // Mostramos el error de la API en la lista.
      setError(handleApiError(err));
    }
  };

  // Filtrado por búsqueda: filtra los pacientes por nombre, DNI u obra social.
  const pacientesFiltr = pacientes.filter(p =>
    // Compara nombre (en minúsculas) contra el texto de búsqueda (en minúsculas)
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    // Compara DNI (numérico, sin cambios de mayúsculas porque son dígitos)
    p.dni?.includes(busqueda) ||
    // Compara obra social contra el texto de búsqueda
    p.obra_social?.toLowerCase().includes(busqueda.toLowerCase())
  );

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
      ) : pacientesFiltr.length === 0 ? (
        // Estado 2: el filtro no devolvió resultados
        <div className="lista-vacia">
          <p>No hay pacientes registrados</p>
        </div>
      ) : (
        // Estado 3: hay pacientes para mostrar en la tabla
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
              {/* Iteramos sobre la lista filtrada para generar una fila por paciente */}
              {pacientesFiltr.map(paciente => (
                // La key única por fila debe ser el id del paciente
                <tr key={paciente.id}>
                  <td>{paciente.nombre}</td>
                  <td>{paciente.dni}</td>
                  <td>{paciente.obra_social}</td>
                  <td>
                    {/* Badge con color de fondo según el estado (getStatusColor) y texto con ícono (getStatusBadge) */}
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(paciente.activo ? 'activo' : 'inactivo') }}
                    >
                      {/* getStatusBadge devuelve el texto con ícono del estado */}
                      {getStatusBadge(paciente.activo ? 'activo' : 'inactivo')}
                    </span>
                  </td>
                  <td className="acciones">
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
                        onClick={() => handleEliminarPaciente(paciente.id)}
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
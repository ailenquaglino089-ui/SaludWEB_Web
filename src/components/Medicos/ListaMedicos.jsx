// Importamos React y los hooks useState y useEffect para el manejo de estado y ciclo de vida.
import React, { useState, useEffect } from 'react';
// Importamos la instancia de axios configurada (base URL + interceptores de token y 401).
import client from '../../api/client';
// Importamos el componente de formulario que se muestra al crear/editar.
import FormularioMedico from './FormularioMedico';
// Importamos el hook useAuth para conocer el rol del usuario (RBAC en la UI).
import { useAuth } from '../../hooks/useAuth';
// Importamos utilidades CRUD: manejo de errores de API, extracción de datos y helpers de badges de estado.
import { handleApiError, getDatos, getStatusBadge, getStatusColor } from '../../utils/crudHelpers';
// Importamos los estilos CSS compartidos.
import './Medicos.css';

// Componente principal: lista de médicos con operaciones CRUD completas.
export default function ListaMedicos() {
  // Obtenemos el usuario logueado desde el contexto de autenticación.
  const { usuario } = useAuth();
  // RBAC en UI: 'esAdmin' es true solo si el tipo_usuario del usuario es 'admin'.
  const esAdmin = usuario?.tipo_usuario === 'admin';
  // Estado con el listado de médicos obtenidos de la API.
  const [medicos, setMedicos] = useState([]);
  // Estado de carga: controla la visualización del spinner mientras llega la respuesta.
  const [cargando, setCargando] = useState(true);
  // Estado del mensaje de error global de la lista (null = sin error).
  const [error, setError] = useState(null);
  // Estado que alterna entre mostrar la lista o el formulario de médico.
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  // Estado que guarda el médico en edición (null = modo alta nueva).
  const [medicoEditando, setMedicoEditando] = useState(null);
  // Estado del texto de búsqueda para filtrar la tabla.
  const [busqueda, setBusqueda] = useState('');

  // useEffect de montaje: carga los médicos la primera vez que se renderiza el componente.
  useEffect(() => {
    cargarMedicos();
  }, []); // Dependencias vacías: se ejecuta una sola vez

  // Función asíncrona que obtiene los médicos desde el backend.
  const cargarMedicos = async () => {
    try {
      // Activamos el estado de carga antes de hacer la petición.
      setCargando(true);
      // GET a /api/medicos usando la instancia de axios (client) que agrega el token JWT automáticamente.
      const response = await client.get('/api/medicos');
      // getDatos extrae la lista real de la envoltura de la API ({ ok, mensaje, data }).
      setMedicos(getDatos(response, []));
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

  // Handler del botón "Nuevo Médico": prepara el modo alta nueva.
  const handleNuevoMedico = () => {
    // Limpiamos el médico en edición para que el formulario arranque vacío.
    setMedicoEditando(null);
    // Mostramos el formulario.
    setMostrarFormulario(true);
  };

  // Handler del botón "Editar": recibe el médico de la fila.
  const handleEditarMedico = (medico) => {
    // Guardamos el médico para precargar los datos en el formulario.
    setMedicoEditando(medico);
    // Mostramos el formulario en modo edición.
    setMostrarFormulario(true);
  };

  // Handler del botón "Eliminar": recibe el id del médico.
  const handleEliminarMedico = async (id) => {
    // Confirmación nativa del navegador: si el usuario cancela, salimos sin eliminar.
    if (!window.confirm('¿Estás seguro de que quieres eliminar este médico?')) return;

    try {
      // DELETE a /api/medicos/{id} (el interceptor de client adjunta el token).
      await client.delete(`/api/medicos/${id}`);
      // Actualizamos el estado local filtrando el médico eliminado (optimiza sin recargar).
      setMedicos(medicos.filter(m => m.id !== id));
      // Limpiamos errores tras operación exitosa.
      setError(null);
    } catch (err) {
      // Mostramos el mensaje de error traducido de la API.
      setError(handleApiError(err));
    }
  };

  // Handler del guardado: recibe los datos provenientes de FormularioMedico.
  const handleGuardarMedico = async (datosFormulario) => {
    try {
      if (medicoEditando) {
        // Actualizar
        // PUT a /api/medicos/{id} con los datos editados.
        await client.put(`/api/medicos/${medicoEditando.id}`, datosFormulario);
        // Reemplazamos en el estado el médico editado, conservando su id.
        setMedicos(medicos.map(m => m.id === medicoEditando.id ? { ...datosFormulario, id: medicoEditando.id } : m));
      } else {
        // Crear
        // POST a /api/medicos con los datos nuevos (create).
        const response = await client.post('/api/medicos', datosFormulario);
        // Agregamos el médico creado (devuelto por la API) al final de la lista local.
        setMedicos([...medicos, getDatos(response)]);
      }
      // Tras guardar, ocultamos el formulario.
      setMostrarFormulario(false);
      // Limpiamos el médico en edición para futuros formularios.
      setMedicoEditando(null);
      // Limpiamos errores.
      setError(null);
    } catch (err) {
      // Mostramos el error de la API en la lista.
      setError(handleApiError(err));
    }
  };

  // Filtrado por búsqueda: filtra los médicos por nombre, matrícula o especialidad.
  const medicosFiltr = medicos.filter(m =>
    // Compara nombre (en minúsculas) contra el texto de búsqueda (en minúsculas)
    m.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    // Compara matrícula contra el texto de búsqueda
    m.matricula?.toLowerCase().includes(busqueda.toLowerCase()) ||
    // Compara especialidad contra el texto de búsqueda
    m.especialidad?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Si 'mostrarFormulario' es true, en lugar de la lista renderizamos el formulario.
  if (mostrarFormulario) {
    return (
      <FormularioMedico
        // La prop 'medico' es el objeto a editar o null para alta nueva
        medico={medicoEditando}
        // La prop 'onGuardar' es el callback que recibe los datos del formulario
        onGuardar={handleGuardarMedico}
        // La prop 'onCancelar' restaura la vista de la lista
        onCancelar={() => {
          setMostrarFormulario(false);
          setMedicoEditando(null);
        }}
      />
    );
  }

  return (
    // Contenedor principal de la lista.
    <div className="lista-container">
      {/* Cabecera con título y botón de nuevo médico */}
      <div className="lista-header">
        <h1>👨‍⚕️ Gestión de Médicos</h1>
        {/* Botón que dispara el modo alta nueva */}
        <button className="btn btn-primary" onClick={handleNuevoMedico}>
          ➕ Nuevo Médico
        </button>
      </div>

      {/* Renderizado condicional: solo mostramos el alert si hay error */}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Barra de búsqueda */}
      <div className="lista-filtro">
        {/* Input controlado por el estado 'busqueda': cada tecla actualiza la búsqueda */}
        <input
          type="text"
          placeholder="🔍 Buscar por nombre, matrícula o especialidad..."
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
          <p>Cargando médicos...</p>
        </div>
      ) : medicosFiltr.length === 0 ? (
        // Estado 2: el filtro no devolvió resultados
        <div className="lista-vacia">
          <p>No hay médicos registrados</p>
        </div>
      ) : (
        // Estado 3: hay médicos para mostrar en la tabla
        <div className="tabla-container">
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Matrícula</th>
                <th>Especialidad</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {/* Iteramos sobre la lista filtrada para generar una fila por médico */}
              {medicosFiltr.map(medico => (
                // La key única por fila debe ser el id del médico
                <tr key={medico.id}>
                  <td>{medico.nombre}</td>
                  <td>{medico.matricula}</td>
                  <td>{medico.especialidad}</td>
                  <td>
                    {/* Badge con color de fondo según el estado (getStatusColor) y texto con ícono (getStatusBadge) */}
                    <span 
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(medico.activo ? 'activo' : 'inactivo') }}
                    >
                      {/* getStatusBadge devuelve el texto con ícono del estado */}
                      {getStatusBadge(medico.activo ? 'activo' : 'inactivo')}
                    </span>
                  </td>
                  <td className="acciones">
                    {/* Botón de editar: pasa el médico completo al handler */}
                    <button 
                      className="btn btn-sm btn-info"
                      onClick={() => handleEditarMedico(medico)}
                    >
                      ✏️ Editar
                    </button>
                    {/* RBAC: el botón Eliminar solo se muestra si el usuario es admin */}
                    {esAdmin && (
                      <button 
                        className="btn btn-sm btn-danger"
                        onClick={() => handleEliminarMedico(medico.id)}
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
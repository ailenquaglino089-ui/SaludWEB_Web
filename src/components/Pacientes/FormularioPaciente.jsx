// Importamos React y los hooks useState y useEffect para el manejo de estado y ciclo de vida.
import React, { useState, useEffect } from 'react';
// Importamos la instancia de axios configurada (base URL + interceptores de token y 401).
import client from '../../api/client';
// Importamos getDatos para desempacar la lista de obras sociales que devuelve la API.
import { getDatos } from '../../utils/crudHelpers';
// Importamos los estilos CSS de Pacientes.
import './Pacientes.css';

// Componente de formulario para crear/editar pacientes.
// Props: paciente (objeto a editar o null si es alta nueva), onGuardar (callback al guardar), onCancelar (callback al cancelar).
export default function FormularioPaciente({ paciente, onGuardar, onCancelar }) {
  // Estado inicial del formulario con valores por defecto.
  const [formData, setFormData] = useState({
    nombre: '',           // Nombre completo del paciente
    dni: '',              // Documento nacional de identidad
    id_obra_social: '',   // Id de la obra social (vacío = ninguna)
    activo: true          // Por defecto, un paciente nuevo se crea como activo
  });

  // Estado con la lista de obras sociales disponible para el selector.
  const [obrasSociales, setObrasSociales] = useState([]);
  // Estado con los mensajes de error de validación (objeto {campo: mensaje}).
  const [errores, setErrores] = useState({});
  // Estado de carga: mientras se obtienen las obras sociales el formulario muestra un spinner.
  const [cargando, setCargando] = useState(true);

  // useEffect de montaje: carga las obras sociales la primera vez que se renderiza.
  useEffect(() => {
    cargarObrasSociales();
  }, []); // Dependencias vacías: se ejecuta una sola vez

  // useEffect: se ejecuta cuando la prop 'paciente' cambia.
  useEffect(() => {
    // Si llegó un paciente (modo edición), precargamos sus datos en el formulario.
    if (paciente) {
      setFormData({
        // El operador || usa un valor por defecto cuando el dato viene vacío o null
        nombre: paciente.nombre || '',
        dni: paciente.dni || '',
        // El operador ?? usa el valor de la derecha solo si es null/undefined (respeta '' y 0)
        id_obra_social: paciente.id_obra_social ?? '',
        // Los valores booleanos no se pueden encadenar con ||, por eso usamos ??
        activo: paciente.activo ?? true
      });
    }
  }, [paciente]); // Dependencia: solo reacciona a cambios en 'paciente'

  // Función asíncrona que obtiene las obras sociales desde el backend.
  const cargarObrasSociales = async () => {
    try {
      // GET a /api/obras-sociales usando la instancia de axios con el token automático.
      const response = await client.get('/api/obras-sociales');
      // Guardamos el listado (con [] como valor por defecto si la API no trae data).
      setObrasSociales(getDatos(response, []));
    } catch (err) {
      // Registramos el error en consola (no es crítico para el funcionamiento del form).
      console.error('Error cargando obras sociales:', err);
    } finally {
      // Apagamos el spinner hayamos cargado o no.
      setCargando(false);
    }
  };

  // Función de validación de los campos obligatorios del formulario.
  const validar = () => {
    // Objeto de errores nuevo (vacío = sin errores).
    const newErrores = {};
    
    // Validación del nombre: vacío o solo espacios dispara el error.
    if (!formData.nombre?.trim()) newErrores.nombre = 'Nombre requerido';
    // Validación del DNI.
    if (!formData.dni?.trim()) newErrores.dni = 'DNI requerido';

    // Persistimos el objeto de errores en el estado.
    setErrores(newErrores);
    // El formulario es válido solo si no quedó ninguna clave en el objeto de errores.
    return Object.keys(newErrores).length === 0;
  };

  // Handler genérico de cambios: sirve para todos los inputs del formulario.
  const handleChange = (e) => {
    // Desestructuramos las propiedades del evento: nombre, valor, tipo y checked (para checkbox).
    const { name, value, type, checked } = e.target;
    // Actualizamos formData preservando los otros campos (spread ...prev).
    setFormData(prev => ({
      ...prev,
      // Para checkboxes usamos 'checked' (boolean); para el resto usamos 'value'.
      [name]: type === 'checkbox' ? checked : value
    }));
    // Limpiar error de este campo
    // Si el campo tenía un error previo, se limpia apenas el usuario empieza a corregirlo.
    if (errores[name]) {
      setErrores(prev => ({ ...prev, [name]: null }));
    }
  };

  // Handler del envío del formulario.
  const handleSubmit = (e) => {
    // Evitamos la recarga de página por defecto del navegador.
    e.preventDefault();
    // Solo si pasa la validación invocamos onGuardar con un payload limpio.
    if (validar()) {
      onGuardar({
        nombre: formData.nombre,
        dni: formData.dni,
        // Si no se eligió obra social se envía null (no '' ), respetando el contrato del backend.
        id_obra_social: formData.id_obra_social || null
      });
    }
  };

  // Renderizado de carga: mientras se obtienen las obras sociales mostramos solo el spinner.
  if (cargando) {
    return <div className="loading-container"><div className="spinner"></div></div>;
  }

  return (
    // Contenedor con las mismas clases de lista para mantener coherencia visual.
    <div className="lista-container">
      {/* Cabecera del formulario: título dinámico según el modo (editar o nuevo) */}
      <div className="lista-header">
        {/* Condicional: si existe 'paciente' es edición, si no es alta nueva */}
        <h1>{paciente ? '✏️ Editar Paciente' : '➕ Nuevo Paciente'}</h1>
      </div>

      {/* Formulario que dispara handleSubmit al enviarse */}
      <form className="formulario" onSubmit={handleSubmit}>
        {/* Grupo del campo Nombre Completo */}
        <div className="form-grupo">
          <label>Nombre Completo *</label>
          {/* El atributo name coincide con la clave de formData y className marca errores del campo */}
          <input
            type="text"
            name="nombre"
            value={formData.nombre}
            onChange={handleChange}
            className={errores.nombre ? 'input-error' : ''}
          />
          {/* Renderizado condicional del mensaje de error del campo */}
          {errores.nombre && <span className="error-text">{errores.nombre}</span>}
        </div>

        {/* Grupo del campo DNI */}
        <div className="form-grupo">
          <label>DNI *</label>
          <input
            type="text"
            name="dni"
            value={formData.dni}
            onChange={handleChange}
            className={errores.dni ? 'input-error' : ''}
            placeholder="Ej: 12345678"
          />
          {/* Renderizado condicional del mensaje de error del DNI */}
          {errores.dni && <span className="error-text">{errores.dni}</span>}
        </div>

        {/* Grupo del selector de Obra Social */}
        <div className="form-grupo">
          <label>Obra Social</label>
          {/* Select controlado por el estado: value es el id de obra social elegida y cada cambio lo actualiza */}
          <select
            name="id_obra_social"
            value={formData.id_obra_social}
            onChange={handleChange}
          >
            {/* Opción por defecto: sin obra social */}
            <option value="">Sin obra social</option>
            {/* Mapeamos las obras sociales cargadas a opciones del selector */}
            {obrasSociales.map(os => (
              // key única por opción = id de la obra social
              <option key={os.id} value={os.id}>{os.nombre_obra}</option>
            ))}
          </select>
        </div>

        {/* Grupo del checkbox de estado activo */}
        <div className="form-grupo">
          {/* El label agrupa el checkbox y su texto */}
          <label>
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
            Paciente activo
          </label>
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
// Importamos React y los hooks useState y useEffect (este archivo usa sintaxis JSX que requiere React en scope).
import React, { useState, useEffect } from 'react';
// Importamos los estilos CSS compartidos de los módulos de listas y formularios.
import './Medicos.css';

// Componente de formulario para crear/editar médicos.
// Props: medico (objeto a editar o null si es alta nueva), onGuardar (callback al guardar), onCancelar (callback al cancelar).
export default function FormularioMedico({ medico, onGuardar, onCancelar }) {
  // Estado inicial del formulario con valores por defecto (usados en alta nueva).
  const [formData, setFormData] = useState({
    nombre: '',        // Nombre del médico
    matricula: '',     // Número de matrícula
    especialidad: '',  // Especialidad del médico
    activo: true       // Por defecto, un médico nuevo se crea como activo
  });

  // Estado con los mensajes de error de validación (objeto {campo: mensaje}).
  const [errores, setErrores] = useState({});

  // useEffect: se ejecuta cuando la prop 'medico' cambia.
  useEffect(() => {
    // Si llegó un médico (modo edición), cargamos sus datos en el formulario.
    if (medico) {
      setFormData(medico);
    }
  }, [medico]); // Dependencia: solo reacciona a cambios en 'medico'

  // Función de validación de los campos obligatorios del formulario.
  const validar = () => {
    // Objeto de errores nuevo (vacío = sin errores).
    const newErrores = {};
    
    // Validación del nombre: vacío o solo espacios dispara el error del campo.
    if (!formData.nombre?.trim()) newErrores.nombre = 'Nombre requerido';
    // Validación de la matrícula.
    if (!formData.matricula?.trim()) newErrores.matricula = 'Número de matrícula requerido';
    // Validación de la especialidad.
    if (!formData.especialidad?.trim()) newErrores.especialidad = 'Especialidad requerida';

    // Persistimos el objeto de errores en el estado.
    setErrores(newErrores);
    // El formulario es válido solo si no quedó ninguna clave en el objeto de errores.
    return Object.keys(newErrores).length === 0;
  };

  // Handler genérico de cambios: sirve para todos los inputs del formulario.
  const handleChange = (e) => {
    // Desestructuramos las propiedades relevantes del evento: nombre, valor, tipo y checked (para checkbox).
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
    // Solo si pasa la validación invocamos onGuardar con los datos del formulario.
    if (validar()) {
      onGuardar(formData);
    }
  };

  return (
    // Contenedor con las mismas clases de lista para mantener coherencia visual.
    <div className="lista-container">
      {/* Cabecera del formulario: título dinámico según el modo (editar o nuevo) */}
      <div className="lista-header">
        {/* Condicional: si existe 'medico' es edición, si no es alta nueva */}
        <h1>{medico ? '✏️ Editar Médico' : '➕ Nuevo Médico'}</h1>
      </div>

      {/* Formulario que dispara handleSubmit al enviarse */}
      <form className="formulario" onSubmit={handleSubmit}>
        {/* Grupo del campo Nombre */}
        <div className="form-grupo">
          <label>Nombre *</label>
          {/* El atributo name coincide con la clave de formData usada en handleChange */}
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

        {/* Grupo del campo Matrícula */}
        <div className="form-grupo">
          <label>Matrícula *</label>
          <input
            type="text"
            name="matricula"
            value={formData.matricula}
            onChange={handleChange}
            className={errores.matricula ? 'input-error' : ''}
            placeholder="Ej: MP-123456"
          />
          {/* Renderizado condicional del mensaje de error de la matrícula */}
          {errores.matricula && <span className="error-text">{errores.matricula}</span>}
        </div>

        {/* Grupo del campo Especialidad */}
        <div className="form-grupo">
          <label>Especialidad *</label>
          <input
            type="text"
            name="especialidad"
            value={formData.especialidad}
            onChange={handleChange}
            className={errores.especialidad ? 'input-error' : ''}
            placeholder="Ej: Cardiología, Dermatología"
          />
          {/* Renderizado condicional del mensaje de error de la especialidad */}
          {errores.especialidad && <span className="error-text">{errores.especialidad}</span>}
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
            Médico activo
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
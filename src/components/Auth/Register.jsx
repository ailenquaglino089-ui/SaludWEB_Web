// Importamos useState para manejar el estado del formulario de registro.
import { useState } from 'react';
// Importamos useNavigate (redirección tras registrarse) y Link (navegación interna).
import { useNavigate, Link } from 'react-router-dom';
// Importamos el hook useAuth: acceso a las funciones registro y login del contexto.
import { useAuth } from '../../hooks/useAuth';
// Importamos los estilos CSS compartidos de la pantalla de autenticación.
import './Auth.css';

// Componente funcional Register: formulario de creación de cuenta.
export default function Register() {
  // Estado único que contiene todos los valores del formulario como objeto.
  const [formData, setFormData] = useState({
    nombre: '',              // Nombre completo del usuario
    email: '',               // Email del usuario
    password: '',            // Contraseña elegida
    confirmPassword: '',     // Re-escritura de la contraseña (para validación)
    tipo_usuario: 'paciente' // Rol por defecto al crear la cuenta (paciente)
  });
  const [verPassword, setVerPassword] = useState(false);
  const [verConfirmacion, setVerConfirmacion] = useState(false);
  // Estado del mensaje de error a mostrar al usuario (cadena vacía = sin error).
  const [error, setError] = useState('');
  // Estado de carga: deshabilita el formulario mientras se procesa el registro.
  const [cargando, setCargando] = useState(false);

  // Hook de react-router para navegar programáticamente tras registrarse.
  const navigate = useNavigate();
  // Extraemos las funciones registro y login del contexto de autenticación.
  const { registro, login } = useAuth();

  // Handler genérico de cambios: sirve para todos los inputs del formulario.
  const handleChange = (e) => {
    // Desestructuramos name (atributo "name" del input) y value (valor actual).
    const { name, value } = e.target;
    // Actualizamos formData preservando los demás campos (spread ...prev) y usando name como clave dinámica.
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handler del envío del formulario (ejecutado al presionar "Crear Cuenta").
  const handleSubmit = async (e) => {
    // Evitamos la recarga de página por defecto del navegador.
    e.preventDefault();
    // Limpiamos errores previos antes de validar de nuevo.
    setError('');

    // Validación
    // Si la contraseña y su confirmación no coinciden se corta el registro.
    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden');
      return; // Salimos del handler sin enviar nada al servidor
    }

    // Cada persona elige la contraseña que quiera. La única regla es que no
    // esté vacía: el campo tiene `required`, pero este mensaje es más claro.
    if (formData.password.trim() === '') {
      setError('Escribí una contraseña (puede ser la que quieras)');
      return; // Salimos del handler sin enviar nada al servidor
    }

    // Superadas las validaciones, activamos el estado de carga.
    setCargando(true);

    try {
      // Llamamos a la función registro del contexto con los datos del formulario.
      await registro(
        formData.email,          // Email del usuario
        formData.password,       // Contraseña
        formData.nombre,         // Nombre completo
        formData.tipo_usuario    // Rol seleccionado (paciente o medico)
      );

      // Auto-login después del registro
      // Iniciamos sesión automáticamente con las mismas credenciales para no obligar a otro paso.
      await login(formData.email, formData.password);
      // Redirigimos al Dashboard con la sesión ya activa.
      navigate('/dashboard');
    } catch (err) {
      // Extraemos el mensaje de error del backend (err.response de axios) o usamos un texto genérico.
      setError(err.response?.data?.mensaje || err.response?.data?.error || 'Error en el registro');
    } finally {
      // El bloque finally se ejecuta siempre: desactivamos el estado de carga.
      setCargando(false);
    }
  };

  return (
    // Contenedor principal que centra la tarjeta en toda la pantalla.
    <div className="auth-container">
      {/* Tarjeta blanca con el formulario */}
      <div className="auth-card">
        {/* Encabezado visual con la marca de la aplicación */}
        <div className="auth-header">
          <h1>SaludWEB <span className="auth-brand-pro">PRO</span></h1>
          <p>Sistema de Gestión de Salud</p>
        </div>

        {/* Formulario de registro: al enviarse ejecuta handleSubmit */}
        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Crear Cuenta</h2>

          {/* Renderizado condicional: si hay error lo mostramos en un bloque rojo */}
          {error && <div className="error-message">{error}</div>}

          {/* Grupo del campo de nombre completo */}
          <div className="form-group">
            <label htmlFor="nombre">Nombre Completo</label>
            {/* El atributo name debe coincidir con la clave de formData que actualiza handleChange */}
            <input
              id="nombre"
              type="text"
              name="nombre"
              placeholder="Juan García"
              value={formData.nombre}
              onChange={handleChange}
              required
              disabled={cargando}
            />
          </div>

          {/* Grupo del campo de email */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              name="email"
              placeholder="tu@email.com"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={cargando}
            />
          </div>

          {/* Grupo del selector de tipo de usuario (rol) */}
          <div className="form-group">
            <label htmlFor="tipo_usuario">Tipo de Usuario</label>
            <select
              id="tipo_usuario"
              name="tipo_usuario"
              value={formData.tipo_usuario}
              onChange={handleChange}
              disabled={cargando}
            >
              {/* Cada <option> tiene como value el valor guardado en el backend */}
              <option value="paciente">Paciente</option>
              <option value="medico">Médico</option>
            </select>
          </div>

          {/* Grupo del campo de contraseña */}
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-input-wrapper">
              <input
                id="password"
                type={verPassword ? 'text' : 'password'}
                name="password"
                placeholder="La que quieras"
                value={formData.password}
                onChange={handleChange}
                required
                disabled={cargando}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setVerPassword((visible) => !visible)}
                disabled={cargando}
                aria-label={verPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-controls="password"
                aria-pressed={verPassword}
              >
                {verPassword ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {/* Grupo del campo de confirmación de contraseña */}
          <div className="form-group">
            <label htmlFor="confirmPassword">Confirmar Contraseña</label>
            <div className="password-input-wrapper">
              <input
                id="confirmPassword"
                type={verConfirmacion ? 'text' : 'password'}
                name="confirmPassword"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                disabled={cargando}
                autoComplete="new-password"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setVerConfirmacion((visible) => !visible)}
                disabled={cargando}
                aria-label={verConfirmacion ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                aria-controls="confirmPassword"
                aria-pressed={verConfirmacion}
              >
                {verConfirmacion ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {/* Botón de envío: cambia su texto mientras carga y se deshabilita */}
          <button
            type="submit"
            className="btn-primary"
            disabled={cargando}
          >
            {/* Condicional: texto alternativo durante el registro */}
            {cargando ? 'Registrando...' : 'Crear Cuenta'}
          </button>
        </form>

        {/* Pie del form: enlace a la pantalla de login para quien ya tiene cuenta */}
        <div className="auth-footer">
          {/* Link de react-router navega sin recargar la página */}
          <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p>
          {/* En mobile el navbar se oculta en login/registro; este enlace permite
              volver a la HOME sin depender del botón Atrás del navegador. */}
          <p className="auth-home-link"><Link to="/">← Volver al inicio</Link></p>
        </div>
      </div>
    </div>
  );
}
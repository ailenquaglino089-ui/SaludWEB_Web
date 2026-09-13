// Importamos useState para manejar el estado de los campos del formulario y del proceso de envío.
import { useState } from 'react';
// Importamos useNavigate (redirección programática tras el login) y Link (navegación interna).
import { useNavigate, Link } from 'react-router-dom';
// Importamos el hook useAuth: nos da acceso al contexto de autenticación y la función login.
import { useAuth } from '../../hooks/useAuth';
// Importamos los estilos CSS compartidos de la pantalla de autenticación.
import './Auth.css';

// Componente funcional Login: formulario de inicio de sesión.
export default function Login() {
  // Estado del input de email (controlado).
  const [email, setEmail] = useState('');
  // Estado del input de contraseña (controlado).
  const [password, setPassword] = useState('');
  // Estado del mensaje de error a mostrar al usuario (cadena vacía = sin error).
  const [error, setError] = useState('');
  // Estado de carga: deshabilita el formulario mientras se procesa el login.
  const [cargando, setCargando] = useState(false);
  
  // Hook de react-router para navegar programáticamente después de iniciar sesión.
  const navigate = useNavigate();
  // Extraemos la función login del contexto de autenticación (hace el POST a la API y guarda el token).
  const { login } = useAuth();

  // Handler del evento submit del formulario (se ejecuta al presionar "Iniciar Sesión").
  const handleSubmit = async (e) => {
    // Evitamos la recarga de página que el navegador haría por defecto al enviar un <form>.
    e.preventDefault();
    // Limpiamos cualquier error previo para empezar un intento nuevo.
    setError('');
    // Activamos el estado de carga para dar feedback y bloquear dobles envíos.
    setCargando(true);

    try {
      // Llamamos a la función login del contexto con las credenciales ingresadas.
      await login(email, password);
      // Si el login tuvo éxito, redirigimos al Dashboard.
      navigate('/dashboard');
    } catch (err) {
      // En caso de error, extraemos el mensaje del backend (respuesta de axios en err.response) o usamos un texto genérico.
      setError(err.response?.data?.mensaje || err.response?.data?.error || 'Error al iniciar sesión');
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
          <h1>🏥 SaludWEB</h1>
          <p>Sistema de Gestión de Salud</p>
        </div>

        {/* Formulario de login: al enviarse ejecuta handleSubmit */}
        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Iniciar Sesión</h2>

          {/* Renderizado condicional: si hay error lo mostramos en un bloque rojo */}
          {error && <div className="error-message">{error}</div>}

          {/* Grupo del campo de email */}
          <div className="form-group">
            {/* htmlFor/id conectan la etiqueta con el input (accesibilidad: clic en label enfoca el input) */}
            <label htmlFor="email">Email</label>
            {/* El value proviene del estado email (input controlado); cada tecla lo actualiza y se deshabilita mientras carga */}
            <input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={cargando}
            />
          </div>

          {/* Grupo del campo de contraseña */}
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            {/* type="password" enmascara los caracteres; el value proviene del estado password y cada tecla lo actualiza */}
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={cargando}
            />
          </div>

          {/* Botón de envío: cambia su texto mientras carga y se deshabilita */}
          <button
            type="submit"
            className="btn-primary"
            disabled={cargando}
          >
            {/* Condicional: texto alternativo durante el envío */}
            {cargando ? 'Iniciando sesión...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Pie del form: enlace a la página de registro para nuevos usuarios */}
        <div className="auth-footer">
          {/* Link de react-router navega sin recargar la página */}
          <p>¿No tienes cuenta? <Link to="/register">Regístrate aquí</Link></p>
        </div>
      </div>
    </div>
  );
}
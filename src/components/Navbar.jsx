// Importamos <Link> de react-router-dom: permite navegar entre rutas de la SPA sin recargar la página.
import { Link } from 'react-router-dom';
// Importamos el hook useAuth: nos da acceso al contexto de autenticación (usuario, logout, autenticado).
import { useAuth } from '../hooks/useAuth';
// Importamos los estilos CSS específicos de la barra de navegación.
import './Navbar.css';
// Importamos useState de React para controlar el estado del menú desplegable en móviles.
import { useState } from 'react';

// Componente funcional Navbar: barra de navegación superior de toda la aplicación.
export default function Navbar() {
  // Desestructuramos el contexto de autenticación: datos del usuario logueado, función de cierre de sesión y flag de autenticación.
  const { usuario, logout, autenticado } = useAuth();
  // Estado local: indica si el menú desplegable (hamburguesa) está abierto o cerrado en vista móvil.
  const [menuAbierto, setMenuAbierto] = useState(false);

  // Handler del botón "Cerrar Sesión": cierra la sesión y redirige al login.
  const handleLogout = async () => {
    // Esperamos a que logout() del contexto finalice (limpia el token y el estado de usuario).
    await logout();
    // Redirigimos forzosamente a /login (recarga completa de la SPA para reiniciar el estado).
    window.location.href = '/login';
  };

  // Si no hay una sesión activa no mostramos la navbar (ej: en las pantallas de login/registro).
  if (!autenticado) {
    return null;  // No mostrar navbar en login/register
  }

  return (
    // Elemento raíz de la barra de navegación, con la clase que le da el estilo fijo (sticky) arriba.
    <nav className="navbar">
      {/* Contenedor interno que centra y distribuye el contenido con flexbox */}
      <div className="navbar-container">
        {/* Marca / logo de la aplicación: al hacer clic navega al Dashboard */}
        <Link to="/dashboard" className="navbar-brand">
          🏥 SaludWEB
        </Link>

        {/* Botón "hamburguesa" (☰): solo visible en pantallas pequeñas, alterna el estado menuAbierto */}
        <button
          className="navbar-toggle"
          onClick={() => setMenuAbierto(!menuAbierto)}
        >
          ☰
        </button>

        {/* Menú de navegación: agrega la clase 'open' cuando está desplegado en móvil */}
        <div className={`navbar-menu ${menuAbierto ? 'open' : ''}`}>
          {/* Grupo de enlaces principales del sistema */}
          <div className="navbar-links">
            <Link to="/dashboard" className="navbar-link">Dashboard</Link>
            <Link to="/medicos" className="navbar-link">Médicos</Link>
            <Link to="/pacientes" className="navbar-link">Pacientes</Link>
            <Link to="/prescripciones" className="navbar-link">Prescripciones</Link>
          </div>

          {/* Sección que muestra la identidad del usuario y el botón de cierre de sesión */}
          <div className="navbar-user">
            {/* Span con el nombre del usuario */}
            <span className="user-name">
              {/* Operador ?. : si 'usuario' existe, muestra su nombre (evita errores si es null) */}
              {usuario?.nombre}
              {/* Solo si el usuario tiene 'tipo_usuario' definido, renderiza su rol como badge */}
              {usuario?.tipo_usuario && (
                <span className="user-role">{usuario.tipo_usuario}</span>
              )}
            </span>
            {/* Botón de cierre de sesión que invoca el handler handleLogout */}
            <button className="btn-logout" onClick={handleLogout}>
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
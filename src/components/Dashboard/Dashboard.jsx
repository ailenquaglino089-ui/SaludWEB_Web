// Importamos el hook useAuth para acceder a los datos del usuario autenticado.
import { useAuth } from '../../hooks/useAuth';
// Importamos los estilos CSS del Dashboard.
import './Dashboard.css';

// Componente funcional Dashboard: pantalla de bienvenida con accesos y estadísticas.
export default function Dashboard() {
  // Extraemos el objeto usuario del contexto de autenticación (puede ser null si no hay sesión).
  const { usuario } = useAuth();

  return (
    // Contenedor principal del Dashboard.
    <div className="dashboard">
      {/* Cabecera de bienvenida con el nombre del usuario */}
      <div className="dashboard-header">
        {/* El operador ?. evita errores si 'usuario' es null */}
        <h1>👋 Bienvenidos a SaludWEB</h1>
        <p>Sistema de Gestión de Salud - SaludWEB</p>
      </div>

      {/* Grid de tarjetas de acceso rápido a los módulos */}
      <div className="dashboard-grid">
        {/* Tarjeta de acceso al módulo de Médicos */}
        <div className="dashboard-card">
          {/* Ícono representativo del módulo */}
          <div className="card-icon">👨‍⚕️</div>
          <h3>Médicos</h3>
          <p>Gestiona médicos y especialistas</p>
          {/* Enlace directo a la ruta /medicos */}
          <a href="/medicos" className="card-link">Ver Médicos →</a>
        </div>

        {/* Tarjeta de acceso al módulo de Pacientes */}
        <div className="dashboard-card">
          <div className="card-icon">👤</div>
          <h3>Pacientes</h3>
          <p>Administra la información de pacientes</p>
          {/* Enlace directo a la ruta /pacientes */}
          <a href="/pacientes" className="card-link">Ver Pacientes →</a>
        </div>

        {/* Tarjeta de acceso al módulo de Prescripciones */}
        <div className="dashboard-card">
          <div className="card-icon">💊</div>
          <h3>Prescripciones</h3>
          <p>Gestiona recetas médicas</p>
          {/* Enlace directo a la ruta /prescripciones */}
          <a href="/prescripciones" className="card-link">Ver Prescripciones →</a>
        </div>

        {/* Tarjeta de acceso a la Configuración */}
        <div className="dashboard-card">
          <div className="card-icon">⚙️</div>
          <h3>Configuración</h3>
          <p>Ajusta tus preferencias</p>
          {/* Enlace directo a la ruta /configuracion */}
          <a href="/configuracion" className="card-link">Ir a Configuración →</a>
        </div>
      </div>

      {/* Sección de estadísticas (datos de ejemplo fijos en esta versión) */}
      <div className="dashboard-stats">
        {/* Indicador de médicos registrados */}
        <div className="stat-box">
          {/* Valor numérico de la estadística */}
          <p className="stat-value">42</p>
          {/* Descripción de la estadística */}
          <p className="stat-label">Médicos Registrados</p>
        </div>
        {/* Indicador de pacientes activos */}
        <div className="stat-box">
          <p className="stat-value">156</p>
          <p className="stat-label">Pacientes Activos</p>
        </div>
        {/* Indicador de prescripciones emitidas */}
        <div className="stat-box">
          <p className="stat-value">389</p>
          <p className="stat-label">Prescripciones Emitidas</p>
        </div>
      </div>

      {/* Sección informativa sobre la aplicación */}
      <div className="dashboard-info">
        <h2>📚 Sobre SaludWEB</h2>
        <p>
          SaludWEB es una aplicación web profesional para la gestión integral de sistemas de salud.
          Construida siguiendo los patrones y arquitecturas modernas de Programación IV.
        </p>
        <p>
          {/* Solo el texto que está entre <strong> se resalta en negrita */}
          <strong>Características principales:</strong>
        </p>
        {/* Lista no ordenada con las características destacadas */}
        <ul>
          <li>API REST desacoplada (Backend + Frontend)</li>
          <li>Autenticación segura con JWT</li>
          <li>CRUD completo de Médicos, Pacientes y Prescripciones</li>
          <li>Interfaz responsiva y moderna</li>
          <li>Validaciones y manejo de errores robusto</li>
        </ul>
      </div>
    </div>
  );
}
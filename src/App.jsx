import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
// Importa las herramientas de React Router: BrowserRouter (enrutador HTML5), Routes/Route (definen rutas) y Navigate (redirección declarativa)
import { AuthProvider, AuthContext } from './context/AuthContext.jsx';
// Importa el Provider (provee la autenticación a toda la app) y el Context (para consumir el estado de sesión)
import { useContext } from 'react';
// Importa useContext, el hook de React para leer el valor de un Context (en este caso, AuthContext)

import Navbar from './components/Navbar';
// Barra de navegación que se muestra en todas las páginas de la aplicación
import Login from './components/Auth/Login';
// Componente de la pantalla de inicio de sesión (login desde frontend desacoplado)
import Register from './components/Auth/Register';
// Componente del formulario de registro de nuevos usuarios
import Dashboard from './components/Dashboard/Dashboard';
// Componente del panel principal que ve el usuario autenticado
import ListaMedicos from './components/Medicos/ListaMedicos';
// Componente que lista los médicos (operaciones CRUD sobre el recurso médicos)
import ListaPacientes from './components/Pacientes/ListaPacientes';
// Componente que lista los pacientes (operaciones CRUD sobre el recurso pacientes)
import ListaPrescripciones from './components/Prescripciones/ListaPrescripciones';
// Componente que lista las prescripciones (operaciones CRUD sobre el recurso prescripciones)
import './App.css';
// Importa los estilos globales de la aplicación

// Componente protegido: solo accesible si está autenticado
function ProtectedRoute({ children }) {
  // ProtectedRoute actúa como "guardia de ruta": envuelve páginas que requieren sesión activa
  const { autenticado, cargando } = useContext(AuthContext);
  // Lee del contexto si el usuario está autenticado (autenticado) y si la sesión aún se está verificando (cargando)

  if (cargando) {
    // Mientras se verifica la sesión en el backend no se decide nada aún
    return (
      // Retorna un indicador visual de carga para evitar "flashes" de pantallas no autorizadas
      <div className="loading-container">
        {/* Contenedor del estado de carga con estilos centrados */}
        <div className="spinner"></div>
        {/* Spinner animado: círculo giratorio que indica actividad */}
        <p>Cargando...</p>
        {/* Texto de apoyo que acompaña al spinner */}
      </div>
    );
  }

  if (!autenticado) {
    // Si terminó la carga y no hay sesión, se redirige al login
    return <Navigate to="/login" />;
    // <Navigate> redirige automáticamente al formulario de login
  }

  return children;
  // Si la sesión es válida, se renderizan los hijos (la página protegida solicitada)
}

function AppContent() {
  // AppContent define la estructura y las rutas de la aplicación (usa el contexto de sesión)
  const { autenticado } = useContext(AuthContext);
  // Obtiene el estado de autenticación para decidir redirecciones en /login, /register y la raíz

  return (
    // Retorna la estructura visual principal de la SPA
    <div className="app">
      {/* Contenedor principal de la aplicación (layout en columna) */}
      <Navbar />
      {/* Barra de navegación superior, visible en todas las rutas */}
      
      <main className="main-content">
        {/* Zona principal de contenido donde se renderiza la ruta activa */}
        <Routes>
          {/* Routes: define el conjunto de rutas; Route mapea una URL a un componente */}
          {/* Rutas públicas */}
          {/* Zona pública: estas rutas NO requieren estar autenticado */}
          {/* Ruta de login: si ya está autenticado, saltarse el login e ir al dashboard; si no, mostrar Login */}
          <Route 
            path="/login" 
            element={autenticado ? <Navigate to="/dashboard" /> : <Login />}
          />
          {/* Ruta de registro: si ya está autenticado, saltarse el registro e ir al dashboard; si no, mostrar Register */}
          <Route 
            path="/register" 
            element={autenticado ? <Navigate to="/dashboard" /> : <Register />}
          />

          {/* Rutas protegidas */}
          {/* Zona protegida: cada ruta está envuelta en ProtectedRoute para exigir sesión */}
          {/* Ruta del panel principal: se renderiza el Dashboard al visitar /dashboard */}
          <Route 
            path="/dashboard" 
            element={
              <ProtectedRoute>
                {/* ProtectedRoute valida sesión antes de permitir el acceso */}
                <Dashboard />
                {/* Si la sesión es válida, se muestra el panel principal */}
              </ProtectedRoute>
            }
          />

          {/* Ruta de médicos: se renderiza ListaMedicos al visitar /medicos */}
          <Route 
            path="/medicos" 
            element={
              <ProtectedRoute>
                {/* Se exige estar autenticado para acceder */}
                <ListaMedicos />
                {/* Lista de médicos (protegida) */}
              </ProtectedRoute>
            }
          />

          {/* Ruta de pacientes: se renderiza ListaPacientes al visitar /pacientes */}
          <Route 
            path="/pacientes" 
            element={
              <ProtectedRoute>
                {/* Se exige estar autenticado para acceder */}
                <ListaPacientes />
                {/* Lista de pacientes (protegida) */}
              </ProtectedRoute>
            }
          />

          {/* Ruta de prescripciones: se renderiza ListaPrescripciones al visitar /prescripciones */}
          <Route 
            path="/prescripciones" 
            element={
              <ProtectedRoute>
                {/* Se exige estar autenticado para acceder */}
                <ListaPrescripciones />
                {/* Lista de prescripciones (protegida) */}
              </ProtectedRoute>
            }
          />

          {/* Ruta por defecto */}
          {/* Ruta raíz "/": si no coincide con ninguna, redirige según el estado de sesión */}
          <Route path="/" element={<Navigate to={autenticado ? "/dashboard" : "/login"} />} />
          {/* Si hay sesión va al dashboard; si no, al login. Así nunca queda una pantalla vacía */}

          {/* 404 */}
          {/* Cualquier URL que no exista (comodín "*") se lleva a la ruta por defecto */}
          <Route path="*" element={<Navigate to="/" />} />
          {/* Redirige las rutas inexistentes para evitar errores de pantalla en blanco */}
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  // Componente raíz exportado por defecto; es el que monta main.jsx
  return (
    // Retorna el árbol de componentes de nivel superior
    <BrowserRouter>
      {/* BrowserRouter: enrutador que sincroniza las rutas con la URL del navegador (SPA) */}
      <AuthProvider>
        {/* AuthProvider: entrega el estado de autenticación y los métodos de login/registro/verificarSesion a todo el árbol */}
        <AppContent />
        {/* AppContent consume el contexto de sesión para armar el navbar, las rutas públicas y las protegidas */}
      </AuthProvider>
    </BrowserRouter>
  );
}
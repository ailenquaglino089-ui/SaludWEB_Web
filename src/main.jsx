import React from 'react'
// Importa React (necesario en este archivo para el JSX y React.StrictMode)
import ReactDOM from 'react-dom/client'
// Importa ReactDOM, el paquete que conecta React con el DOM del navegador (crea el "root" moderno)
import App from './App.jsx'
// Importa el componente App (raíz de la aplicación) desde el archivo App.jsx
import './App.css'
// Importa los estilos globales CSS para que se apliquen a toda la SPA

// createRoot: crea el punto de montaje de React sobre el elemento <div id="root"> de index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  // .render(): renderiza (pinta) el árbol de componentes dentro del contenedor #root
  <React.StrictMode>
    {/* StrictMode: envoltura de desarrollo que detecta errores, efectos con doble ejecución y componentes con problemas */}
    <App />
    {/* Renderiza el componente principal de la aplicación (BrowserRouter + AuthProvider + rutas) */}
  </React.StrictMode>,
)
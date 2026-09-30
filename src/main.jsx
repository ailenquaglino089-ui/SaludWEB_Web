import React from 'react'
// Importa React (necesario en este archivo para el JSX y React.StrictMode)
import ReactDOM from 'react-dom/client'
// Importa ReactDOM, el paquete que conecta React con el DOM del navegador (crea el "root" moderno)
import App from './App.jsx'
// Importa el componente App (raíz de la aplicación) desde el archivo App.jsx
import './App.css'
// Importa los estilos globales CSS para que se apliquen a toda la SPA

// Registro del Service Worker SOLO en el build de producción.
//
// El service worker da el arranque offline (abrir la SPA sin red) y permite
// instalarla como PWA. En desarrollo no se registra: Vite sirve los módulos
// en vivo y un SW que cachee interferiría con el hot reload sin aportar nada
// (además ./sw.js es un archivo del build, está en public/).
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  // Registro con ruta relativa: la app puede servirse desde un subdirectorio
  // (p.ej. dentro de XAMPP/htdocs) y el alcance del SW queda en ese directorio.
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((error) => {
      // La app funciona igual sin el SW; el fallo solo deja de dar PWA/offline.
      console.warn('Service Worker no se pudo registrar:', error)
    })
  })
}

// createRoot: crea el punto de montaje de React sobre el elemento <div id="root"> de index.html
ReactDOM.createRoot(document.getElementById('root')).render(
  // .render(): renderiza (pinta) el árbol de componentes dentro del contenedor #root
  <React.StrictMode>
    {/* StrictMode: envoltura de desarrollo que detecta errores, efectos con doble ejecución y componentes con problemas */}
    <App />
    {/* Renderiza el componente principal de la aplicación (BrowserRouter + AuthProvider + rutas) */}
  </React.StrictMode>,
)
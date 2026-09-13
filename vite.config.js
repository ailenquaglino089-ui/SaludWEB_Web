import { defineConfig } from 'vite'
// Importa definideConfig, la función de Vite que permite declarar la configuración con autocompletado de TypeScript
import react from '@vitejs/plugin-react'
// Importa el plugin oficial de React, necesario para que Vite procese JSX y el Fast Refresh de React

// export default defineConfig: expone la configuración de Vite (archivo CommonJS/ESM del proyecto, no de build)
export default defineConfig({
  // defineConfig agrupa toda la configuración del bundler y del dev server
  plugins: [react()],
  // plugins: registra el plugin de React para poder compilar archivos .jsx/.tsx
  server: {
    // server: configuración del servidor de desarrollo de Vite (solo en "npm run dev")
    port: 5173,
    // port: fija el puerto en el que se levanta el dev server (http://localhost:5173)
    proxy: {
      // proxy: redirige peticiones del frontend hacia el backend evitando problemas de CORS en desarrollo
      '/api': {
        // '/api': todas las URLs que empiecen con /api serán manejadas por el proxy
        target: 'http://localhost/Workspace_SaludWEB/repositorio_backend',
        // target: servidor de destino real (backend PHP/API ubicado en XAMPP)
        changeOrigin: true,
        // changeOrigin: cambia el Host de la petición al del backend (el servidor destino ve la petición como propia)
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        // rewrite: reescribe la ruta solicitada antes de reenviarla (aquí mantiene el prefijo /api tal cual)
      },
    },
  },
})
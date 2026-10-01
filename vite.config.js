import { defineConfig } from 'vite'
// Importa definideConfig, la función de Vite que permite declarar la configuración con autocompletado de TypeScript
import react from '@vitejs/plugin-react'
// Importa el plugin oficial de React, necesario para que Vite procese JSX y el Fast Refresh de React

// export default defineConfig: expone la configuración de Vite (archivo CommonJS/ESM del proyecto, no de build)
//
// Se recibe `command` porque `base` necesita ser distinto en desarrollo y en build,
// y no se puede usar el mismo valor para los dos casos.
export default defineConfig(({ command }) => ({
  // defineConfig agrupa toda la configuración del bundler y del dev server
  //
  // base: './' en BUILD hace que index.html referencie los assets con rutas
  // RELATIVAS (./assets/...), lo que permite abrir la SPA desde cualquier
  // subdirectorio de Apache (ej: htdocs/SaludWEB_Web).
  //
  // Ese mismo './' en el DEV SERVER rompe el arranque: Vite necesita una base
  // absoluta para resolver qué archivo servir en cada URL, y con una base
  // relativa responde 404 en '/' y en '/login' (sí sirve '/index.html', por eso
  // el síntoma confunde). Por eso el valor depende del comando:
  //   - command === 'build'  -> './' (subdirectorios de Apache)
  //   - command === 'serve'  -> '/'    (dev server en http://127.0.0.1:5173)
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  // plugins: registra el plugin de React para poder compilar archivos .jsx/.tsx
  server: {
    // server: configuración del servidor de desarrollo de Vite (solo en "npm run dev")
    port: 5173,
    // port: fija el puerto en el que se levanta el dev server (http://localhost:5173)
    // host: '127.0.0.1' ata el dev server a IPv4 de forma explícita.
    //
    // Sin esto Vite escucha solo en ::1 (IPv6), y en Windows "localhost"
    // resuelve a ::1 y a 127.0.0.1 a la vez. Cuando una herramienta resuelve
    // localhost a 127.0.0.1 primero (curl, Postman, algunos navegadores o
    // el propio healthcheck) recibe conexión rechazada y la página parece
    // caída aunque esté sirviendo. Fijar IPv4 hace que ambos caminos
    // funcionen. No se usa host: true porque expondría el dev server en la
    // red local.
    host: '127.0.0.1',
    proxy: {
      // proxy: redirige peticiones del frontend hacia el backend evitando problemas de CORS en desarrollo
      '/api': {
        // '/api': todas las URLs que empiecen con /api serán manejadas por el proxy
        target: 'http://localhost/Workspace_SaludWEB/SaludWEB_Backend',
        // target: servidor de destino real (backend PHP/API ubicado en XAMPP)
        changeOrigin: true,
        // changeOrigin: cambia el Host de la petición al del backend (el servidor destino ve la petición como propia)
        rewrite: (path) => path.replace(/^\/api/, '/api'),
        // rewrite: reescribe la ruta solicitada antes de reenviarla (aquí mantiene el prefijo /api tal cual)
      },
    },
  },
}))
import { defineConfig, loadEnv } from 'vite'
// Importa defineConfig, la función de Vite que permite declarar la configuración con autocompletado de TypeScript
// Importa loadEnv, la función que lee los archivos .env por nosotros
import react from '@vitejs/plugin-react'
// Importa el plugin oficial de React, necesario para que Vite procese JSX y el Fast Refresh de React

// export default defineConfig: expone la configuración de Vite (archivo CommonJS/ESM del proyecto, no de build)
//
// Se reciben `command` y `mode` porque hacen falta dos cosas que no se pueden
// resolver con un valor único:
//   - `command` -> `base` necesita ser distinto en desarrollo y en build.
//   - `mode`    -> para que loadEnv() lea el archivo .env correcto
//                  (.env, y además .env.development o .env.production según el caso).
export default defineConfig(({ command, mode }) => {
  // loadEnv se llama A MANO y no se usa import.meta.env, porque import.meta.env
  // todavía no existe cuando se evalúa este archivo: la configuración de Vite se
  // ejecuta ANTES de que Vite prepare el entorno del código de la aplicación.
  //
  // El tercer argumento es el PREFIJO: 'VITE_' devuelve solo esas variables.
  // Es lo que evita que en esta config entre cualquier variable del sistema
  // (PATH, TOKEN, etc.) solo por estar definida.
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Destino real al que el dev server reenvía todo lo que empiece con /api.
  //
  // Configurable por VITE_PROXY_TARGET para no tener que editar este archivo
  // al cambiar de backend:
  //   - PHP nativo (composer run dev): http://127.0.0.1:8000
  //   - otro host o puerto:            la URL que corresponda
  //
  // El valor por defecto es el backend nativo, que es como se corre el proyecto.
  const proxyTarget =
    env.VITE_PROXY_TARGET || 'http://127.0.0.1:8000'

  return {
    // base: './' en BUILD hace que index.html referencie los assets con rutas
    // RELATIVAS (./assets/...), lo que permite abrir la SPA desde cualquier
    // subdirectorio de un servidor estático.
    //
    // Ese mismo './' en el DEV SERVER rompe el arranque: Vite necesita una base
    // absoluta para resolver qué archivo servir en cada URL, y con una base
    // relativa responde 404 en '/' y en '/login' (sí sirve '/index.html', por eso
    // el síntoma confunde). Por eso el valor depende del comando:
    //   - command === 'build'  -> './' (subdirectorios)
    //   - command === 'serve'  -> '/'    (dev server en http://127.0.0.1:5173)
    base: command === 'build' ? './' : '/',
    plugins: [react()],
    // plugins: registra el plugin de React para poder compilar archivos .jsx/.tsx
    server: {
      // server: configuración del servidor de desarrollo de Vite (solo en "npm run dev")
      port: 5173,
      // strictPort: si el 5173 está ocupado, falla en vez de saltar a otro
      // puerto. Así el script de arranque y el firewall apuntan siempre al
      // mismo lugar y no queda una web "fantasma" en un puerto inesperado.
      strictPort: true,
      // port: fija el puerto en el que se levanta el dev server (http://localhost:5173)
      // host: '0.0.0.0' hace que Vite escuche en TODAS las interfaces de la PC
      // (WiFi, Ethernet y hotspot), no solo en localhost. Es lo que permite
      // abrir la web desde un celular conectado a la misma red.
      //
      // El firewall de Windows sigue limitando el acceso a la subred local
      // (remoteip=localsubnet): la PC no queda publicada en Internet.
      host: '0.0.0.0',
      allowedHosts: [
        'desktop-5f7743f.taileeeb72.ts.net',
        '.ts.net',
      ],
      proxy: {
        // proxy: redirige peticiones del frontend hacia el backend evitando problemas de CORS en desarrollo
        '/api': {
          // '/api': todas las URLs que empiecen con /api serán manejadas por el proxy
          target: proxyTarget,
          // target: servidor de destino real (el backend PHP/API), leído de
          // VITE_PROXY_TARGET y con el backend nativo como valor por defecto
          changeOrigin: true,
          // changeOrigin: cambia el Host de la petición al del backend (el servidor destino ve la petición como propia)
          rewrite: (path) => path.replace(/^\/api/, '/api'),
          // rewrite: reescribe la ruta solicitada antes de reenviarla (aquí mantiene el prefijo /api tal cual)
        },
      },
    },
  }
})

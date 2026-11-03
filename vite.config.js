import { defineConfig, loadEnv } from 'vite'
// Importa defineConfig, la función de Vite que permite declarar la configuración con autocompletado de TypeScript
// Importa loadEnv, la función que lee los archivos .env por nosotros
import react from '@vitejs/plugin-react'
// Importa el plugin oficial de React, necesario para que Vite procese JSX y el Fast Refresh de React

// export default defineConfig: expone la configuración de Vite (archivo CommonJS/ESM del proyecto, no de build)
//
// Se recibe `mode` para que loadEnv() lea el archivo .env correcto
// (.env, y además .env.development o .env.production según el caso).
export default defineConfig(({ mode }) => {
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
    // base: '/' tanto en BUILD como en DEV SERVER.
    //
    // Antes el build usaba './'. Eso funciona en la raíz y en rutas de UN solo
    // nivel, pero rompe en rutas anidadas como /turnera/mis-turnos: el navegador
    // resuelve "./assets/..." contra /turnera/ y pide /turnera/assets/..., que
    // no existe. El resultado es una página en blanco al refrescar o al entrar
    // directo a una ruta profunda.
    //
    // La SPA se publica en la raíz del dominio, así que la base absoluta es la
    // correcta. Además coincide con la del servidor de desarrollo y evita dos
    // comportamientos distintos entre "npm run dev" y el build.
    base: '/',
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
        'saludweb.taileeeb72.ts.net',
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

import axios from 'axios';
// Importa Axios, la librería HTTP cliente que usamos para consumir la API del backend (módulo "El navegador como cliente de una API")

import { actual as correlationId } from '../utils/correlationId.js';
// Importa el identificador de correlación del navegador (módulo "Trazabilidad")

import * as logger from '../utils/logger.js';
// Importa el logger del navegador (módulo "Logging"). Antes de este cambio, un
// error de red se seguía con un console.error suelto que se perdía al recargar
// la página y no decía a qué petición correspondía.

// URL base de la API: configurable por VITE_API_URL (ver .env.example).
//
// POR QUÉ NO ES SIEMPRE LA MISMA DIRECCIÓN
// -----------------------------------------
// La SPA se sirve de dos maneras y en cada una la API está a una distancia
// distinta, así que la URL base no puede ser una constante fija:
//
//   - DESARROLLO (npm run dev, http://localhost:5173): la API NO está en el
//     mismo origen. Está en el Apache de XAMPP. El proxy '/api' de vite.config.js
//     existe justamente para eso. Con una URL base VACÍA, axios resuelve cada
//     llamada contra el origen de la página -> '/api/auth/login' -> la resuelve
//     el proxy de Vite. La petición nunca sale del navegador hacia otro
//     servidor, así que no hay CORS ni preflight que pueda rechazarla.
//
//     Con la URL absoluta de XAMPP, en cambio, el navegador la trata como
//     petición CRUZADA: manda un preflight OPTIONS y, si el backend no
//     autoriza ese encabezado, la rechaza antes de llegar al login. El
//     síntoma es un "Error al iniciar sesión" sin ninguna pista en la UI.
//
//   - PRODUCCIÓN (build servido por Apache desde SaludWEB_Web/): acá el proxy
//     de Vite NO existe, y public/.htaccess bloquea '^api/' a propósito con un
//     403. Por eso la URL tiene que ser la ABSOLUTA del backend, que vive en
//     otra carpeta. Ahí sí hay CORS, y lo resuelve la whitelist de orígenes
//     del backend.
const API_URL =
  import.meta.env?.VITE_API_URL ||
  (import.meta.env?.DEV ? '' : 'http://localhost/Workspace_SaludWEB/SaludWEB_Backend');

// Crear instancia de Axios
const client = axios.create({
  // axios.create: crea una instancia de Axios con configuración compartida para todas las peticiones de la SPA
  baseURL: API_URL,
  // baseURL: todas las llamadas se resuelven relativas a esta URL, así se escriben rutas cortas tipo "/api/auth/login"
  timeout: 15000, // Evita esperas infinitas ante servidores lentos
  // timeout: 15 segundos de espera máxima por petición; evita que una petición pendiente se quede "colgada" para siempre
  headers: {
    // Cabeceras por defecto que se enviarán en cada request
    'Content-Type': 'application/json',
    // Indica que el cuerpo de las peticiones viaja en formato JSON
    'X-Correlation-Id': correlationId(),
    // Identificador de la petición. El backend lo copia en todas sus líneas de
    // log, así que con este dato un error reportado por el usuario se localiza
    // con una búsqueda en lugar de preguntarle "¿qué estabas haciendo?".
  },
});

// Nombre del evento que se dispara cuando una petición falla SIN respuesta
// (servidor inalcanzable, timeout, DNS rota). Lo escucha el cartel global de
// "sin conexión" (AvisoOffline.jsx). Vivir en este archivo y no en aquel
// evita escribir el string en dos lugares con errores de tipeo.
const EVENTO_SIN_CONEXION = 'saludweb:sin-conexion';
// El evento complementario: se dispara cuando UNA petición responde bien, y
// le dice al cartel "ya hay red, escondete". También lo escucha AvisoOffline.
const EVENTO_CON_CONEXION = 'saludweb:con-conexion';

// Dispara el evento que marca al app como "sin conexión" (best effort: si no
// hay window, como en un entorno de test, no pasa nada y no rompe la llamada).
function avisarSinConexion() {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent(EVENTO_SIN_CONEXION));
  }
}

// Dispara el evento que marca al app como "con conexión" (la petición de la
// que venimos, pidamos lo que pidamos, demuestra que hay camino a la red).
function avisarConConexion() {
  if (typeof window !== 'undefined' && window.dispatchEvent) {
    window.dispatchEvent(new CustomEvent(EVENTO_CON_CONEXION));
  }
}

// Interceptor: agregar token a cada request
client.interceptors.request.use(
  // interceptors.request.use: "intercepta" cada petición saliente para modificarla antes de enviarse
  (config) => {
    // callback que recibe la configuración de la petición y la retorna modificada
    const token = localStorage.getItem('token');
    // Lee el token JWT guardado en localStorage (persistencia de sesión en el navegador)
    if (token) {
      // Si existe un token guardado...
      config.headers.Authorization = `Bearer ${token}`;
      // ...lo inyecta como encabezado "Authorization" con el esquema "Bearer <token>": es la firma de "Login desde Frontend Desacoplado"
    }

    // El id de correlación se reescribe en cada petición, y no solo una vez al
    // crear la instancia: si el usuario cierra sesión y entra como otro
    // usuario en la misma pestaña, cada sesión tiene que quedar separada en los
    // logs, y con el id fijo de la creación quedarían mezcladas.
    config.headers['X-Correlation-Id'] = correlationId();

    return config;
    // Devuelve la configuración (posiblemente modificada) para que Axios ejecute la petición
  },
  (error) => {
    // Si falla la preparación de la petición (antes de enviarse), se registra
    // y se rechaza la promesa para que el error llegue al consumidor sin que el
    // interceptor se lo quede en el camino.
    logger.error('fallo al preparar la petición', {
      metodo: error.config?.method,
      url: error.config?.url,
      motivo: error.message,
    });

    return Promise.reject(error);
  }
);

// Interceptor: manejar errores globales
client.interceptors.response.use(
  // interceptors.response.use: "intercepta" cada respuesta (éxito o error) antes de entregarla al código que hizo la petición
  (response) => {
    // Llegó una respuesta HTTP válida: hay camino que funciona, el cartel de
    // "sin conexión" (si estaba visible) puede esconderse. Se avisa incluso si
    // la respuesta es un 4xx/5xx, porque eso significa que la RED está bien:
    // "sin conexión" no es lo mismo que "el servidor rechazó la petición".
    avisarConConexion();
    return response;
  },
  (error) => {
    // callback que recibe el error de la respuesta HTTP
    // Se registra el fallo ANTES de reaccionar, para que quede la evidencia
    // aunque la redirección se lleve la página entera. El logger redacta el
    // token y los datos personales del contexto, así que se puede pasar el
    // error completo sin filtrar nada sensible.
    logger.error('fallo en la petición a la API', {
      metodo: error.config?.method,
      url: error.config?.url,
      estado: error.response?.status ?? null,
      motivo: error.message,
      // El cuerpo del error del backend (que ya viene sin secretos) ayuda a
      // entender el rechazo sin tener que reproducirlo.
      respuesta: error.response?.data,
    });

    // Si es 401, limpiar token y redirigir a login
    if (error.response?.status === 401) {
      // Un 401 tiene dos causas MUY distintas, y distinguirlas es lo que evita
      // que el login se trague su propio mensaje de error:
      //
      //   a) La sesión que había expirado o era inválida. Acá sí corresponde
      //      limpiar el token y mandar a /login.
      //   b) El POST de /api/auth/login rechazado por contraseña o email
      //      incorrectos. NO hay sesión que expirar: el usuario está justamente
      //      tratando de iniciarla. Si se lo tratara como (a), el
      //      `window.location.href` de abajo recargaría la página a mitad del
      //      envío y el formulario perdería el mensaje "Error al iniciar
      //      sesión" que Login.jsx ya había escrito en pantalla. El usuario
      //      vería la página de login_clean como si nada, y sin pista de por
      //      qué el botón no lo dejó entrar.
      //
      // La condición mira si había un token guardado, no la URL: así el
      // criterio es "¿existe una sesión que perder?" y no una lista de
      // endpoints que hay que recordar actualizar cada vez que se agrega uno.
      const habiaSesion = Boolean(localStorage.getItem('token'));

      if (!habiaSesion) {
        // Caso (b): se deja propagar el error para que la pantalla lo muestre.
        logger.warn('credenciales rechazadas en el inicio de sesión', { url: error.config?.url });
      } else {
        // Si el backend responde con estado HTTP 401 (no autorizado / sesión expirada o inválida)...
        logger.warn('sesión no válida: se limpia el token local', { url: error.config?.url });

        localStorage.removeItem('token');
        // ...se elimina el token del localStorage: se invalida la sesión local del navegador
        localStorage.removeItem('usuario');
        // ...también se eliminan los datos del usuario guardados (sesión completamente limpia)
        window.location.href = '/login';
        // Se redirige el navegador completa al login (recarga de página) para que el usuario vuelva a autenticarse
      }
    } else if (!error.response) {
      // Un error SIN respuesta tiene una sola causa: la petición salió y nunca
      // volvió (server caído, cortado el WiFi, timeout de 15s). Que no haya
      // llegado ni un error HTTP es la señal de "estamos sin conexión", y el
      // cartel global lo tiene que mostrar. Los errores CON respuesta no
      // entran acá: son decisiones del servidor, no problemas de red.
      logger.warn('la petición no llegó al servidor', {
        metodo: error.config?.method,
        url: error.config?.url,
        motivo: error.message,
      });

      avisarSinConexion();
    }
    return Promise.reject(error);
    // Se rechaza la promesa para que el interceptor no se trague el error: los componentes siguen pudiendo manejarlo
  }
);

export default client;
// Exporta la instancia configurada para que cualquier módulo la importe y haga llamadas a la API con este cliente
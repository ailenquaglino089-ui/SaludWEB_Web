import axios from 'axios';
// Importa Axios, la librería HTTP cliente que usamos para consumir la API del backend (módulo "El navegador como cliente de una API")

// URL base de la API: configurable por VITE_API_URL (ver .env.example)
// con fallback al entorno local de XAMPP.
const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost/Workspace_SaludWEB/repositorio_backend';
// Constante con la URL base de la API: toma de la variable de entorno VITE_API_URL (si está definida) o usa la URL local de XAMPP (fallback)

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
  },
});

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
    return config;
    // Devuelve la configuración (posiblemente modificada) para que Axios ejecute la petición
  },
  (error) => Promise.reject(error)
  // Si falla la preparación de la petición (antes de enviarse), rechaza la promesa para que el error llegue al consumidor
);

// Interceptor: manejar errores globales
client.interceptors.response.use(
  // interceptors.response.use: "intercepta" cada respuesta (éxito o error) antes de entregarla al código que hizo la petición
  (response) => response,
  // En respuestas exitosas se devuelve la respuesta tal cual (no se modifica nada)
  (error) => {
    // callback que recibe el error de la respuesta HTTP
    // Si es 401, limpiar token y redirigir a login
    if (error.response?.status === 401) {
      // Si el backend responde con estado HTTP 401 (no autorizado / sesión expirada o inválida)...
      localStorage.removeItem('token');
      // ...se elimina el token del localStorage: se invalida la sesión local del navegador
      localStorage.removeItem('usuario');
      // ...también se eliminan los datos del usuario guardados (sesión completamente limpia)
      window.location.href = '/login';
      // Se redirige el navegador completa al login (recarga de página) para que el usuario vuelva a autenticarse
    }
    return Promise.reject(error);
    // Se rechaza la promesa para que el interceptor no se trague el error: los componentes siguen pudiendo manejarlo
  }
);

export default client;
// Exporta la instancia configurada para que cualquier módulo la importe y haga llamadas a la API con este cliente
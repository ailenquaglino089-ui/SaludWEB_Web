import React, { createContext, useState, useEffect } from 'react';
// Importa React y los hooks createContext (crear el contexto global), useState (estado) y useEffect (efectos secundarios)
import client from '../api/client';
// Importa la instancia de Axios configurada (con el interceptor que inyecta el Bearer token) para consumir la API

export const AuthContext = createContext();
// export const AuthContext: crea y exporta el contexto de autenticación; los componentes podrán leerlo con useContext

export const AuthProvider = ({ children }) => {
  // AuthProvider es el componente que "provee" el estado de sesión a toda la aplicación (envuelve el árbol en App.jsx)
  const [usuario, setUsuario] = useState(null);
  // Estado "usuario": guarda los datos del usuario autenticado (o null si no hay sesión) - proviene del backend
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  // Estado "token": inicializa el token JWT desde localStorage para que la sesión persista tras recargar la página
  const [cargando, setCargando] = useState(true);
  // Estado "cargando": indica si la verificación de sesión aún está en curso (evita decidir rutas apresuradamente)
  const [error, setError] = useState(null);
  // Estado "error": guarda el último mensaje de error de login/registro/cambio de contraseña para mostrarlo en la UI

  // Verificar si hay sesión activa al montar
  useEffect(() => {
    // useEffect con arreglo de dependencias vacío: se ejecuta UNA sola vez cuando el AuthProvider se monta
    if (token) {
      // Si existe un token guardado (había sesión previa)...
      verificarSesion();
      // ...se verifica contra el backend que ese token siga siendo válido (endpoint /api/auth/me)
    } else {
      // Si no hay token...
      setCargando(false);
      // ...no hay nada que verificar: se da por terminada la carga (cargando = false)
    }
  }, []);
  // Arreglo vacío: garantiza que solo se ejecute al montar el componente, no en cada renderizado

  const verificarSesion = async () => {
    // verificarSesion: función asíncrona que consulta al backend si el token actual corresponde a una sesión válida
    try {
      // Inicio del bloque que captura errores de la petición
      const response = await client.get('/api/auth/me');
      // GET a /api/auth/me: el interceptor de Axios agrega automáticamente el "Authorization: Bearer token"
      setUsuario(response.data?.data ?? null);
      // Si el backend responde el usuario, se guarda en el estado; con "?? null" ante datos ausentes se asigna null
    } catch (err) {
      // Si la petición falla (token inválido, expirado, o el interceptor ya redirigió por 401)...
      console.error('Error verificando sesión:', err);
      // ...se registra el error en la consola del navegador para fines de depuración
      localStorage.removeItem('token');
      // ...se borra el token inválido del localStorage para limpiar la sesión corrupta
      setToken(null);
      // ...se sincroniza el estado en memoria: el token deja de existir y autenticado pasa a false
    } finally {
      // El bloque finally se ejecuta siempre, haya éxito o error
      setCargando(false);
      // ...con él la verificación termina: cargando = false y ProtectedRoute puede decidir la redirección
    }
  };

  const registro = async (email, password, nombre, tipoUsuario = 'paciente') => {
    // registro: crea una cuenta nueva en el backend (parámetros: credenciales, nombre y tipo de usuario; por defecto "paciente")
    try {
      // Inicio del bloque de captura de errores
      setError(null);
      // Limpia cualquier error previo antes de intentar el registro (la UI deja de mostrar el mensaje viejo)
      const response = await client.post('/api/auth/registro', {
        // POST a /api/auth/registro con los datos del nuevo usuario en el cuerpo de la petición
        email,
        // Email del nuevo usuario
        password,
        // Contraseña elegida por el usuario
        nombre,
        // Nombre completo del usuario
        tipo_usuario: tipoUsuario,
        // Tipo de cuenta ("medico" o "paciente"); la API espera el campo en snake_case, por eso el alias
      });
      return response.data?.data ?? null;
      // Devuelve el usuario creado (payload de la API) o null si la respuesta no trae datos
    } catch (err) {
      // Si la API rechaza el registro (email duplicado, validaciones, etc.)...
      const mensaje = err.response?.data?.mensaje || err.response?.data?.error || 'Error en el registro';
      // ...se extrae el mensaje de error del backend; si no viene, se usa un mensaje genérico
      setError(mensaje);
      // ...se guarda el mensaje en el estado "error" para mostrarlo en el formulario de registro
      throw err;
      // Se vuelve a lanzar el error para que el componente que llamó a registro pueda manejarlo también
    }
  };

  const login = async (email, password) => {
    // login: autentica al usuario contra el backend y guarda la sesión en el navegador (módulo "Login desde Frontend Desacoplado")
    try {
      // Inicio del bloque de captura de errores
      setError(null);
      // Limpia errores previos antes de intentar el login
      const response = await client.post('/api/auth/login', { email, password });
      // POST a /api/auth/login con las credenciales (email y contraseña); el backend responde con el token JWT y los datos del usuario
      const payload = response.data?.data ?? {};
      // Extrae el "data" de la respuesta de la API (objeto que contiene token y usuario); si falta, se usa un objeto vacío
      const { token: newToken, ...usuarioData } = payload;
      // Desestructura el payload: toma el token (renombrado a newToken) y el resto de propiedades quedan en usuarioData
      
      // Guardar token y datos del usuario
      localStorage.setItem('token', newToken);
      // Persiste el token JWT en localStorage: así la sesión sobrevive al recargar/cerrar la pestaña
      localStorage.setItem('usuario', JSON.stringify(usuarioData));
      // Guarda los datos del usuario serializados en JSON dentro de localStorage (los usa el interceptor o la UI)
      
      setToken(newToken);
      // Actualiza el estado React "token" con el token recibido (dispara cuándo autenticado quede en true)
      setUsuario(usuarioData);
      // Actualiza el estado React "usuario" con los datos del usuario logueado
      
      return usuarioData;
      // Devuelve los datos del usuario para que el componente de Login pueda, por ejemplo, redirigir al dashboard
    } catch (err) {
      // Si las credenciales son inválidas o el servidor falla...
      const mensaje = err.response?.data?.mensaje || err.response?.data?.error || 'Error en el login';
      // ...se busca el mensaje de error en la respuesta del backend; si no hay, se usa un mensaje genérico
      setError(mensaje);
      // ...se guarda el mensaje para que la pantalla de login lo muestre al usuario
      throw err;
      // Se relanza el error para que el componente Login pueda atraparlo y mostrar el estado de carga finalizado
    }
  };

  const logout = async () => {
    // logout: cierra la sesión local y avisa al backend (se llama normalmente desde el Navbar)
    try {
      // Inicio del bloque que intenta notificar al backend
      await client.post('/api/auth/logout');
      // POST a /api/auth/logout para invalidar la sesión del lado del servidor (el interceptor envía el Bearer token)
    } catch (err) {
      // Si la petición de logout falla...
      console.error('Error en logout:', err);
      // ...solo se registra en consola: el cierre local se realiza igualmente
    } finally {
      // El bloque finally garantiza limpieza local aunque el backend no responda
      localStorage.removeItem('token');
      // Elimina el token del localStorage (sesión local eliminada)
      localStorage.removeItem('usuario');
      // Elimina los datos del usuario almacenados en localStorage
      setToken(null);
      // Sincroniza el estado React: token = null y autenticado = false
      setUsuario(null);
      // Limpia los datos del usuario del estado de React
      setError(null);
      // Limpia cualquier mensaje de error anterior (interfaz sin residuos del estado previo)
    }
  };

  const cambiarContrasena = async (passwordActual, passwordNueva) => {
    // cambiarContrasena: permite al usuario autenticado actualizar su contraseña
    try {
      // Inicio del bloque de captura de errores
      setError(null);
      // Limpia errores previos antes del cambio de contraseña
      await client.post('/api/auth/cambiar-contrasena', {
        // POST a /api/auth/cambiar-contrasena con las contraseñas en el cuerpo
        passwordActual,
        // Contraseña actual (se envía para validar la identidad del usuario)
        passwordNueva,
        // Nueva contraseña que reemplazará a la actual
      });
    } catch (err) {
      // Si el backend rechaza el cambio (contraseña actual incorrecta, política de seguridad, etc.)...
      const mensaje = err.response?.data?.mensaje || err.response?.data?.error || 'Error al cambiar contraseña';
      // ...se extrae el mensaje de error de la API o se usa uno genérico
      setError(mensaje);
      // ...se guarda el mensaje para mostrarlo en el formulario correspondiente
      throw err;
      // Se relanza el error para que el componente llamador pueda reaccionar (por ejemplo, no resetear el formulario)
    }
  };

  const value = {
    // Objeto "value": es TODA la información que el contexto expone a los componentes consumidores
    usuario,
    // Datos del usuario logueado (o null)
    token,
    // Token JWT actual (o null)
    cargando,
    // Flag de verificación de sesión en curso (lo usa ProtectedRoute para mostrar el spinner)
    error,
    // Último mensaje de error de autenticación (para mostrarlo en la UI)
    autenticado: !!token,
    // autenticado: derivado del token: !! (doble negación) lo convierte en booleano (true si hay token, false si no)
    registro,
    // Método de registro de usuarios (exponer la función para que Register.jsx la invoque)
    login,
    // Método de login (exponer la función para que Login.jsx la invoque)
    logout,
    // Método de logout (exponer la función para que Navbar lo invoque)
    cambiarContrasena,
    // Método de cambio de contraseña (exponer la función para el perfil/ajustes)
  };

  return (
    // Retorna el Provider que envuelve a los componentes hijos
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    // AuthContext.Provider inyecta "value" (estado + métodos) a todos los descendientes vía useContext
  );
};
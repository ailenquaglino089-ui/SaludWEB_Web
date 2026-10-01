import client from './client';
// Importa la instancia de Axios configurada. Se importa SOLO para leer la
// URL base del backend: el canal no se abre con Axios, se abre con EventSource,
// porque Axios espera una respuesta completa y este stream nunca termina.

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost/Workspace_SaludWEB/SaludWEB_Backend';
// Misma resolución de URL que usa client.js: variable de entorno primero,
// XAMPP local como alternativa. Si el canal usara una URL distinta a la del
// resto de la API, en un entorno de desarrollo con dos direcciones distintas
// el canal apuntaría a un servidor que no existe y el error sería
// desconcertante.

// ============================================================
// TIPOS DE EVENTO
// ============================================================
// Esta lista es el CONTRATO entre el backend y el frontend. El backend la
// publica con el mismo contenido en RealtimeService::tiposValidos() y en el
// diagnóstico de GET /api/eventos/estado.
//
// Es importante que el contrato esté escrito en los dos lados y no solo en uno:
// si el backend agrega un tipo nuevo y el frontend no lo escucha, el evento
// llega igual y se pierde en silencio, sin ningún error visible. Tener la
// lista escrita en ambos lados hace que ese desajuste se note al leer.
export const TIPOS_EVENTO = {
  CITA_CREADA: 'cita_creada',      // se reservó un turno nuevo
  CITA_ESTADO: 'cita_estado',      // cambió el estado (asistido, ausente, vencido...)
  CITA_CANCELADA: 'cita_cancelada',// el paciente o el médico canceló
  CITA_ELIMINADA: 'cita_eliminada',// un admin borró el registro
};
// Objeto en lugar de array suelta: se accede por nombre (TIPOS_EVENTO.CITA_CREADA)
// y no por posición. Con un array, un error de orden al agregar un elemento
// haría que todo el código existente apunte al evento equivocado, y eso se
// descubre en producción, no en desarrollo.

const LISTA_TIPOS = Object.values(TIPOS_EVENTO);
// Se convierte en lista una sola vez, para poder recorrerla al suscribirse.
// Object.values sobre un objeto de constantes: no hay duplicados ni desalineación
// por índice, que es justo el error que sí ocurriría con un array suelto.

// ============================================================
// CONSTRUCCIÓN DE LA URL DEL CANAL
// ============================================================

/**
 * Arma la URL del canal SSE para un canal concreto.
 *
 * @param {string} canal  Canal declarativo: tablero | mis-turnos | mi-agenda | agenda:<id>
 * @param {string} token  JWT de la sesión
 * @returns {string} URL completa del canal
 */
function urlDelCanal(canal, token) {
  // Se usa URLSearchParams en vez de pegar con '&' a mano. Parece un detalle,
  // pero es lo que evita que un canal o un token con caracteres raros (el ':'
  // de "agenda:10", por ejemplo) rompa la URL. Armar la query a mano es la
  // causa clásica de que "funcione con tablero pero no con agenda:10".
  const params = new URLSearchParams({ canal, token });
  // canal y token van como pares con nombre, no concatenados. URLSearchParams
  // además escapa los caracteres: el ':' de "agenda:10" viaja como %3A y el
  // backend lo recibe intacto. Pegar '&' a mano es donde aparecen los fallos
  // intermitentes que solo se ven con ciertos canales.
  return `${API_URL}/api/eventos?${params.toString()}`;  // se entrega al EventSource
}

/**
 * Saca el token JWT del localStorage.
 *
 * @returns {string|null} Token o null si no hay sesión
 */
export function tokenActual() {
  // Se encapsula el acceso al localStorage en una función y no se escribe
  // localStorage.getItem en cada uso. Motivo concreto: durante los tests
  // (Playwright, jsdom) localStorage puede no existir, y además la clave
  // queda escrita en un solo lugar. Si mañana la sesión se guarda en una
  // cookie HttpOnly, hay un solo archivo que cambiar en lugar de cinco.
  if (typeof localStorage === 'undefined') {
    return null;
  }
  return localStorage.getItem('token');
}

// ============================================================
// SUSCRIPCIÓN AL CANAL
// ============================================================

/**
 * Abre el canal de tiempo real y devuelve un objeto con la forma de controlarlo.
 *
 * QUÉ DEVUELVE Y POR QUÉ ES UN OBJETO Y NO UN EventSource CRUDO
 * ----------------------------------------------------------
 * EventSource alcanza por sí solo para el caso más simple, y en este proyecto
 * se le agregaron tres cosas que no trae:
 *
 *   1. Estado de la conexión (conectado / reconectando / desconectado). El
 *      Dashboard muestra un cartel "En vivo", y sin esto no hay forma de
 *      saber si ese cartel dice la verdad.
 *   2. Reintentos con espera creciente. EventSource reconecta solo, pero si
 *      el servidor está caído reintenta en bucle cada 3 segundos para siempre. Con
 *      espera creciente el navegador se calma cuando el problema es largo.
 *   3. Limpieza. close() se llama desde el useEffect cleanup de React; si no
 *      existiera, cada cambio de pantalla dejaría un canal abierto y el
 *      backend acumula procesos colgados.
 *
 * @param {object} opciones
 * @param {string} opciones.canal      Canal declarativo a escuchar
 * @param {Function} opciones.alRecibir  Se llama con (tipo, datos) por evento
 * @param {Function} [opciones.alCambiarEstado]  Se llama con el estado de conexión
 * @returns {{cerrar: Function, reconectar: Function}} Control del canal
 */
export function suscribirseAlCanal({ canal, alRecibir, alCambiarEstado }) {
  // --------------------------------------------------
  // Validación: no hay sesión, no se intenta abrir nada
  // --------------------------------------------------
  const token = tokenActual();    // lee el JWT actual

  if (!token) {
    // Sin token no se abre el canal. Ni se intenta: el servidor respondería
    // 401 y EventSource interpretaría eso como un error de red, no como un
    // "no autorizado", e intentaría reconectar en bucle. Cortar acá es más
    // claro y no genera tráfico inútil.
    alCambiarEstado?.('sin-sesion');
    return { cerrar: () => {}, reconectar: () => {} };  // stub: evita null checks
  }

  // Estado inicial: se informa que se está conectando para que la interfaz
  // pueda mostrar "Conectando..." y no quedarse en un limbo sin explicación.
  alCambiarEstado?.('conectando');

  let source = null;      // El objeto EventSource activo
  let cerrada = false;   // ¿El componente ya pidió cerrar?
  let intentos = 0;      // Cuántos reintentos se hicieron (para la espera creciente)
  let temporizador = null; // Temporizador del reintento pendiente
  let ultimoId = null;   // Último id de evento recibido (para reconexiones manuales)

  // Manejadores de eventos. Se guardan en variables para poder SACARLOS al
  // cerrar. No se usan funciones anónimas directamente en addEventListener,
  // porque entonces no hay forma de quitar la referencia y la conexión queda
  // viva para siempre. Esta es una fuga de memoria silenciosa: consume
  // memoria del navegador sin mostrar ningún error.
  // Se reinicia el contador de reintentos: si la conexión volvió, el
    // problema anterior (si lo había) ya se resolvió.
    const alAbrir = () => {
    intentos = 0;                 // se reinicia el contador de reintentos
    alCambiarEstado?.('conectado');  // la interfaz pasa a "En vivo"
  };

  const alMensaje = (evento) => {
    // Los eventos de control del servidor (conectado, reconectar) no llevan
    // id, así que no se tocan. Solo se registran los ids reales, que son los
    // que sirven para no perder eventos al reconectar.
    if (evento.lastEventId) {
      ultimoId = evento.lastEventId;   // solo los eventos reales traen id
    }

    // El `data` del protocolo SSE siempre es texto. Hay que convertirlo a
    // objeto antes de entregárselo al componente, porque si el backend publica
    // un JSON con un formato distinto al esperado, el componente recibe
    // undefined y falla en un lugar lejano con un error que no señala el
    // origen. Convertir acá concentra el problema en un solo archivo.
    // Si el JSON vino malformado, se entrega un objeto con el tipo y nada
    // más. Es preferible que el componente reciba un evento sin contenido a
    // que reciba undefined y se rompa entero.
    let datos = {};
    try {
      datos = JSON.parse(evento.data);   // texto JSON -> objeto utilizable
    } catch (e) {
      datos = { tipo: evento.type, error: 'El evento llegó con un formato inválido' };
    }

    alRecibir?.(evento.type, datos);   // se lo pasa al componente
  };

  const alErrorDeRed = () => {
    // EventSource no distingue entre "el servidor me cortó" y "no hay red".
    // Para el usuario la consecuencia es la misma: hay que reintentar.
    //
    // Un detalle importante: EventSource YA reconecta solo. Este código NO
    // reemplaza eso, lo complementa. Cuando se detecta el error se llama a
    // close() para tomar el control del momento de la reconexión, y se
    // programa un reintento propio con espera creciente. Si se dejara el
    // reconectar nativo y solo se esperara, se perdería la espera creciente.
    if (cerrada) {
      return;
    }

    alCambiarEstado?.('reconectando');   // la interfaz avisa antes de esperar

    if (source) {
      source.close();   // se toma control del momento de la reconexión
      source = null;
    }

    // Espera creciente: 1 s, 2 s, 4 s, 8 s... hasta un tope de 30 s.
    //
    // El crecimiento es exponencial y tiene tope porque sin tope, un backend
    // caído durante una hora genera miles de reintentos (cada uno una
    // conexión TCP y un proceso de PHP que queda en el servidor). Con tope, el
    // costo es acotado y, cuando el servidor vuelve, la reconexión ocurre en
    // menos de 30 segundos.
    intentos++;   // este es el número de reintento actual (1 el primero)
    const espera = Math.min(30000, 1000 * Math.pow(2, intentos - 1));
    // 1000 * 2^(n-1) da 1000, 2000, 4000, 8000... El -1 hace que el primer
    // reintento espere 1 s y no 2 s. Math.min lo topa en 30 s.

    temporizador = setTimeout(() => {
      if (!cerrada) {   // si se cerró mientras esperábamos, no se reabre
        abrir();
      }
    }, espera);
  };

  /**
   * Abre (o reabre) la conexión.
   *
   * Se declara como función y no como arrowconstante inline porque se llama
   * desde dos lugares: al empezar, y desde el reintento programado. Con una
   * arrowconstante que se referencia a sí misma dentro de su propio cuerpo no
   * se puede hacer sin una rareza de JavaScript; con una declaración de
   * función es directo y se lee normal.
   */
function abrir() {
    source = new EventSource(urlDelCanal(canal, token));  // abre la conexión

    ['conectado', 'reconectar'].forEach((tipo) => {
      source.addEventListener(tipo, (evento) => {
        alMensaje(evento);   // "conectado" se procesa como un evento más
      });
    });

    LISTA_TIPOS.forEach((tipo) => {
      source.addEventListener(tipo, alMensaje);  // los 4 eventos del módulo
    });

    source.onopen = alAbrir;    // se abrió la conexión TCP
    source.onerror = alErrorDeRed;  // se cortó o falló
  }

  abrir();
  // Arranca la conexión de inmediato: suscribirse y esperar a que otro lo llame
  // significaría que el panel arranca sin escuchar y se pierde el primer evento.

  /**
   * Cierra el canal y deja de reintentar.
   */
  function cerrar() {
    // Se marca antes de cerrar, para que cualquier onerror que se dispaga
    // como consecuencia del close() no programe un reintento sobre un canal
    // que el componente ya no quiere. Sin esta bandera, el cleanup de React
    // cerraría el canal pero el reintento seguiría vivo.
    cerrada = true;

    if (temporizador) {
      clearTimeout(temporizador);  // cancela el reintento pendiente
      temporizador = null;
    }

    if (source) {
      // Se quitan los listeners uno por uno antes de cerrar. Con close() solo
      // se cierra el canal, pero las referencias a los handlers quedan
      // apuntando al componente que ya se desmontó.
      LISTA_TIPOS.forEach((tipo) => {
        source.removeEventListener(tipo, alMensaje);   // 4 eventos del módulo
      });
      ['conectado', 'reconectar'].forEach((tipo) => {
        source.removeEventListener(tipo, alMensaje);   // 2 eventos de control
      });

      source.onopen = null;      // se sueltan los dos handlers
      source.onerror = null;
      source.close();            // y recién ahora se cierra la conexión
      source = null;
    }

    alCambiarEstado?.('cerrado');   // la interfaz muestra "sin canal"
  }

  /**
   * Fuerza una reconexión inmediata.
   */
  function reconectar() {
    if (cerrada) {
      return;   // el componente ya no quiere el canal: no se resucita
    }
    if (temporizador) {
      clearTimeout(temporizador);   // se salta la espera creciente
      temporizador = null;
    }
    intentos = 0;   // reinicia el contador: es una acción del usuario, no un fallo
    if (source) {
      source.close();   // cierra el canal viejo
      source = null;
    }
    abrir();           // y abre uno nuevo al instante
  }

  return { cerrar, reconectar, ultimoId: () => ultimoId };
  // ultimoId se devuelve como función y no como valor para que el componente
  // pueda leerlo cuando quiera sin capturar el valor del momento de la apertura.
}  // <- fin de suscribirseAlCanal

/**
 * Consulta el estado del módulo en el backend.
 *
 * Sirve para verificar desde el navegador que el módulo está vivo y qué
 * canales admite. También se usa en la pantalla de diagnóstico.
 *
 * @returns {Promise<object>} Estado del módulo
 */
export async function estadoDelModulo() {
  // Va por Axios y no por EventSource porque es una petición normal que
  // termina: el diagnóstico es un GET común.
  const r = await client.get('/api/eventos/estado');   // GET normal por Axios
  return r.data.data;   // se desenvuelve la envoltura {ok, data} de la API
}
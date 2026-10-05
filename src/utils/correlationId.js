/**
 * correlationId.js - Identificador de correlación del navegador
 * ------------------------------------------------------------
 * Módulo: "Calidad Profesional del Software - Trazabilidad"
 *
 * PROBLEMA QUE RESUELVE
 * ---------------------
 * Cuando un usuario reporta "no me carga la lista de citas", hay que poder
 * encontrar EN UNA SEGUNDA la petición exacta que falló. Sin un identificador
 * compartido entre navegador y servidor, el soporte técnico solo tiene un
 * "¿podés describir el error?" y un cola de logs sin orden.
 *
 * La solución es el encabezado `X-Correlation-Id`: el navegador genera un id,
 * lo manda en cada petición, y el backend lo copia en todas sus líneas de log.
 * Con eso, un `grep` de ese id devuelve la historia completa de la petición.
 *
 * POR QUÉ ESTÁ EN UN ARCHIVO PROPIO Y DENTRO DE client.js
 * -------------------------------------------------------
 * Porque el id tiene que estar disponible en dos lugares: el cliente HTTP (que
 * lo manda) y el logger (que lo escribe). Si cada uno generara el suyo, ambos
 * valores diferentes y la correlación no serviría. También lo usan los
 * interceptores de errores, que no pasan por el cliente HTTP.
 *
 * FORMATO
 * -------
 * `cid_` seguido de 16 caracteres hexadecimales, el mismo que genera el
 * backend. Se comparte el formato a propósito: si el servidor valida el
 * encabezado con una expresión regular, ambos lados usan el mismo patrón y no
 * hay sorpresas cuando un id viaja del navegador a un log del servidor.
 */

// Prefijo que hace evidente de qué sistema salió el identificador.
const PREFIJO = 'cid';

// Cantidad de bytes aleatorios que se convierten a hexadecimal.
// 8 bytes son 16 caracteres hexadecimales: suficiente para que dos
// navegadores no generen el mismo id en la práctica.
const BYTES = 8;

// Conjunto de caracteres admitidos en el encabezado.
// Se acepta lo que un UUID trae (guiones y guiones bajos) porque muchos
// clientes ya generan ids con esa forma y es mejor aceptarlos que inventar una
// adaptación. Se excluyen dos families de caracteres por seguridad:
//   - los espacios: rompen las cabeceras HTTP,
//   - el salto de línea: permite inyectar una línea falsa en el archivo de log.
const CARACTERES_ADMITIDOS = /^[A-Za-z0-9_-]{1,64}$/;

// Clave de localStorage. Lleva un espacio de nombres para no pisar nada ajeno
// si la aplicación guarda otras preferencias ahí.
const CLAVE_ALMACEN = 'saludweb:correlation-id';

// Identificador de la sesión en curso. Es un módulo, no un componente de
// React: tiene que sobrevivir a los re-renders y estar disponible antes de que
// exista ningún componente montado.
let idActual = null;

/**
 * Dice si un identificador sirve para viajar en una cabecera.
 *
 * @param {*} id Valor a inspeccionar
 * @returns {boolean} true si es un string con los caracteres permitidos
 */
export function esValido(id) {
  // El typeof evita que un objeto o un array lleguen a la expresión regular:
  // en el navegador eso es un error de tipo, no un "false".
  return typeof id === 'string' && CARACTERES_ADMITIDOS.test(id);
}

/**
 * Genera un identificador nuevo del navegador.
 *
 * @returns {string} Identificador con el formato compartido con el backend
 */
export function generar() {
  const bytes = new Uint8Array(BYTES);

  // crypto.getRandomValues es la fuente criptográfica del navegador. Si no
  // está (navegador muy viejo o entorno de pruebas sin DOM), se cae a Math.random
  // de forma explícita: es peor criptográficamente, pero el identificador no
  // es un secreto ni protege nada, solo ordena logs. Perder trazabilidad por
  // romper la aplicación sería un mal negocio.
  if (globalThis.crypto && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < BYTES; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // Cada byte se pasa a hexadecimal de dos dígitos, porque un byte puede valer
  // menos de 16 y sin el relleno los ids quedarían de longitudes variables.
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

  return `${PREFIJO}_${hex}`;
}

/**
 * Devuelve el identificador vigente y lo crea si todavía no existe.
 *
 * Es la única función que se llama desde el resto de la aplicación, y por eso
 * no devuelve nunca vacío: cualquier línea de log tiene que poder escribir
 * contra qué petición está hablando.
 *
 * @returns {string} Identificador de la sesión
 */
export function actual() {
  if (idActual === null) {
    inicializar();
  }
  return idActual;
}

/**
 * Recupera el identificador de la sesión anterior, si quedó guardado.
 *
 * Guardarlo en localStorage sirve para dos cosas concretas: una recarga de
 * página no corta la correlación, y si el usuario abre la misma aplicación en
 * dos pestañas, ambas se atribuyen al mismo contexto en lugar de inventar ids
 * distintos y separar los logs de una sola acción.
 *
 * @returns {string|null} Identificador guardado o null si no hay uno válido
 */
function leerGuardado() {
  // localStorage puede lanzar excepción: en modo privado de algunos
  // navegadores está deshabilitado. Un log no puede romper la aplicación, así
  // que el error se captura y se sigue como si no hubiera nada guardado.
  try {
    if (typeof localStorage === 'undefined') {
      return null;
    }
    return localStorage.getItem(CLAVE_ALMACEN);
  } catch (error) {
    return null;
  }
}

/**
 * Guarda el identificador para que sobreviva a una recarga.
 *
 * @param {string} id Identificador a persistir
 * @returns {void}
 */
function guardar(id) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(CLAVE_ALMACEN, id);
    }
  } catch (error) {
    // Mismo criterio que en leerGuardado(): la falta de persistencia degrada la
    // trazabilidad, no la funcionalidad.
  }
}

/**
 * Fija el identificador de la sesión: reutiliza el guardado si es válido y, si
 * no, genera uno nuevo.
 *
 * @returns {string} Identificador de la sesión
 */
export function inicializar() {
  if (idActual !== null) {
    return idActual;
  }

  const guardado = leerGuardado();

  // Solo se adopta lo guardado si cumple el formato: un valor corrupto o
  // editado a mano en el navegador no debe viajar en una cabecera.
  idActual = esValido(guardado) ? guardado : generar();

  guardar(idActual);
  return idActual;
}

/**
 * Borra el identificador en memoria y del almacenamiento.
 *
 * Existe para las pruebas, que necesitan partir siempre del mismo estado, y
 * para el cierre de sesión: si el mismo navegador entra como paciente y
 * después como médico, cada sesión tiene que tener sus propios logs.
 *
 * @returns {void}
 */
export function olvidar() {
  idActual = null;
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(CLAVE_ALMACEN);
    }
  } catch (error) {
    // Sin almacenamiento no hay nada que borrar.
  }
}
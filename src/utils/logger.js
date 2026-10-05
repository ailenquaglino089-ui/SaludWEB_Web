/**
 * logger.js - Registro estructurado de eventos en el navegador
 * ------------------------------------------------------------
 * Módulo: "Calidad Profesional del Software - Logging"
 *
 * PROBLEMA QUE RESUELVE
 * ---------------------
 * `console.log('aqui')` no sirve para diagnosticar nada: no tiene fecha, no
 * tiene a qué petición corresponde, no dice qué método falló y no distingue un
 * error real de un mensaje informative. Este logger escribe SIEMPRE el mismo
 * formato: una línea JSON con los mismos campos, para que un registro se pueda
 * buscar, filtrar y pegar en un ticket sin editarlo antes.
 *
 * LA REGLA INNEGOCIABLE: NADA DE SECRETOS
 * ---------------------------------------
 * Todo dato que se manda a la consola del navegador queda en un dispositivo
 * que el usuario puede abrir con F12 y en pantallas compartidas. Por eso
 * contraseñas, tokens y datos clínicos no se registran: se redactan antes de
 * escribir, no después. La redacción vive en este archivo y no en cada módulo
 * que llama al logger, justamente para que no se pueda olvidar.
 *
 * POR QUÉ EL DESTINO SE PASA POR PARÁMETRO
 * -----------------------------------------
 * En el navegador el destino natural es la consola. Pero para probar el
 * enmascarado no alcanza con mirar la consola: hay que poder capturar lo que se
 * escribe. Por eso `configurar()` acepta un destino propio. La dependencia se
 * invierte en el punto donde se necesita, en lugar de dejar la lógica de
 * negocio atada a `console`.
 */

import { actual as idActual } from './correlationId.js';
// Importa el identificador de correlación para que cada línea diga a qué
// petición pertenece. Es la razón de ser de este módulo: un log sin
// correlación es un log que hay que buscar a mano.

// ------------------------------------------------------------------
// Niveles
// ------------------------------------------------------------------
// Un peso por nivel permite comparar sin comparar palabras: "WARN" > "INFO"
// con `>` es una comparación de strings que no significa nada, y el nivel mal
// comparado termina filtrando justo los errores que había que ver.
const PESOS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

// Niveles aceptados. Se comparan contra esta lista para descartar lo que venga
// de la configuración.
const NIVELES = Object.keys(PESOS);

// Etiquetas que se escriben en la línea de log.
const ETIQUETA = {
  debug: 'DEBUG',
  info: 'INFO',
  warn: 'WARN',
  error: 'ERROR',
};

// ------------------------------------------------------------------
// Redacción de datos sensibles
// ------------------------------------------------------------------
// Claves cuyo valor se reemplaza COMPLETAMENTE. Son secretos: un token
// enmascarado ("eyJh...9f") sigue siendo medio token, y medio token es un token.
const CLAVES_REDACTADAS = [
  'password',
  'passwd',
  'pwd',
  'contrasena',
  'contrasenia',
  'token',
  'jwt',
  'refresh_token',
  'authorization',
  'secret',
  'apikey',
  'api_key',
  'cookie',
  'motivo',
  'notas',
  'indicaciones',
  'diagnostico',
];

// Claves que se enmascaran PARCIALMENTE: se dejan cuatro caracteres para poder
// correlacionar sin exponer el dato. Sirve para distinguir dos pacientes
// distintos sin mostrar el DNI completo.
const CLAVES_PARCIALES = [
  'email',
  'correo',
  'dni',
  'documento',
  'telefono',
  'celular',
  'nombre',
  'apellido',
  'matricula',
];

// Etiqueta que reemplaza a los secretos.
const ETIQUETA_OCULTA = '[oculto]';

// Cuántos caracteres se dejan visibles de un dato parcial.
const CARACTERES_VISIBLES = 4;

// Largo mínimo para que el enmascarado partial tenga sentido. Con menos
// caracteres que el doble de lo que se muestra, tapar "algo" no oculta nada:
// de 'a@b.c' se vería 'a@b.*', es decir, casi el dato entero. En ese caso se
// redacta completo.
const LARGO_MINIMO_ENMASCARABLE = CARACTERES_VISIBLES * 2;

// Tope de longitud por valor. Una respuesta de mil registros no puede terminar
// dentro de la consola ni de un ticket: se trunca y se marca.
const LARGO_MAXIMO = 500;

/**
 * Dice si una clave pide redacción total.
 *
 * @param {string} clave Nombre de la clave, ya en minúsculas
 * @returns {boolean} true si el valor no se puede mostrar
 */
function esClaveOculta(clave) {
  return CLAVES_REDACTADAS.includes(clave);
}

/**
 * Dice si una clave pide enmascarado parcial.
 *
 * @param {string} clave Nombre de la clave, ya en minúsculas
 * @returns {boolean} true si el valor se puede mostrar a medias
 */
function esClaveParcial(clave) {
  return CLAVES_PARCIALES.includes(clave);
}

/**
 * Deja los primeros caracteres y reemplaza el resto por asteriscos.
 *
 * @param {string} texto Valor a enmascarar
 * @returns {string} Texto parcialmente visible o etiqueta de ocultamiento
 */
function enmascarar(texto) {
  const largo = texto.length;

  if (largo < LARGO_MINIMO_ENMASCARABLE) {
    // Con cinco caracteres o menos, mostrar cuatro no protege nada: se
    // redacta entero.
    return ETIQUETA_OCULTA;
  }

  return `${texto.slice(0, CARACTERES_VISIBLES)}${'*'.repeat(largo - CARACTERES_VISIBLES)}`;
}

/**
 * Recorta un texto largo.
 *
 * @param {string} texto Valor a recortar
 * @returns {string} Texto con un aviso de recorte al final
 */
function truncar(texto) {
  if (texto.length <= LARGO_MAXIMO) {
    return texto;
  }
  // Se avisa que se recortó: un log truncado en silencio hace creer que el
  // dato terminó ahí.
  return `${texto.slice(0, LARGO_MAXIMO)}...[truncado]`;
}

/**
 * Aplica la redacción a un contexto, entrando a los objetos anidados.
 *
 * Es recursiva porque el contexto real viene de responses de axios, que traen
 * `{ config: { headers: { Authorization } } }`. Si solo mirara el primer
 * nivel, el token pasaría limpio: la clave `authorization` está a tres niveles
 * de profundidad.
 *
 * @param {*} valor Dato a limpiar
 * @param {string} clave Clave del dato en su nivel (vacía en la raíz)
 * @returns {*} Dato limpio, con la misma forma
 */
function limpiar(valor, clave = '') {
  // Los tipos simples se devuelven como están, pero recortados si son largos.
  if (typeof valor === 'string') {
    const nombre = clave.toLowerCase();
    if (esClaveOculta(nombre)) {
      return ETIQUETA_OCULTA;
    }
    if (esClaveParcial(nombre)) {
      return enmascarar(truncar(valor));
    }
    return truncar(valor);
  }

  // Los números y los booleanos no tienen nada que ocultar.
  if (typeof valor === 'number' || typeof valor === 'boolean' || valor === null || valor === undefined) {
    return valor;
  }

  // Un error se reduce a su mensaje: el stack completo en la consola del
  // navegador es ruido, y el mensaje ya identifica el fallo.
  if (valor instanceof Error) {
    return truncar(valor.message);
  }

  // Los objetos y las listas se limpian elemento por elemento. El segundo
  // argumento es '' porque una clave interna no tiene por qué heredarse al
  // contenido del objeto.
  if (Array.isArray(valor)) {
    return valor.map((elemento) => limpiar(elemento));
  }

  if (typeof valor === 'object') {
    const resultado = {};
    for (const [nombre, contenido] of Object.entries(valor)) {
      resultado[nombre] = limpiar(contenido, nombre);
    }
    return resultado;
  }

  // Cualquier otro tipo (funciones, símbolos) no aporta nada al diagnóstico.
  return undefined;
}

// ------------------------------------------------------------------
// Estado del logger
// ------------------------------------------------------------------

// Nivel mínimo que se escribe. Configurable por entorno con VITE_LOG_LEVEL.
let nivelMinimo = 'info';

// Destino de las líneas. Por defecto, la consola del navegador.
let destino = lineaPorDefecto;

/**
 * Escribe una línea ya formateada en la consola.
 *
 * Cada nivel usa un método de consola distinto a propósito: en Chrome, la
 * consola permite filtrar por "error" y "warning", y ese filtro solo funciona
 * si el mensaje se escribió con el método correspondiente.
 *
 * @param {string} etiqueta Nivel en mayúsculas
 * @param {string} linea Línea JSON completa
 * @returns {void}
 */
function lineaPorDefecto(etiqueta, linea) {
  if (etiqueta === ETIQUETA.error) {
    console.error(linea);
  } else if (etiqueta === ETIQUETA.warn) {
    console.warn(linea);
  } else if (etiqueta === ETIQUETA.debug) {
    console.debug(linea);
  } else {
    console.info(linea);
  }
}

/**
 * Cambia la configuración del logger.
 *
 * @param {{nivel?: string, destino?: Function}} opciones Configuración parcial
 * @returns {void}
 */
export function configurar({ nivel, destino: nuevoDestino } = {}) {
  if (typeof nivel === 'string' && NIVELES.includes(nivel.toLowerCase())) {
    nivelMinimo = nivel.toLowerCase();
  }

  if (typeof nuevoDestino === 'function') {
    destino = nuevoDestino;
  }
}

/**
 * @returns {string} Nivel mínimo que se está escribiendo
 */
export function nivelActual() {
  return nivelMinimo;
}

/**
 * @returns {string} Identificador de correlación vigente
 */
export function correlationId() {
  return idActual();
}

/**
 * Decide si un nivel se escribe.
 *
 * Un nivel desconocido NO se escribe. La razón es que un `logger.info` mal
 * escrito, o un nivel que viene de un dato externo, tiene que ser inofensivo:
 * perder un mensaje es aceptable, inventar severity equivocada no.
 *
 * @param {string} Nivel a comprobar
 * @returns {boolean} true si corresponde escribirlo
 */
function corresponde(nivel) {
  const peso = PESOS[nivel];
  return peso !== undefined && peso >= PESOS[nivelMinimo];
}

/**
 * Escribe un evento.
 *
 * @param {string} nivel Uno de debug, info, warn o error
 * @param {string} mensaje Texto corto que describe qué pasó
 * @param {object} contexto Datos extra, que se limpian antes de escribirse
 * @returns {void}
 */
export function registro(nivel, mensaje, contexto = {}) {
  const nombre = String(nivel).toLowerCase();

  if (!corresponde(nombre)) {
    return;
  }

  const linea = {
    // Fecha en ISO 8601: ordenable con un simple sort y con zona horaria
    // explícita, que es lo que hace comparables dos logs de máquinas
    // distintas.
    ts: new Date().toISOString(),
    nivel: ETIQUETA[nombre],
    // El id de correlación: la columna que permite unir esta línea con las
    // del backend para la misma petición.
    correlation_id: correlationId(),
    mensaje,
    contexto: limpiar(contexto),
  };

  try {
    destino(ETIQUETA[nombre], JSON.stringify(linea));
  } catch (error) {
    // Un destino que falla (consola bloqueada por una extensión, por ejemplo)
    // no puede romper la pantalla del usuario. Se avisa con el método más
    // primitivo que existe y se sigue.
    console.warn('[saludweb] no se pudo escribir el log:', error);
  }
}

/** Evento de detalle interno, de desarrollo. @param {string} mensaje @param {object} contexto @returns {void} */
export function debug(mensaje, contexto) {
  registro('debug', mensaje, contexto);
}

/** Evento normal del sistema. @param {string} mensaje @param {object} contexto @returns {void} */
export function info(mensaje, contexto) {
  registro('info', mensaje, contexto);
}

/** Situación anómala pero recuperable. @param {string} mensaje @param {object} contexto @returns {void} */
export function warn(mensaje, contexto) {
  registro('warn', mensaje, contexto);
}

/** Fallo que requiere atención. @param {string} mensaje @param {object} contexto @returns {void} */
export function error(mensaje, contexto) {
  registro('error', mensaje, contexto);
}

/**
 * Deja el logger como estaba. Existe para las pruebas, que necesitan partir
 * siempre del mismo estado y no arrastrar el nivel o el destino de otra
 * prueba.
 *
 * @returns {void}
 */
export function restablecer() {
  nivelMinimo = 'info';
  destino = lineaPorDefecto;
}

/**
 * Se exporta para que las pruebas puedan comprobar la redacción sin tener que
 * descifrar una línea JSON. Es la función que aplica las reglas de secreto.
 */
export const limpiarContexto = limpiar;
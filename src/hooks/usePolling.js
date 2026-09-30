// ============================================================
// HOOK: usePolling - Actualización periódica con espera adaptativa
// ============================================================
// Módulo: "Sistema de gestión de citas online" (guía de datos en tiempo real)
//
// ¿POR QUÉ POLLING Y NO SSE / WEBSOCKET?
// La guía pide tiempo real SOLO cuando el retraso se percibe. Acá el retraso no
// molesta: un horario que acaba de liberarse se ve en el próximo refresh.
// Las razones técnicas están documentadas en el backend (ver el comentario de
// CitaService y EstadisticaService), pero en resumen:
//   • El backend responde y hace exit en cada petición, así que no se puede
//     mantener un proceso abierto para un canal bidireccional.
//   • Duplicar el estado en una base "en tiempo real" crea dos fuentes de
//     verdad que pueden discrepar, que es peor que estar 30 s desfasado.
//
// ¿POR QUÉ ESPERA ADAPTATIVA Y NO UN setInterval FIJO?
// Un setInterval de 5 s funciona pero desperdicia peticiones: la mayoría de las
// veces la agenda no cambió nada. Acá el intervalo depende de dos señales:
//
//   1. Si la respuesta trajo ALGO NUEVO → se acorta la espera, porque hay
//      movimiento y el usuario probablemente está mirando porque algo pasó.
//   2. Si la respuesta es IDÉNTICA a la anterior → se duplica la espera, hasta
//      un tope. Tras varios rounds sin cambios ya se asume que la pantalla está
//      quieta y no hace falta seguir insistiendo.
//
// Además se frena por completo cuando la pestaña del navegador no está
// visible: si el usuario está en otra pestaña, recargar la agenda cada 5 s
// consume batería y datos sin que nadie la esté mirando. Al volver a la
// pestaña se refresca de inmediato, así que nunca se ve información vieja.
//
// POR QUÉ SE USA "clave" Y NO UN ARRAY DE DEPENDENCIAS
// -----------------------------------------------------
// La opción más intuitiva para un hook de este tipo sería aceptar un array de
// dependencias, como useEffect. El problema es que un array de dependencias con
// longitud variable es un error que React no puede detectar: si el componente
// pasa 1 elemento un render y 2 al siguiente, React ignora el cambio y el
// ciclo queda congelado, sin ningún aviso. Ese bug es muy difícil de encontrar.
//
// En su lugar se pide una `clave`: un string que describa qué se está mirando.
// El hook no la interpreta, solo la compara. El componente la arma con
// template literals, y si mañana quiere reiniciar el ciclo por otra razón
// (un token distinto, un rol distinto) solo tiene que incluirlo en el string.
// El tipo de dato, y no la forma del array, hace imposible el error.
// ============================================================

import { useEffect, useRef, useState, useCallback } from 'react';
// useEffect: conecta el ciclo de vida del temporizador con el del componente.
// useRef: guarda valores que NO deben provocar un re-render (el último dato
//          recibido, la generación actual, el temporizador activo).
// useState: estado que SÍ se ve en pantalla (los datos y los flags de estado).
// useCallback: memoriza la función de recarga para no romper el efecto.

const ESPERA_MINIMA = 5000;
// 5 segundos: valor por debajo del cual la actualización se empieza a notar
// como un parpadeo en pantalla.
const ESPERA_MAXIMA = 60000;
// 60 segundos (1 minuto): tope del backoff. Si la agenda sigue sin cambios,
// no tiene sentido consultar más seguido que esto: cuando algo cambie, el
// usuario va a ver el dato fresco en el próximo ciclo de todos modos.

/**
 * Hook que ejecuta una función asíncrona periódicamente y devuelve su
 * último resultado, aplicando una espera adaptativa.
 *
 * @param {Function} tarea Función asíncrona a ejecutar. Debe devolver el dato
 *                         que se quiere mostrar (cualquier valor; lo que
 *                         importa es que sea estable para comparar).
 * @param {object} [opciones] Configuración.
 * @param {boolean} [opciones.activo=true] Si es false, no se ejecuta ninguna
 *                        petición. Se usa para no pedir disponibilidad de un
 *                        día que todavía no se despliega.
 * @param {string} [opciones.clave] Texto que identifica QUÉ se está polling.
 *                        Si cambia, se reinicia el ciclo y se limpian los datos
 *                        anteriores. Ej: `disponibilidad-4-2026-09-29`.
 * @returns {object} {
 *   datos: el último resultado de la tarea (o null mientras carga la primera vez),
 *   cargando: true mientras la PRIMERA petición no respondió,
 *   error: mensaje del último error, o null,
 *   refreshing: true en las recargas posteriores (para refrescar sin parpadear),
 *   ultimaActualizacion: Date de la última respuesta recibida, o null,
 *   recargar: función para forzar una recarga inmediata
 * }
 */
export function usePolling(tarea, opciones = {}) {
  const { activo = true, clave = '' } = opciones;
  // Se desestructuran las opciones con valores por defecto seguros.

  // ---- Estado visible en pantalla ----
  const [datos, setDatos] = useState(null);
  // datos: el último resultado exitoso de la tarea.
  const [cargando, setCargando] = useState(activo);
  // cargando: solo vale true durante la primera carga. Las recargas posteriores
  // usan 'refreshing' para no tapar el contenido que ya está en pantalla: si
  // en cada recarga se mostrara el spinner completo, la pantalla parpadearía
  // cada 5 segundos y sería más molesto que el retraso que se quiere evitar.
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);

  // ---- Referencias (no causan re-render) ----
  const tareaRef = useRef(tarea);
  // Se guarda la tarea en una ref para poder llamarla desde el temporizador sin
  // volver a crear el efecto cada vez que el componente crea una función nueva
  // (cosa que pasa con las funciones inline, que es lo habitual).
  tareaRef.current = tarea;
  // Se actualiza en cada render: así el temporizador siempre llama a la
  // versión más reciente de la tarea, con los valores actuales del estado.

  const esperaRef = useRef(ESPERA_MINIMA);
  // Espera actual en milisegundos. Empieza en el mínimo y crece con cada
  // respuesta sin novedades.

  const datosRef = useRef(null);
  // Copia del último dato recibido. Se necesita para COMPARAR con el nuevo
  // resultado dentro de la tarea, sin depender del estado (que cambia de forma
  // asíncrona y llegaría tarde).

  const hayCambioRef = useRef(false);
  // Marca si la última respuesta trajo algo distinto. Lo consume el temporizador
  // para decidir si acorta o alarga la espera.

  const primeraCargaRef = useRef(true);
  // Indica si todavía no se completó ninguna petición. Permite diferenciar la
  // carga inicial de las recargas.

  const generacionRef = useRef(0);
  /*
  CONTRA EL ENVIO DE RESPUESTAS OBSOLETAS.

  Es el detalle más importante del hook y el que más fácil se olvida. Cuando
  cambia la clave (por ejemplo, la persona despliega el martes y se consulta la
  disponibilidad del martes), arranca un ciclo nuevo. Pero la petición del
  LUNES, que ya estaba en vuelo, puede volver DESPUÉS. Si esa respuesta vieja
  se escribiera en el estado, la pantalla mostraría los horarios del lunes
  mientras el título dice martes: un desajuste que parece un bug del backend
  y en realidad es del frontend.

  Un único flag de "cancelado" no alcanza, porque el ciclo nuevo lo reinicia a
  false y la respuesta vieja vuelve a verse como válida. La solución es un
  CONTADOR de generación: cada ciclo toma un número, y una respuesta solo se
  acepta si su número sigue siendo el último. Como el número nunca se repite,
  no hay forma de que dos ciclos se confundan.
  */

  // ---- La tarea de recarga ----
  const ejecutar = useCallback(async (generacion) => {
    // El parámetro identifica a qué ciclo pertenece esta ejecución.
    const vigente = () => generacion === generacionRef.current;
    // Solo se escriben resultados mientras esta sigue siendo la última
    // generación conocida.

    try {
      const resultado = await tareaRef.current();
      // Se llama a la versión más reciente de la tarea guardada en la ref.

      if (!vigente()) {
        return;
        // arrived tarde, de un ciclo ya superado. Se descarta sin tocar estado.
      }

      // Se decide si el dato es "nuevo" comparándolo con el anterior, ya
      // serializado. Se comparan STRINGS y no objetos porque el backend manda
      // JSON recién parseado en cada respuesta: dos objetos con los mismos
      // datos son distintos en memoria (distinta referencia) aunque sean
      // idénticos en contenido. Sin este paso, el polling detectaría cambios
      // en cada consulta y nunca entraría en la espera larga.
      const nuevos = JSON.stringify(resultado ?? null);
      // ?? null unifica undefined y null para que comparen igual.
      const anterior = JSON.stringify(datosRef.current ?? null);

      hayCambioRef.current = nuevos !== anterior;
      // Si la respuesta trae novedades, la espera se acorta en el próximo ciclo.

      datosRef.current = resultado;
      setDatos(resultado);
      setError(null);
      // El error se limpia: si la petición anterior falló y esta funciona,
      // dejarlo puesto haría creer que el problema sigue.
      setUltimaActualizacion(new Date());

      if (primeraCargaRef.current) {
        primeraCargaRef.current = false;
        setCargando(false);
        // La primera carga terminó: ya se puede mostrar el contenido.
      }
    } catch (err) {
      if (!vigente()) {
        return;
        // El error de un ciclo viejo tampoco se muestra: si la persona ya
        // cambió de día, ver el fallo de la consulta anterior la haría pensar
        // que el problema es con el día nuevo.
      }

      setError(err?.response?.data?.mensaje || err?.message || 'Error al actualizar los datos');
      // Se traduce el error de Axios a algo mostrable. Se prioriza el mensaje
      // del backend, que sabe qué validación falló, sobre el genérico de Axios.
      if (primeraCargaRef.current) {
        primeraCargaRef.current = false;
        setCargando(false);
        // Aunque la PRIMERA carga falle hay que dejar de mostrar el spinner:
        // si no, la pantalla quedaría cargando para siempre y el usuario no
        // vería nunca el mensaje de error ni el botón de reintento.
      }
    }
    // finally: no hace falta, porque el siguiente ciclo se agenda igual. Si se
    // cortara el polling ante un error, un error de red momentáneo dejaría la
    // pantalla congelada sin posibilidad de recuperación automática.
  }, []);
  // El arreglo de dependencias es vacío a propósito: 'ejecutar' no debe cambiar
  // nunca de identidad, o el efecto que lo agenda se reiniciaría en cada render
  // y nunca llegaría a disparar la segunda consulta.

  // Recarga manual: la expone el botón "Actualizar".
  const recargar = useCallback(() => {
    esperaRef.current = ESPERA_MINIMA;
    // Vuelve a la espera mínima: el usuario pidió datos frescos, así que la
    // próxima consulta se hace enseguida y la siguiente ya sigue el ciclo normal.
    setRefreshing(true);
    // Flag para distinguir este arranque del ciclo automático.
    // Se pasa la generación actual: esta recarga manual pertenece al ciclo vivo,
    // y si el ciclo cambia mientras vuela, su resultado se descarta igual que el
    // de cualquier otra petición.
    ejecutar(generacionRef.current).finally(() => setRefreshing(false));
    // finally: se apaga el flag de "refrescando" haya pasado lo que haya pasado.
  }, [ejecutar]);

  // ==================================================================
  // Reinicio cuando cambia la clave
  // ==================================================================
  useEffect(() => {
    // Se limpian los datos del ciclo anterior ANTES de que arranque el nuevo.
    // Sin esto, al cambiar de día se verían los horarios del día anterior hasta
    // que llegue la primera respuesta nueva, lo que alcanza para que la persona
    // reserve un horario que ya no corresponde.
    datosRef.current = null;
    esperaRef.current = ESPERA_MINIMA;
    hayCambioRef.current = false;
    primeraCargaRef.current = true;
    // Vuelve a ser "primera carga": el spinner completo sí corresponde ahora,
    // porque no hay nada válida en pantalla.
    setDatos(null);
    setError(null);
    setUltimaActualizacion(null);
    setCargando(activo);
  }, [clave, activo]);
  // 'activo' entra en las dependencias por un caso concreto: si el componente
  // se monta con activo=false y después lo activa, hay que pasar a estado
  // "cargando". Si solo dependiera de la clave, seguiría en false y la pantalla
  // quedaría vacía sin spinner mientras llega la primera respuesta.

  // ==================================================================
  // El ciclo de polling
  // ==================================================================
  // La visibilidad del navegador se maneja DENTRO de este efecto y no en uno
  // aparte, por una razón concreta: para pausar de verdad hay que poder
  // cancelar el temporizador pendiente, y ese temporizador es una variable local
  // de este efecto. Un efecto separado solo puede llamar a recargar() cuando la
  // pestaña vuelve a verse, porque desde afuera no hay forma de tocar el
  // temporizador. Con dos efectos, ocultar la pestaña no detenía nada: el
  // temporizador seguía corriendo y el navegador lo ejecutaba igual, porque los
  // navegadores solo frenan los temporizadores de las pestañas muy congeladas,
  // no de forma inmediata ni confiable.
  useEffect(() => {
    if (!activo) {
      return undefined;
      // Si el hook está desactivado no se agenda nada. Se devuelve undefined
      // explícito (y no solo un return vacío) para cumplir la convención de
      // useEffect y no confundir a ESLint.
    }

    const generacion = generacionRef.current + 1;
    generacionRef.current = generacion;
    // Se abre un ciclo nuevo. Cualquier petición en vuelo de un ciclo anterior
    // tiene un número menor y por lo tanto su respuesta se descartará.

    let temporizador = null;
    // Referencia al setTimeout actual. Se necesita para poder cancelarlo en la
    // limpieza del efecto (clearTimeout) cuando la clave cambie.

    let pausado = false;
    // Indica que la pestaña está oculta. Es un booleano simple en vez del
    // document.hidden directo porque el valor tiene que leerse en el callback
    // del temporizador, que se define antes que el listener: si se leyera
    // document.hidden en cada consulta, el efecto no dependería de nada y la
    // pausa quedaría implícita en un lugar distinto del que la controla.

    /** Cancela el temporizador pendiente, si hay uno. */
    const cancelarTemporizador = () => {
      if (temporizador) {
        clearTimeout(temporizador);
        temporizador = null;
      }
    };

    const programar = () => {
      cancelarTemporizador();
      // Antes de rearmar se limpia siempre el temporizador anterior. Sin esto,
      // la recarga al volver a la pestaña dejaría DOS cadenas de temporizadores
      // conviviendo y la consulta se iría duplicando con el uso: dos por
      // vuelta a la pestaña, cuatro después de cuatro.

      if (pausado) {
        return;
        // Con la pestaña oculta no se rearma nada. Al volver a verse, el
        // listener de visibilidad es quien arranca de nuevo.
      }

      temporizador = setTimeout(async () => {
        temporizador = null;
        // Se anota que este temporizador ya se disparó, para que la limpieza no
        // intente limpiar uno que ya corrió.

        if (generacion !== generacionRef.current || pausado) {
          return;
          // El ciclo ya fue superado, o la pestaña se ocultó entre la
          // programación y el disparo. Se corta la recursión: si no, el
          // temporizador seguiría encadenando consultas para siempre, incluso
          // después de que la pantalla dejó de mirar estos datos.
        }

        await ejecutar(generacion);
        // Se espera a que termine para no solapar peticiones: si el servidor
        // tardara 8 segundos y la espera fuera de 5, se acumularían llamadas.

        if (generacion !== generacionRef.current || pausado) {
          return;
          // Puede haber cambiado el ciclo o la visibilidad durante la petición.
          // Si se siguiera encadenando, este temporizador competiría con el nuevo.
        }

        // Backoff adaptativo: si no hubo cambios, se duplica la espera hasta el
        // tope. Si hubo cambios, se vuelve al mínimo porque hay movimiento.
        esperaRef.current = hayCambioRef.current
          ? ESPERA_MINIMA
          : Math.min(esperaRef.current * 2, ESPERA_MAXIMA);

        programar();
        // Se reagenda el siguiente ciclo. La recursión es intencional: así cada
        // ciclo puede decidir su propia espera en función de lo que pasó.
      }, esperaRef.current);
    };

    /** Ocultar o mostrar la pestaña. */
    const alCambiarVisibilidad = () => {
      cancelarTemporizador();
      // Primero se cancela cualquier temporizador pendiente, en los dos
      // sentidos. Es lo que hace que la pausa sea real: mientras está oculta no
      // queda ninguna consulta en el reloj, ni una sola.

      if (document.visibilityState === 'visible') {
        pausado = false;
        ejecutar(generacion).finally(() => {
          if (generacion !== generacionRef.current || pausado) {
            return;
          }
          // Al volver a la pestaña se consulta en el acto, para que la persona
          // no vea información vieja: si estuvo dos minutos en otra pestaña,
          // varios horarios pueden haberse tomado o liberado.
          esperaRef.current = hayCambioRef.current
            ? ESPERA_MINIMA
            : Math.min(esperaRef.current * 2, ESPERA_MAXIMA);
          programar();
        });
      } else {
        pausado = true;
        // No se rearma nada. Quedan cero consultas en cola hasta que la
        // pestaña vuelva a verse.
      }
    };

    document.addEventListener('visibilitychange', alCambiarVisibilidad);
    // El listener se registra antes de la primera consulta, para que un cambio
    // de visibilidad durante esa petición no quede sin capturar.

    // Primera consulta INMEDIATA (no se espera a que venza nada): al montar la
    // pantalla el usuario quiere ver los datos ya, no en 5 segundos.
    ejecutar(generacion);

    programar();

    // ---- Limpieza: se ejecuta al cambiar la clave, al desactivar o al desmontar ----
    return () => {
      document.removeEventListener('visibilitychange', alCambiarVisibilidad);

      cancelarTemporizador();
      // Se cancela el temporizador pendiente. Sin esto, al cambiar de fecha
      // quedaría un temporizador viejo que dispararía una consulta con los
      // valores de la fecha anterior, que es la causa clásica de "el listado
      // muestra los datos de la fecha que acabo de cambiar".

      generacionRef.current += 1;
      // Se invalida el ciclo. No hace falta un flag de "desmontado": con este
      // incremento, toda respuesta en vuelo queda con un número viejo y se
      // descarta sola, y el temporizador ya fue cancelado arriba.
    };
  }, [activo, clave, ejecutar]);
  // Las dependencias son fijas en cantidad y tipo, así que React no tiene
  // problema para compararlas. No hace falta eslint-disable.

  return { datos, cargando, error, refreshing, ultimaActualizacion, recargar };
  // Se devuelve el estado junto con la función de recarga manual.
}

// ============================================================
// HOOK AUXILIAR: useSegundosDesde
// ============================================================
/**
 * Temporizador de "se actualizó hace N segundos".
 *
 * Existe por un motivo de UX concreto: cuando los datos se refrescan solos,
 * el usuario necesita saber si lo que está viendo es reciente. Sin este
 * indicador, una pantalla que se actualiza sola da la sensación de estar
 * "clavada" o de que la app no responde, aunque esté mostrando lo correcto.
 *
 * @param {Date|null} desde Fecha del último cambio a medir.
 * @returns {number} Segundos transcurridos.
 */
export function useSegundosDesde(desde) {
  // Se declara un estado que fuerza el re-render para que el contador avance.
  const [, forzar] = useState(0);
  // No se guarda el valor del contador: solo se usa el setter para provocar el
  // re-render. Guardarlo sería mostrar un número que nadie lee.

  useEffect(() => {
    if (!desde) {
      return undefined;
      // Sin fecha de referencia no hay nada que medir.
    }

    const id = setInterval(() => forzar((n) => n + 1), 1000);
    // Un tick por segundo es suficiente: el contador se muestra en segundos
    // enteros, así que refrescar más rápido no aportaría nada.

    return () => clearInterval(id);
    // Al desmontar (o al cambiar 'desde') se libera el intervalo.
  }, [desde]);

  if (!desde) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - desde.getTime()) / 1000));
  // Math.max con 0 evita que aparezca "-1" si el reloj del sistema se ajustó
  // hacia atrás entre renders (pasa al suspender una pestaña).
}

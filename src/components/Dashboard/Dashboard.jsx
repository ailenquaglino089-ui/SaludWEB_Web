// ============================================================
// PANTALLA: Dashboard
// ============================================================
// Panel de entrada una vez iniciada la sesión.
//
// POR QUÉ TIENE DOS VERSIONES DISTINTAS SEGÚN EL ROL
// -------------------------------------------------
// El endpoint /api/estadisticas devuelve 403 a los pacientes, y no por un
// capricho del backend: son indicadores de gestión de un consultorio
// (ocupación de agenda, ausentismo, demanda por especialidad). Un paciente
// no tiene por qué verlos y no le sirven para nada.
//
// La consecuencia para esta pantalla es que NO puede ser una sola: pedir las
// estadísticas siempre y esconderlas si falla produce la peor versión posible.
// La primera vez la pantalla muestra "Cargando", y un 403 es un fallo, así que
// el paciente ve un mensaje de error en su propia pantalla de bienvenida.
//
// La solución es decidir ANTES de pedir nada: si el rol es admin o médico se
// piden las estadísticas; si es paciente, se muestran sus próximos turnos. No
// hay petición que pueda fallar por permiso.
//
// LOS ENLACES SE ADAPTAN AL ROL
// -----------------------------
// Un paciente que entra al panel ve las tarjetas de Médicos, Pacientes,
// Prescripciones y Configuración. Las tres primeras no le sirven: no puede
// ver la lista de pacientes de otros ni emitir recetas. Mostrarlas produce
// clicks que terminan en un 403, que es una forma de decir "tu sesión está
// rota" cuando en realidad el sistema está funcionando como debe.
//
// Y LOS <a href> SE CAMBIARON POR <Link>
// -------------------------------------
// Un <a href="/medicos"> en una SPA descarta la página entera y recarga los
// bundles desde el servidor. Funciona, pero tira abajo todo el estado: la
// pantalla parpadea, se pierde la posición del scroll y en móvil se pierde el
// historial de navegación. <Link> navega dentro de la aplicación sin que nada
// de eso ocurra. Es el mismo motivo por el que existe el router.
//
// ESTA PANTALLA YA NO USA POLLING
// ===============================
// Antes esta pantalla refrescaba cada 5 segundos con usePolling. Ahora escucha
// un canal de Server-Sent Events: el servidor avisa cuando un turno cambia y el
// panel se recarga en ese momento.
//
// POR QUÉ SOLO ACÁ Y NO EN TODAS LAS PANTALLAS
// El polling no estaba mal por sí mismo: la guía lo acepta cuando el retraso no
// molesta. Acá sí molesta. Un panel que dice "42 turnos registrados" cuando ya
// hay 45 no está desactualizado, está mintiendo: es un número que alguien puede
// usar para decidir. En la agenda de un médico, en cambio, un retraso de 30
// segundos es invisible para el usuario.
//
// Qué se ganó y qué se costó, con las dos partes:
//
//   Se ganó: 0 peticiones cuando no pasa nada. Antes, un panel abierto y quieto
//   generaba 12 peticiones por minuto para leer siempre el mismo número.
//
//   Se costó: un proceso de PHP por panel abierto, y una conexión que hay que
//   saber cerrar. Por eso el cierre del canal está en el hook y no acá, y por
//   eso sigue existiendo el botón de recargar: si el canal se cae, el usuario
//   tiene que poder pedir los datos a mano sin esperar la reconexión.
//
// LA REGLA QUE NO SE ROMPIÓ
// El canal manda un AVISO ("esto cambió"), no los datos. Los números se siguen
// pidiendo por REST. Si el canal trotara los datos dentro, haría falta mantener
// una copia de las estadísticas en el servidor, y entonces habría dos fuentes
// de verdad que pueden discrepar entre sí.
// ============================================================

import React, { useState, useCallback, useEffect, useRef } from 'react';
// useState: estadísticas, error, turnos.
// useCallback: estabiliza las funciones que se le pasan al canal y al hook.
// useEffect: carga inicial (UNA sola vez) y arranque del canal.
// useRef: marca de "hay una recarga en curso".

import { Link } from 'react-router-dom';
// Link: navegación de la SPA.

import { useAuth } from '../../hooks/useAuth';
// Para saber el rol, que decide qué versión del panel se muestra.

import { obtenerEstadisticas, listarMisTurnos, mensajeDeError } from '../../api/turnera';
// Importa SOLO las funciones de la API.
//
// IMPORTANTE: los DATOS siguen viniendo por REST. El canal de tiempo real no
// manda las estadísticas ni los turnos: solo avisa que algo cambió. Esa es la
// diferencia entre "notificar un cambio" y "mantener el estado sincronizado", y
// es la razón por la que este módulo no duplica la información en una tabla
// aparte: la tabla citas sigue siendo la única fuente de verdad.

import useEventosRealtime from '../../hooks/useEventosRealtime';
// Hook que abre el canal SSE y lo cierra solo al desmontar la pantalla.

import { Cargando, Aviso } from '../Turnera/PiezasTurnera';
// Piezas compartidas. No hay spinner propio: el del módulo de turnera ya está
// hecho y probado.

import './Dashboard.css';
// Estilos específicos del panel.

/** Tarjeta de acceso rápido a un módulo. */
function Tarjeta({ icono, titulo, texto, enlace, textoEnlace }) {
  return (
    <div className="dashboard-card">
      {/* Los iconos son decorativos: el significado ya está en el título, que
          es lo que lee el lector de pantalla. */}
      <div className="card-icon" aria-hidden="true">{icono}</div>
      <h3>{titulo}</h3>
      <p>{texto}</p>
      <Link to={enlace} className="card-link">
        {textoEnlace} →
      </Link>
    </div>
  );
}

/** Un indicador numérico. */
function Indicador({ valor, etiqueta, detalle }) {
  return (
    <div className="stat-box">
      <p className="stat-value">{valor}</p>
      <p className="stat-label">{etiqueta}</p>
      {detalle && <p className="stat-detalle">{detalle}</p>}
    </div>
  );
}

/**
 * Describe el período que cubren los indicadores.
 *
 * Sin esto, los números del panel no significan nada: un 40% de ocupación
 * sobre el último mes es un dato distinto del mismo 40% sobre toda la historia.
 * El backend manda el rango exacto, así que se muestra el que Él calculó en vez
 * de suponer un período por cuenta propia.
 *
 * @param {object} estadisticas Respuesta completa de /api/estadisticas.
 * @returns {string} Texto del período, o cadena vacía si no vino.
 */
function periodoDe(estadisticas) {
  const desde = estadisticas?.rango?.desde;
  const hasta = estadisticas?.rango?.hasta;

  if (!desde || !hasta) {
    return '';
  }

  return `Entre el ${desde} y el ${hasta}`;
}

export default function Dashboard() {
  const { usuario } = useAuth();

  const [estadisticas, setEstadisticas] = useState(null);
  const [error, setError] = useState(null);
  const [turnos, setTurnos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  // turnos arranca en null y no en []: la diferencia entre "todavía no se
  // consultó" y "se consultó y no tenés turnos" cambia lo que se muestra, y
  // con un array vacío inicial no se pueden distinguir.

  // El nombre de la variable de estado no se usa como bandera; se deriva del
  // rol, que ya está disponible. Pedir las estadísticas y que se decida por rol
  // es exactamente lo que se quiere evitar.
  const rol = usuario?.tipo_usuario;
  const veEstadisticas = rol === 'admin' || rol === 'medico';
  // Un paciente NO entra acá. Es la misma condición que aplica el backend, y
  // mantenerla en un solo lugar del código es la razón de no intentarlo y
  // manejar el 403 después.

  // Marca de recarga en curso. Existe para que dos eventos que llegan juntos no
  // disparen dos peticiones idénticas al mismo tiempo. Sin esto, si en un
  // consultorio se reservan tres turnos en un segundo, el panel hace tres
  // GET /api/estadisticas en paralelo y muestra el resultado de la más lenta,
  // que puede ser el más viejo de los tres: la pantalla "se atrasa sola" sin
  // motivo aparente.
  const recargandoRef = useRef(false);

  /** Carga las estadísticas del consultorio. */
  const cargarEstadisticas = useCallback(async () => {
    if (!veEstadisticas) {
      return { sinPermiso: true };
      // Doble barrera: aunque el rol cambiara con la sesión viva, no se envía
      // una petición que el backend va a rechazar.
    }

    try {
      const datos = await obtenerEstadisticas();
      setEstadisticas(datos);
      setError(null);
      setUltimaActualizacion(new Date());
      // La marca de tiempo se actualiza en cada respuesta correcta, sin
      // importar si vino del canal o de una recarga manual. El indicador
      // "Actualizado hace N s" tiene que significar "hace cuánto que estos
      // números son ciertos", y eso no depende de cómo llegaron.
      return datos;
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar las estadísticas'));
      return null;
    }
  }, [veEstadisticas]);

  /** Carga los próximos turnos del paciente. */
  const cargarTurnos = useCallback(async () => {
    try {
      const resultado = await listarMisTurnos();
      setTurnos(resultado);
      setError(null);
      setUltimaActualizacion(new Date());
      return resultado;
    } catch (err) {
      // Acá sí se captura, y es a propósito: el error NO lo maneja el canal.
      // El estado de error es compartido entre las dos ramas (estadísticas y
      // turnos) para que haya un solo aviso en la pantalla y no dos, uno por
      // sección.
      setError(mensajeDeError(err, 'No se pudieron cargar tus turnos'));
      return null;
    }
  }, []);

  // Se elige la función de carga según el rol, una sola vez por render. Así el
  // manejador de eventos no tiene que decidir qué recargar cada vez que llega
  // algo.
  const cargar = veEstadisticas ? cargarEstadisticas : cargarTurnos;

  /**
   * Recarga los datos y se asegura de que no haya dos a la vez.
   *
   * @param {boolean} forzar true si hay que recargar aunque ya haya una en curso
   */
  const recargar = useCallback(async (forzar = false) => {
    // Si ya hay una petición en vuelo y esta no es forzada, se descarta. El
    // "forzar" existe para el botón manual: si el usuario aprieta "Actualizar"
    // dos veces, las dos tienen que ejecutarse.
    if (recargandoRef.current && !forzar) {
      return;
    }

    recargandoRef.current = true;
    setCargando(true);
    // Se levanta el spinner solo si no hay datos previos. Si ya hay números en
    // pantalla, conviene mantenerlos visibles mientras llegan los nuevos: una
    // cifra que desaparece y vuelve a aparecer cada vez que alguien reserva un
    // turno es máscansada que una cifra que cambia sola.

    try {
      await cargar();
    } finally {
      recargandoRef.current = false;
      setCargando(false);
      // finally: el flag se baja haya ido bien o mal. Si el flag se quedara
      // levantado por un error, la pantalla quedaría bloqueada para siempre y
      // no volvería a actualizarse nunca más.
    }
  }, [cargar]);

  // ==================================================================
  // El canal en vivo
  // ==================================================================
  // El canal se elige por rol con la misma lógica que los datos:
  //   admin/médico → 'tablero'  (los indicadores cambian con cualquier turno)
  //   paciente     → 'mis-turnos' (sus propios turnos)
  //
  // No se manda un canal "para todos": el backend traduce el nombre declarado
  // al canal real usando el token, así que un paciente no podría abrir el
  // tablero aunque quisiera, y un admin no vería la agenda ajena por error.
  const canal = rol === 'admin' || rol === 'medico' ? 'tablero' : 'mis-turnos';

  const manejarEvento = useCallback(() => {
    // El PAYLOAD del evento no se usa para nada acá, y es a propósito.
    //
    // El evento trae el tipo y el id del turno que cambió. Con eso se podría
    // intentar armar el número nuevo en el navegador ("si:before=42,
    // after=43"), y sería un error grave: las estadísticas no son un contador
    // simple. El ausentismo, la ocupación y el porcentaje de reservas online se
    // calculan cruzando citas, horarios ofrecidos y cancelaciones. Sumar y
    // restar en el cliente desincroniza esos cruces en la primera excepción
    // (un turno cancelado el mismo día del rango, por ejemplo).
    //
    // La guía menciona "incrementar el contador en vez de recalcular" como
    // ahorro de peticiones. Ese consejo es correcto para un contador de likes,
    // donde el total es exactamente "cuántas filas hay". Acá los indicadores no
    // cumplen esa condición, así que se recalcula por REST. La petición solo se
    // hace cuando algo pasó de verdad, que es lo que importa.
    recargar();
  }, [recargar]);

  const { estado: estadoCanal, reconectar } = useEventosRealtime(
    canal,
    manejarEvento,
    Boolean(rol)
    // El canal no se abre hasta que se sabe el rol. Antes de que AuthContext
    // verifique el token, 'usuario' es undefined y no se sabe si este usuario
    // tiene derecho al canal. Abrirlo y que el servidor responda 403 sería
    // gastar una conexión para nada.
  );

  // ==================================================================
  // Carga inicial
  // ==================================================================
  useEffect(() => {
    // Se carga UNA vez, cuando ya se sabe el rol. Con el polling anterior esto
    // no hacía falta porque el propio hook se encargaba; ahora la carga inicial
    // es explícita y el canal solo se ocupa de los cambios posteriores.
    if (!rol) {
      return;
    }

    recargar(true);
  }, [rol, recargar]);
  // Depende de 'rol' y no de 'veEstadisticas' a propósito: si el usuario
  // "admin" cambiara de rol dentro de la misma sesión, el useEffect se vuelve a
  // disparar y trae los datos del rol nuevo, en vez de dejar los del anterior.

  // ==================================================================
  // Tarjetas: se arman según el rol
  // ==================================================================
  const tarjetas = veEstadisticas
    ? [
        { icono: '📅', titulo: 'Turnera', texto: 'Reservá y gestioná turnos', enlace: '/turnera', textoEnlace: 'Ver turnera' },
        { icono: '👨‍⚕️', titulo: 'Médicos', texto: 'Gestioná médicos y especialistas', enlace: '/medicos', textoEnlace: 'Ver médicos' },
        { icono: '👤', titulo: 'Pacientes', texto: 'Administrá la información de pacientes', enlace: '/pacientes', textoEnlace: 'Ver pacientes' },
        { icono: '💊', titulo: 'Prescripciones', texto: 'Gestioná recetas médicas', enlace: '/prescripciones', textoEnlace: 'Ver prescripciones' },
      ]
    : [
        { icono: '📅', titulo: 'Turnera', texto: 'Reservá un turno con un profesional', enlace: '/turnera', textoEnlace: 'Reservar un turno' },
        { icono: '🗓', titulo: 'Mis turnos', texto: 'Confirmá o cancelá tus turnos', enlace: '/turnera/mis-turnos', textoEnlace: 'Ver mis turnos' },
        { icono: '🔗', titulo: 'Ficha clínica', texto: 'Vinculá tu cuenta con tu ficha', enlace: '/configuracion', textoEnlace: 'Ir a configuración' },
      ];
  // El paciente recibe Configuración en vez de las tres tarjetas de gestión:
  // es lo único de ese menú que le corresponde.

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>👋 Hola, {usuario?.nombre}</h1>
        {/* Saludo con el nombre, no "Bienvenidos": una pantalla que dice
            "Bienvenidos" a alguien que entró hace un segundo y ya conoce la
            aplicación suena a texto de maqueta. */}
        <p>
          {veEstadisticas
            ? 'Panel de gestión del consultorio'
            : 'Gestioná tus turnos desde acá'}
        </p>

        {/*
        INDICADOR DEL CANAL EN VIVO

        Este cartel es la parte visible del módulo de tiempo real, y hay que
        entender por qué está: con el polling anterior, una pantalla que se
        actualiza sola daba la sensación de estar "clavada". El usuario no
        tenía forma de saber si lo que veía era de hace 3 segundos o de hace
        medio minuto, y la duda permanente era "¿se está actualizando?".

        Ahora el cartel dice la verdad sobre el canal:
          - Verde   : conectado, los cambios llegan solos
          - Ámbar   : reconectando (el servidor se cayó o hay corte de red)
          - Rojo    : sin sesión o canal cerrado, con botón para reintentar

        El botón de reconexión no es decorativo. Si el canal quedó caído y el
        reconector automático no-logra limpiarlo (un proxy que dejó la conexión
        colgada, por ejemplo), el usuario tiene que poder recuperar la pantalla
        sin recargar la página entera y perder su sesión.
        */}
        <div className={`canal-estado canal-${estadoCanal}`} role="status">
          <span className="canal-punto" aria-hidden="true" />
          <span className="canal-texto">
            {estadoCanal === 'conectado' && 'En vivo'}
            {estadoCanal === 'conectando' && 'Conectando al canal...'}
            {estadoCanal === 'reconectando' && 'Reconectando...'}
            {(estadoCanal === 'cerrado' || estadoCanal === 'sin-sesion') && 'Sin canal en vivo'}
            {estadoCanal === 'inactivo' && 'Preparando canal...'}
          </span>

          {(estadoCanal === 'cerrado' || estadoCanal === 'sin-sesion') && (
            <button type="button" className="canal-boton" onClick={reconectar}>
              Reintentar
            </button>
          )}
        </div>

        {/* Botón de recarga manual. Sobrevive al cambio a tiempo real a propósito:
            cuando la conexión está bien no hace falta, y efectivamente no se
            usa. Pero si el canal se cae y la reconexión automática tarda, el
            usuario tiene que poder pedir los datos igual. Sacarlo sería quitar
            una salida de emergencia justo cuando se la necesita. */}
        <button
          type="button"
          className="dashboard-recargar"
          onClick={() => recargar(true)}
          disabled={cargando}
        >
          {cargando && ultimaActualizacion ? 'Actualizando...' : 'Actualizar'}
        </button>
      </div>

      {error && <Aviso tipo="error" texto={error} />}

      <div className="dashboard-grid">
        {tarjetas.map((tarjeta) => (
          <Tarjeta key={tarjeta.enlace} {...tarjeta} />
        ))}
      </div>

      {/* ================================================================
          ESTADÍSTICAS (solo admin y médico)
          ================================================================ */}
      {veEstadisticas && (
        <section className="dashboard-stats" aria-busy={cargando}>
          <div className="stats-encabezado">
            <h2>Indicadores del consultorio</h2>
            <p className="stats-actualizado">
              {ultimaActualizacion
                ? `Datos de las ${ultimaActualizacion.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`
                : 'Actualizando...'}
            </p>
            {/* Antes acá decía "Actualizado hace N segundos", con un contador
                que avanzaba solo. Se cambió por la hora exacta porque con el
                canal el panel puede lleva horas sin actualizarse: si de verdad
                no pasó nada, "hace 47 minutos" se lee como un fallo, cuando en
                realidad es la prueba de que el sistema está tranquilo. */}
          </div>

          {cargando && !estadisticas ? (
            <Cargando texto="Calculando indicadores..." />
          ) : (
            estadisticas && (
              <>
                {/*
                La respuesta del backend es ANIDADA, no plana: demanda, ocupacion,
                asistencia y autogestion son cuatro objetos. Se desarma en
                constantes con nombre antes de pintar, porque en el JSX una
                cadena como estadisticas.ocupacion.porcentaje repetida cuatro
                veces es difícil de leer y de revisar. Además, con los ?? se
                cubre el caso de que el backend no mande alguna de las ramas:
                mostrar "—" es mejor que romper el render con una lectura de
                undefined.
                */}
                <Indicador
                  valor={estadisticas.demanda?.total_citas ?? '—'}
                  etiqueta="Turnos registrados"
                  detalle={periodoDe(estadisticas)}
                />

                <Indicador
                  valor={`${estadisticas.ocupacion?.porcentaje ?? 0}%`}
                  etiqueta="Ocupación"
                  detalle={
                    `${estadisticas.ocupacion?.turnos_reservados ?? 0} de ` +
                    `${estadisticas.ocupacion?.turnos_ofrecidos ?? 0} horarios ofrecidos`
                  }
                />

                <Indicador
                  valor={`${estadisticas.asistencia?.ausentismo_porcentaje ?? 0}%`}
                  etiqueta="Ausentismo"
                  detalle={
                    `${estadisticas.asistencia?.tasa_cancelacion ?? 0}% de cancelaciones`
                  }
                />

                <Indicador
                  valor={`${estadisticas.autogestion?.porcentaje_online ?? 0}%`}
                  etiqueta="Reservas online"
                  detalle={
                    `${estadisticas.autogestion?.reservadas_por_paciente ?? 0} ` +
                    'reservadas por el propio paciente'
                  }
                />
              </>
            )
          )}
        </section>
      )}

      {/* ================================================================
          TURNOS DEL PACIENTE
          ================================================================ */}
      {!veEstadisticas && rol === 'paciente' && (
        <section className="dashboard-stats">
          <h2>Mis próximos turnos</h2>

          {cargando && !turnos ? (
            <Cargando texto="Buscando tus turnos..." />
          ) : turnos?.turnos?.length ? (
            <ul className="proximos-turnos">
              {turnos.turnos.slice(0, 3).map((turno) => (
                <li key={turno.id} className="proximo-turno">
                  <span className="proximo-fecha">
                    {turno.fecha} · {turno.hora} hs
                  </span>
                  <span className="proximo-medico">
                    Dr(a). {turno.medico_nombre}
                  </span>
                  <span className={`estado-badge estado-${turno.estado}`}>
                    {turno.estado}
                  </span>
                </li>
              ))}
            </ul>
          ) : turnos ? (
            /* La condición es 'turnos ? ...' y no un else suelto, a propósito.
               Si la carga falló, 'turnos' queda en null y el aviso de error de
               arriba es lo único que se ve. Con un else normal, un error de red
               mostraría acá "No tenés turnos reservados", que es una afirmación
               falsa: la web no sabe si tenés o no, sabe que no pudo preguntar.
               Esa diferencia entre "no tenés" y "no pude averiguarlo" es
               justamente la que se perdería. */
            <p className="sin-turnos">
              No tenés turnos reservados.{' '}
              <Link to="/turnera">Reservá tu primer turno</Link>.
            </p>
          ) : null}
          {/* Solo los tres primeros: este es un panel de entrada, no la
              pantalla de turnos. Quien quiera verlos todos tiene "Mis turnos"
              en las tarjetas de arriba. */}
        </section>
      )}
    </div>
  );
}

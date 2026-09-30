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
// ============================================================

import React, { useState, useCallback } from 'react';
// useState: estadísticas, error y turnos.
// useCallback: estabiliza las funciones que se le pasan al polling.
// NO hace falta useEffect: usePolling ya ejecuta su tarea apenas se monta, así
// que un efecto que llamara a la misma función dispararía DOS peticiones
// idénticas en cada entrada al panel.

import { Link } from 'react-router-dom';
// Link: navegación de la SPA.

import { useAuth } from '../../hooks/useAuth';
// Para saber el rol, que decide qué versión del panel se muestra.

import { obtenerEstadisticas, listarMisTurnos, mensajeDeError } from '../../api/turnera';
// Importa SOLO las funciones de la API.

import { usePolling, useSegundosDesde } from '../../hooks/usePolling';
// El panel también se actualiza solo: si otra persona reservó un turno, las
// cifras del panel tienen que reflejarlo sin que haya que recargar.

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
      return resultado;
    } catch (err) {
      // Acá sí se captura, y es a propósito: acá el error NO lo maneja el
      // hook. usePolling solo guarda en su propio estado cuando se usa su
      // 'error' para el componente, y en este panel el estado de error es
      // compartido entre las dos ramas (estadísticas y turnos) para que haya un
      // solo aviso en la pantalla y no dos, uno por sección.
      setError(mensajeDeError(err, 'No se pudieron cargar tus turnos'));
      return null;
    }
  }, []);

  const { cargando, ultimaActualizacion } = usePolling(
    veEstadisticas ? cargarEstadisticas : cargarTurnos,
    {
      clave: `dashboard-${rol}-${usuario?.id_usuario ?? 'anonimo'}`,
      activo: Boolean(rol),
    }
  );
  // Una sola instancia del polling para las dos ramas, en vez de dos hooks con
  // carga condicional. Con dos hooks, la rama del paciente igual tendría que
  // montar el suyo para poder llamarlo, y tener un hook montado que no hace
  // nada es una fuente de confusión difícil de detectar después.
  //
  // activo en false mientras el rol sea undefined: antes de que AuthContext
  // verifique el token no se sabe si las estadísticas van a estar permitidas,
  // y adivinarlo produce la petición con 403 que esta pantalla evita.
  //
  // La clave incluye el rol y el id del usuario para que, al cambiar de sesión
  // en el mismo dispositivo, los datos del usuario anterior no queden en
  // pantalla hasta la primera respuesta nueva.

  const segundos = useSegundosDesde(ultimaActualizacion);

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
                ? `Actualizado hace ${segundos} s`
                : 'Actualizando...'}
            </p>
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

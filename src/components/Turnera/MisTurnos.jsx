// ============================================================
// PANTALLA: Mis turnos (turnera)
// ============================================================
// Lista las citas del usuario y permite confirmar o cancelar.
//
// POR QUÉ USA POLLING Y NO UNA SUSCRIPCIÓN
// ----------------------------------------
// El backend no tiene WebSocket ni SSE (a propósito: son dos dependencias
// más que mantener para un beneficio marginal). Entonces la turnera no puede
// "recibir" cambios: tiene que preguntar. Eso es polling, y el hook
// usePolling se encarga de hacerlo con backoff y de cortar cuando la pestaña
// no está a la vista.
//
// POR QUÉ EL ESTADO DEL TURNO CAMBIA DE VERDAD
// ---------------------------------------------
// "Pendiente" no es un dato guardado en la base: es un cálculo. El backend
// deriva el estado a partir de la fecha, la hora y los dos campos de
// confirmación. Por eso esta pantalla NO puede quedarse con el valor que vino
// en la primera respuesta y mostrarlo para siempre: si alguien cancela por
// otro lado, o llega la hora del turno, esta vista quedaría mintiendo. Es
// justamente el motivo de ser del polling.
//
// Y POR QUÉ CONFIRMAR Y CANCELAR SON OPERACIONES DISTINTAS
// -------------------------------------------------------
// Confirmar es marcar asistencia. Cancelar es liberar el horario para que otro
// lo use. Una pantalla con un solo botón "cambiar estado" obligaría a la
// persona a descubrir por ensayo cuál era cuál, y el riesgo de que alguien
// cancele por error un turno confirmado no se corrige con una etiqueta más
// clara. Dos botones explícitos, con sus consecuencias escritas al lado.
// ============================================================

import React, { useState, useCallback } from 'react';
// useState: estado local de la pantalla.
// useCallback: para que la función que se le pasa al polling no cambie de
// identidad en cada render y provoque reinicios innecesarios de la consulta.

import { Link } from 'react-router-dom';
// Link: navegación de la SPA.

import {
  listarMisTurnos,
  confirmarTurno,
  cancelarTurno,
  mensajeDeError,
} from '../../api/turnera';
// Importa SOLO las funciones de la API.

import { useAuth } from '../../hooks/useAuth';
// Para leer el id de usuario, que se usa para invalidar el polling al cambiar
// de sesión en el mismo dispositivo.

import { usePolling, useSegundosDesde } from '../../hooks/usePolling';
// usePolling: centraliza la lógica de consultar-periódicamente.
// useSegundosDesde: para el "Actualizado hace N s" del indicador.

import { Cargando, Aviso, Vacio, IndicadorActualizacion } from './PiezasTurnera';
// Piezas de interfaz compartidas por el módulo.

import './Turnera.css';
// Estilos del módulo.

export default function MisTurnos() {
  const { usuario } = useAuth();
  // El backend ya filtra por rol, así que la web no arma filtros: pide lo que
  // le corresponde a quien está conectado y lo recibe. El rol se usa para la
  // clave del polling, no para armar la consulta.

  const [error, setError] = useState(null);
  const [accionEnCurso, setAccionEnCurso] = useState(null);
  // Id de la cita con la que se está interactuando, para deshabilitar solo esa
  // fila. Deshabilitar toda la lista mientras una acción corre impediría hacer
  // otra cosa en paralelo sin motivo.

  /** Carga la lista de turnos. */
  const cargarTurnos = useCallback(async () => {
    return await listarMisTurnos();
    // Sin try/catch, a propósito. Si el backend falla, listarMisTurnos deja
    // propagar el error y usePolling lo captura, guarda en 'error' y lo
    // muestra. Si esta función lo atrapara, el hook vería una carga exitosa y
    // la pantalla quedaría en "no tenés turnos" sin ningún aviso: un error de
    // servidor visible como una lista vacía, que es la confusión más difícil
    // de detectar después.
  }, []);
  // Sin dependencias: la función no necesita nada del scope, así que
  // useCallback la congela y no se recrea en cada render.

  const {
    datos,
    cargando,
    error: errorDeCarga,
    refreshing,
    ultimaActualizacion,
    recargar,
  } = usePolling(cargarTurnos, {
    clave: `turnos-${usuario?.id_usuario}`,
    activo: true,
  });
  // La clave incluye el id de usuario a propósito: si la persona cierra
  // sesión y entra otra en el mismo dispositivo, el polling se reinicia y no
  // queda mostrando los turnos del usuario anterior hasta la primera respuesta.

  const segundos = useSegundosDesde(ultimaActualizacion);
  // Alimenta el texto "Actualizado hace N s" del indicador.

  const turnos = datos?.turnos ?? [];
  // Lista vacía en vez de undefined, para que el .map no falle.

  // ==================================================================
  // Acciones sobre un turno
  // ==================================================================

  /** Confirma la asistencia a un turno. */
  const confirmar = async (turno) => {
    if (accionEnCurso) {
      return;
      // Ignora clics mientras hay otra acción en curso, aunque sea sobre otra
      // fila: evita que se acumulen peticiones cruzadas.
    }

    setAccionEnCurso(turno.id);
    setError(null);

    try {
      await confirmarTurno(turno.id);
      await recargar();
      // Se recarga desde cero en lugar de parchear el turno local. El estado
      // "confirmada" lo deriva el backend, y parcharlo a mano sería inventar un
      // dato que puede no coincidir con lo que el servidor decidió.
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo confirmar el turno'));
    } finally {
      setAccionEnCurso(null);
    }
  };

  /** Cancela un turno. */
  const cancelar = async (turno) => {
    if (accionEnCurso) {
      return;
    }

    const confirmacion = window.confirm(
      `¿Cancelar el turno del ${turno.fecha} a las ${turno.hora}?\n\n` +
        'El horario vuelve a quedar disponible para que otra persona lo reserve.'
    );
    // confirm() nativo, a propósito. Cancelar un turno libera un recurso que
    // puede necesitar alguien más, así que vale la pena una confirmación
    // explícita. Es la única pantalla del módulo que usa un diálogo del
    // navegador, y el motivo es que la consecuencia no se ve en la pantalla:
    // la otra persona sí pierde el horario.

    if (!confirmacion) {
      return;
      // La persona se arrepintió. No se toca el estado.
    }

    setAccionEnCurso(turno.id);
    setError(null);

    try {
      await cancelarTurno(turno.id);
      await recargar();
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo cancelar el turno'));
    } finally {
      setAccionEnCurso(null);
    }
  };

  // ==================================================================
  // Carga inicial
  // ==================================================================
  if (cargando && !datos) {
    return (
      <div className="turnera">
        <Cargando texto="Cargando tus turnos..." />
      </div>
    );
    // La condición es "cargando Y no hay datos todavía", no solo "cargando". Si
    // fuera solo "cargando", cada actualización del polling escondería la lista
    // y la pantalla parpadearía cada pocos segundos.
  }

  return (
    <div className="turnera">
      <div className="turnera-header">
        <div>
          <h1>Mis turnos</h1>
          {/* Indicador discreto de que los datos se actualizan solos, con un
              botón "Actualizar ahora" para quien prefiera no esperar. Ese botón
              importa acá más que en el catálogo: el estado de un turno cambia
              por la hora del día, y quien acaba de recibir un aviso de
              recordatorio necesita verlo al instante. */}
          <IndicadorActualizacion
            ultimaActualizacion={ultimaActualizacion}
            alActualizar={recargar}
            segundos={segundos}
            refrescando={refreshing}
          />
        </div>
      </div>

      {error && <Aviso tipo="error" texto={error} />}
      {errorDeCarga && !error && <Aviso tipo="error" texto={errorDeCarga} />}

      {turnos.length === 0 ? (
        <>
          <Vacio
            texto="Todavía no tenés turnos reservados."
            icono="🗓"
          />
          {/* Sin botón de reintentar: acá no hubo ningún fallo, la consulta
              funcionó y la respuesta fue vacía de verdad. Un botón de
              "Actualizar" sugeriría que algo anda mal cuando no es así. */}
          <div className="turnera-filtros">
            <Link to="/turnera" className="btn-turnera btn-primario">
              Reservar un turno
            </Link>
          </div>
        </>
      ) : (
        <>
          <p className="turnera-subtitulo">
            {turnos.length} {turnos.length === 1 ? 'turno' : 'turnos'}
          </p>

          <ul className="turnos-lista">
            {/* Lista con <ul>/<li> en vez de una grilla de <div>: la pantalla
                es una enumeración de elementos del mismo tipo, que es
                exactamente lo que las listas semánticas comunican a un lector
                de pantalla. */}
            {turnos.map((turno) => (
              <li key={turno.id} className="turno-item">
                <div className="turno-info">
                  <p className="turno-fecha">
                    {turno.fecha} · {turno.hora} hs
                  </p>
                  <p className="turno-profesional">
                    Dr(a). {turno.medico_nombre}
                    {turno.especialidad_nombre
                      ? ` — ${turno.especialidad_nombre}`
                      : ''}
                  </p>
                  {turno.paciente_nombre && (
                    <p className="turno-paciente">
                      Paciente: {turno.paciente_nombre}
                    </p>
                  )}
                  {turno.motivo && <p className="turno-motivo">{turno.motivo}</p>}
                </div>

                <div className="turno-estado">
                  {/* className con el estado crudo: permite escribir una regla
                      por estado en el CSS en vez de un switch con
                      condicionales en el JSX. */}
                  <span className={`estado-badge estado-${turno.estado}`}>
                    {turno.estado}
                  </span>
                </div>

                {/* Solo se ofrece lo que tiene sentido para el estado actual: no
                    tiene sentido "confirmar" un turno cancelado ni "cancelar"
                    uno ya cancelado. Ocultar en vez de deshabilitar, porque un
                    botón gris sin explicación confunde más que no estar. */}
                {turno.estado === 'pendiente' && (
                  <div className="turno-acciones">
                    <button
                      type="button"
                      className="btn-turnera btn-primario"
                      onClick={() => confirmar(turno)}
                      disabled={accionEnCurso === turno.id}
                    >
                      {accionEnCurso === turno.id ? 'Confirmando...' : 'Confirmar'}
                    </button>

                    <button
                      type="button"
                      className="btn-turnera btn-peligro"
                      onClick={() => cancelar(turno)}
                      disabled={accionEnCurso === turno.id}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {turno.estado === 'confirmada' && (
                  <div className="turno-acciones">
                    {/* La asistencia ya está registrada. Cancelar sigue
                        teniendo sentido (la persona ya no puede asistir), así
                        que el botón queda disponible. */}
                    <button
                      type="button"
                      className="btn-turnera btn-peligro"
                      onClick={() => cancelar(turno)}
                      disabled={accionEnCurso === turno.id}
                    >
                      Cancelar
                    </button>
                  </div>
                )}

                {turno.estado === 'cancelada' && (
                  <div className="turno-acciones">
                    <Link
                      to={`/turnera/agenda/${turno.id_medico}`}
                      className="btn-turnera btn-secundario"
                    >
                      Reservar de nuevo
                    </Link>
                    {/* Volver a la agenda del mismo profesional es la
                        consecuencia útil de una cancelación: la persona quiere
                        reprogramar, no empezar de cero. */}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

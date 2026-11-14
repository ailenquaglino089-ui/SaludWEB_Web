import React, { useCallback } from 'react';

import { listarTurnos } from '../../api/turnera';
import { useAuth } from '../../hooks/useAuth';
import { usePolling, useSegundosDesde } from '../../hooks/usePolling';
import { Cargando, Aviso, Vacio, IndicadorActualizacion } from './PiezasTurnera';

import './Turnera.css';

/**
 * Agenda completa del médico.
 *
 * El backend ya limita `GET /api/turnos` a los turnos del profesional vinculado
 * a la sesión. Esta pantalla solo ordena y presenta esos datos; no decide
 * permisos por su cuenta.
 */

/** Convierte una fecha local a `YYYY-MM-DD` sin pasar por UTC. */
function aISO(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  return `${anio}-${mes}-${dia}`;
}

/** Muestra la fecha en lenguaje natural, por ejemplo “Lunes, 16 de noviembre”. */
function formatearFecha(fecha) {
  const [anio, mes, dia] = fecha.split('-').map(Number);
  const texto = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date(anio, mes - 1, dia));

  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/** Ordena por fecha y hora para que la agenda se lea de lo próximo a lo lejano. */
function ordenarTurnos(a, b) {
  return `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`);
}

export default function MiAgenda() {
  const { usuario } = useAuth();

  // Se consultan hoy y los próximos 30 días. El límite mantiene la pantalla
  // útil para la demo y evita traer un histórico que no se usa acá.
  const cargarAgenda = useCallback(async () => {
    const hoy = new Date();
    const desde = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
    const hasta = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() + 30);

    return await listarTurnos({
      desde: aISO(desde),
      hasta: aISO(hasta),
      porPagina: 100,
    });
  }, []);

  // El polling reutiliza el mismo patrón del resto de la turnera: carga
  // inicial, refresco manual y actualización automática cuando corresponde.
  const {
    datos,
    cargando,
    error,
    refreshing,
    ultimaActualizacion,
    recargar,
  } = usePolling(cargarAgenda, {
    clave: `mi-agenda-${usuario?.id_usuario}`,
    activo: true,
  });

  const segundos = useSegundosDesde(ultimaActualizacion);

  // Se copia el array antes de ordenar para no mutar el estado que devuelve el hook.
  const turnos = Array.isArray(datos) ? [...datos].sort(ordenarTurnos) : [];

  if (cargando && !datos) {
    return (
      <div className="turnera">
        <Cargando texto="Cargando tu agenda..." />
      </div>
    );
  }

  return (
    <div className="turnera">
      <div className="turnera-header">
        <div>
          <h1>Mi agenda</h1>
          <IndicadorActualizacion
            ultimaActualizacion={ultimaActualizacion}
            alActualizar={recargar}
            segundos={segundos}
            refrescando={refreshing}
          />
        </div>
      </div>

      {error && <Aviso tipo="error" texto={error} />}

      {turnos.length === 0 ? (
        <Vacio
          texto="No tenés turnos reservados en los próximos 30 días."
          icono="+"
        />
      ) : (
        <>
          <p className="turnera-subtitulo">
            {turnos.length} {turnos.length === 1 ? 'turno' : 'turnos'} en los próximos 30 días
          </p>

          <ul className="turnos-lista">
            {turnos.map((turno) => (
              <li key={turno.id} className="turno-item">
                <div className="turno-info">
                  <p className="turno-fecha">
                    <time dateTime={turno.fecha}>{formatearFecha(turno.fecha)}</time>
                    {' · '}
                    {turno.hora} hs
                  </p>
                  <p className="turno-paciente">
                    Paciente: {turno.nombre_paciente || 'Sin nombre'}
                    {turno.dni ? ` · DNI ${turno.dni}` : ''}
                  </p>
                  {turno.especialidad && (
                    <p className="turno-profesional">{turno.especialidad}</p>
                  )}
                  {turno.motivo && <p className="turno-motivo">{turno.motivo}</p>}
                </div>

                <div className="turno-estado">
                  <span className={`estado-badge estado-${turno.estado}`}>
                    {turno.estado}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

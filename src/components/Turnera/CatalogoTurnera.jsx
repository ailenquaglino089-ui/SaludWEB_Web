// ============================================================
// PANTALLA: Catálogo público de profesionales (turnera)
// ============================================================
// Es la PRIMERA pantalla del flujo de reserva y es PÚBLICA: se puede ver sin
// iniciar sesión. Es a propósito. La agenda de un consultorio es información
// pública, y pedir un login para verla haría que alguien que solo estaba
// mirando cómo sacar un turno se vaya sin más.
//
// El recorrido que propone esta pantalla es el mismo del kiosco de un
// consultorio real:
//
//   1. Elegir ESPECIALIDAD (o buscarlos a todos)
//   2. Ver los MÉDICOS que atienden esa especialidad
//   3. Entrar a la AGENDA de uno y elegir día y hora
//
// La separación entre 1 y 2 tiene una razón técnica: son dos consultas
// distintas al backend. Filtrar por especialidad en el servidor (y no en el
// navegador) es lo que permite que el contador de "N profesionales" que se
// muestra en cada especialidad sea el número real, y no el de los que
// casualmente entraron en la página que se descargó.
// ============================================================

import React, { useState, useEffect, useCallback } from 'react';
// useState: estado local de los filtros y de la carga.
// useEffect: para sincronizar los filtros con la URL.
// useCallback: para no recrear la función de carga en cada render.

import { useNavigate } from 'react-router-dom';
// useNavigate: permite ir a la agenda de un médico sin recargar la página
// (Link sería lo ideal, pero acá hay que pasar estado, no solo una URL).

import { listarEspecialidades, listarMedicos, mensajeDeError } from '../../api/turnera';
// Importa SOLO las funciones de la API: este componente nunca ve URLs ni Axios.

import { useAuth } from '../../hooks/useAuth';
// useAuth: para saber si quien está mirando tiene sesión (y si su cuenta ya
// está vinculada a una ficha, que es lo que habilita reservar).

import { Cargando, Aviso, Vacio } from './PiezasTurnera';
// Piezas de interfaz compartidas por el módulo.

import './Turnera.css';
// Estilos del módulo de turnera.

const NOMBRES_DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
// Los nombres de los días se usan en la tarjeta de cada profesional para
// mostrarle al paciente qué días atiende, sin obligarlo a entrar a la agenda.
// El índice 0 es lunes porque así los numeran las tablas SQL (MySQL y PHP
// usan la convención de date('N', ...) donde 1 = lunes). Si se usara el
// domingo como primero, todos los días se mostrarían corridos una posición.

export default function CatalogoTurnera() {
  const navigate = useNavigate();
  // Sirve para navegar programáticamente (con lógica, no con un href estático).

  const { autenticado, usuario } = useAuth();
  // usuario.tipo_usuario y usuario.id_paciente se usan para decidir si el
  // botón dice "Reservar" o "Necesitás vincular tu ficha".

  // ---- Estado de los filtros ----
  const [especialidad, setEspecialidad] = useState('');
  // Especialidad elegida. Vacío = "todas". Guarda el NOMBRE exacto, no el id,
  // porque el endpoint de médicos filtra por nombre (medicos.especialidad es
  // texto, no una clave foránea) y porque es el nombre lo que el backend
  // devuelve ya normalizado.
  const [busqueda, setBusqueda] = useState('');
  // Texto de búsqueda por nombre o matrícula.

  // ---- Estado de los datos ----
  const [especialidades, setEspecialidades] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  // ==================================================================
  // Carga del catálogo de especialidades
  // ==================================================================
  // Se pide una sola vez al montar. Las especialidades casi nunca cambian
  // mientras alguien está recorriendo el catálogo, así que no tiene sentido
  // recargarlas con cada cambio de filtro.
  useEffect(() => {
    let cancelado = false;
    // Bandera para ignorar la respuesta si el componente se desmontó antes de
    // que llegara. Sin esto, en una conexión lenta se intentaba pintar sobre
    // un componente que ya no existe.

    async function cargar() {
      try {
        const datos = await listarEspecialidades();
        if (!cancelado) {
          setEspecialidades(datos);
        }
      } catch (err) {
        if (!cancelado) {
          setError(mensajeDeError(err, 'No se pudieron cargar las especialidades'));
        }
      }
    }

    cargar();
    return () => { cancelado = true; };
  }, []);
  // El arreglo vacío: solo al montar.

  // ==================================================================
  // Carga de los médicos, según los filtros actuales
  // ==================================================================
  const cargarMedicos = useCallback(async () => {
    setCargando(true);
    try {
      const datos = await listarMedicos({
        especialidad,
        q: busqueda.trim(),
        // activo: 1 es lo que hace que el catálogo sea usable. Un profesional
        // dado de baja no puede recibir turnos, así que ofrecerlo sería
        // llevar al paciente hasta una pantalla donde el reserva va a fallar.
        activo: 1,
      });
      setMedicos(datos);
      setError(null);
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudieron cargar los profesionales'));
      setMedicos([]);
      // Se vacía la lista: si falló la carga y se deja la anterior en
      // pantalla, el usuario ve profesionales que quizá ya no atienden y
      // no tiene forma de saber que son datos viejos.
    } finally {
      setCargando(false);
    }
  }, [especialidad, busqueda]);
  // useCallback con [especialidad, busqueda]: la función se rehace solo
  // cuando cambia un filtro, que es justo cuando hay que volver a consultar.

  useEffect(() => {
    // Cada cambio de filtro dispara una carga. El debounce de abajo evita
    // que se dispare una petición por cada tecla del buscador.
    const temporizador = setTimeout(cargarMedicos, 300);
    // 300 ms de espera: tiempo suficiente para que alguien termine de
    // escribir una palabra, sin que la respuesta se sienta lenta.

    return () => clearTimeout(temporizador);
    // Limpieza: si el usuario sigue escribiendo, se cancela el temporizador
    // anterior. Sin esto, "Fernández" dispararía 9 peticiones.
  }, [cargarMedicos]);

  // ==================================================================
  // Navegación a la agenda de un profesional
  // ==================================================================
  const verAgenda = (medico) => {
    // Se pasa el médico por el estado de navegación en vez de por la URL.
    // La razón: la URL queda limpia (/turnera/agenda/4) y, además, así se
    // puede llevar el objeto ya cargado para pintar el nombre de inmediato,
    // sin esperar a que la pantalla de agenda termine su propia consulta.
    navigate('/turnera/agenda/' + medico.id, { state: { medico } });
    // El 'state' de react-router NO viaja al recargar la página. Por eso la
    // agenda tiene que ser capaz de funcionar solo con el id de la URL, y
    // por eso más abajo se vuelve a consultar el catálogo como respaldo.
  };

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="turnera">
      <div className="turnera-header">
        <h1>🗓️ Sacar un turno</h1>
        <p>
          Elegí la especialidad y el profesional. Podés ver los horarios
          disponibles sin iniciar sesión; solo necesitás una cuenta para reservar.
        </p>
      </div>

      {/* Aviso si la cuenta existe pero no está vinculada a una ficha.
          Se explica acá y no solo en la pantalla de reserva porque es la
          duda más frecuente y es mejor avisar antes de que el paciente elija
          un horario y descubra al final que no puede reservarlo. */}
      {autenticado && usuario?.tipo_usuario === 'paciente' && !usuario?.id_paciente && (
        <Aviso
          tipo="info"
          texto="Tu cuenta todavía no está vinculada a una ficha de paciente. Podés ver la agenda, pero para reservar un turno vas a necesitar vincular tu DNI."
        />
      )}

      {/* ------------------------------------------------------------
          Filtros
          ------------------------------------------------------------ */}
      <div className="turnera-filtros">
        <div className="filtro-grupo">
          {/* htmlFor + id: el label apunta al select, así el clic en el texto
              enfoca el campo y un lector de pantalla anuncia "Especialidad" */}
          <label htmlFor="filtro-especialidad">Especialidad</label>
          <select
            id="filtro-especialidad"
            value={especialidad}
            onChange={(e) => setEspecialidad(e.target.value)}
          >
            {/* Opción "todas": valor vacío, que es lo que el backend
                interpreta como "sin filtro" */}
            <option value="">Todas las especialidades</option>
            {especialidades.map((esp) => (
              <option key={esp.id} value={esp.nombre}>
                {/* Se muestra cuántos profesionales atienden. El backend ya
                    trae ese dato (cantidad_medicos) y solo cuenta los
                    activos, así que el número es real y no una estimación. */}
                {esp.nombre} ({esp.cantidad_medicos})
              </option>
            ))}
          </select>
        </div>

        <div className="filtro-grupo">
          <label htmlFor="filtro-busqueda">Buscar profesional</label>
          <input
            id="filtro-busqueda"
            type="search"
            placeholder="Nombre o número de matrícula"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de estados de la carga: primero los errores, después el
          spinner, y solo si no hay nada que mostrar, el mensaje de vacío.
          El orden importa: si se comprobara el vacío primero, se vería
          "no hay profesionales" mientras todavía se están cargando. */}
      {error && <Aviso tipo="error" texto={error} />}

      {cargando ? (
        <Cargando texto="Buscando profesionales..." />
      ) : medicos.length === 0 ? (
        <Vacio
          icono="🔍"
          texto={
            especialidad || busqueda
              ? 'No encontramos profesionales con esos filtros. Probá con otra especialidad o quitá la búsqueda.'
              // El mensaje cambia según haya filtros o no: "no hay nada" y
              // "no hay nada que coincida" son problemas distintos y la
              // respuesta que sirve es otra.
              : 'Todavía no hay profesionales cargados en el sistema.'
          }
          textoBoton="Quitar filtros"
          alReintentar={() => {
            // Botón de rescate: limpiar los filtros es la acción que resuelve
            // el caso más común (un filtro que no arroja resultados).
            setEspecialidad('');
            setBusqueda('');
          }}
        />
      ) : (
        <>
          {/* Encabezado con la cantidad: confirma que los filtros se aplicaron
              y evita que el usuario piense que le faltan resultados */}
          <p className="actualizacion-info">
            {medicos.length} {medicos.length === 1 ? 'profesional disponible' : 'profesionales disponibles'}
          </p>

          <div className="turnera-grid">
            {medicos.map((medico) => (
              <div key={medico.id} className="medico-card">
                <h3>{medico.nombre}</h3>
                <p className="medico-especialidad">{medico.especialidad}</p>

                <ul className="medico-meta">
                  {/* La matrícula se muestra porque es un dato público de un
                      profesional habilitado para ejercer, y sirve para
                      verificar que se está reservando con quien cree. */}
                  <li>Matrícula: {medico.matricula}</li>
                </ul>

                <button
                  type="button"
                  className="btn-turnera btn-primario"
                  onClick={() => verAgenda(medico)}
                >
                  Ver horarios
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Aviso al pie para quien no tiene sesión: se ve después de elegir
          médico, que es cuando la persona ya decidió reservar y es el mejor
          momento para ofrecerle crear la cuenta. */}
      {!autenticado && (
        <Aviso
          tipo="info"
          texto="Para reservar un turno necesitás una cuenta. Podés crearla en un minuto desde la pantalla de registro."
        />
      )}
    </div>
  );
}

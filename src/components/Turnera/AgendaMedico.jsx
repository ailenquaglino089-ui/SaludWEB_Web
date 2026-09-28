// ============================================================
// PANTALLA: Agenda de un profesional (turnera)
// ============================================================
// Pública y sin sesión: muestra los próximos días con atención, los horarios
// libres de cada uno, y lleva a la pantalla de reserva.
//
// ES LA PANTALLA MÁS COMPLEJA DEL MÓDULO, Y POR TRES RAZONES CONCRETAS
// ---------------------------------------------------------------------
// 1. El calendario se construye a mano.
//    No se usa una librería como FullCalendar. El requisito es mostrar una
//    grilla simple de 7 días con los horarios disponibles, y una librería de
//    calendarios pesa cientos de kilobytes para resolver mucho más de lo que
//    hace falta acá. Además, los horarios disponibles no son un horario fijo:
//    vienen del backend y cambian por profesional, así que cualquier
//    calendario genérico necesitaría terminar adaptándose igual.
//
// 2. "Próximos días" no es "la semana".
//    Un consultorio no atiende los siete días, y algunos días atiende en
//    franjas distintas (por ejemplo, sábado por la mañana). La pantalla
//    arma la lista de días a partir de los días de atención reales
//    que devuelve el backend, y a partir de ahí calcula qué días mostrar.
//
// 3. La fecha se maneja en hora local, no en UTC.
//    Es la fuente de errores más clásica de este tipo de pantalla. Un
//    `new Date('2026-09-29')` en JavaScript se interpreta como UTC, y en
//   Argentina eso puede caer el día anterior. Por eso todas las conversiones
//    de fecha pasan por las funciones auxiliares del final del archivo, que
//    construyen las fechas con el constructor local (año, mes, día).
// ============================================================

import React, { useState, useEffect, useRef } from 'react';
// useState: filtros, días expandidos y la agenda cargada.
// useEffect: carga del profesional. No hace falta useCallback porque la
// función que se le pasa al polling es una flecha creada dentro del propio
// hook, así que no hay problema de identidad.

import { useParams, useNavigate, Link } from 'react-router-dom';
// useParams: id del profesional.
// useNavigate: ir a la pantalla de reserva sin recargar la página.
// Link: navegación de la SPA mediante enlaces.

import {
  listarMedicos,
  listarDisponibilidades,
  consultarDisponibilidad,
  mensajeDeError,
} from '../../api/turnera';
// Importa SOLO las funciones de la API.

import { usePolling, useSegundosDesde } from '../../hooks/usePolling';
// Hook propio: centraliza la lógica de consultar-periódicamente.
// useSegundosDesde: para el "Actualizado hace N s" del indicador.

import {
  Cargando,
  Aviso,
  Vacio,
  IndicadorActualizacion,
} from './PiezasTurnera';
// Piezas de interfaz compartidas por el módulo. Se usan las que YA existen
// (Vacio, no un "TurnoVacio" propio): duplicar la pieza de estado vacío haría
// que el catálogo y la agenda mostraran recuadros visualmente distintos para
// exactamente la misma situación.

import './Turnera.css';
// Estilos del módulo.

// Días de la semana en la grilla, en el orden en que se muestran.
const NOMBRES_DIAS = [
  'Lunes',
  'Martes',
  'Miércoles',
  'Jueves',
  'Viernes',
  'Sábado',
  'Domingo',
];

const NOMBRES_DIAS_CORTOS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
// Versión abreviada para los botones de la tira de días. Con los nombres
// completos los botones no entran en pantallas angostas y el texto se parte en
// dos líneas, que se lee como si fueran dos días distintos.

export default function AgendaMedico() {
  const { idMedico } = useParams();
  // Profesional pedido, como string desde la URL.

  const navigate = useNavigate();
  // Para saltar a la pantalla de reserva al elegir un horario.

  // ---- Filtros ----
  const [especialidad, setEspecialidad] = useState('');
  const [q, setQ] = useState('');
  // Búsqueda y filtro que se aplican al listado de profesionales, no a la
  // agenda. Sirven para el caso de llegar a una URL de profesional que no
  // existe: en vez de un error seco, se ofrece el catálogo completo.

  // ---- Datos del profesional ----
  const [medico, setMedico] = useState(null);
  const [diaAbierto, setDiaAbierto] = useState(null);
  // Día desplegado. Es UNO solo a propósito: mostrar los 7 días abiertos con
  // todos sus horarios produce un scroll interminable en móvil.

  const [diasAtencion, setDiasAtencion] = useState(null);
  // Días en que el profesional atiende. null = todavía no se consultó;
  // [] = consultado y no atiende ningún día.

  // ---- Mensajes ----
  const [error, setError] = useState(null);
  const [cargandoMedico, setCargandoMedico] = useState(true);
  // Este estado es APARTE del de disponibilidad, a propósito. Si compartieran
  // el mismo, la pantalla podría mostrar "no encontramos al profesional"
  // justo después de que la disponibilidad terminara de cargar, cuando en
  // realidad la búsqueda del profesional sigue en curso. Con dos estados
  // separados, cada bloque muestra su propio avance y no hay forma de que uno
  // pise al otro.

  // ==================================================================
  // Búsqueda del profesional
  // ==================================================================
  // Se consulta con activo=1 porque esta pantalla es de la turnera pública: un
  // profesional dado de baja no debe aparecer en el catálogo ni tener una
  // agenda reservable. El backend filtra por ese parámetro.
  useEffect(() => {
    let cancelado = false;

    async function buscarMedico() {
      try {
        // Las dos consultas van juntas con Promise.all porque son
        // independientes entre sí: la una trae los datos del profesional y la
        // otra los días que atiende. Encadenarlas con await una atrás de la
        // otra sumaría los tiempos de latencia de los dos servidores, que es
        // exactamente lo que Promise.all evita.
        //
        // Promise.all falla entera si una de las dos rechaza. Acá eso no
        // importa: sin los bloques de atención la grilla de días no se puede
        // armar, así que la pantalla ya no tiene sentido a medias. Se
        // prefiere un error claro a una pantalla con el nombre del profesional
        // y una grilla vacía sin explicación.
        const [medicos, bloques] = await Promise.all([
          listarMedicos({ activo: 1 }),
          listarDisponibilidades(idMedico),
        ]);
        // Se ignora el resto de filtros a propósito: si la persona llega por
        // una URL directa, filtrar por la especialidad que quedó en el estado
        // podría ocultar al profesional que realmente está pidiendo.

        if (cancelado) {
          return;
          // El componente se desarmó mientras la petición volaba (la persona
          // navegó a otro lado). Actualizar estado de un componente desmontado
          // no rompe nada hoy, pero en modo estricto de React es un error y
          // además puede pisar el estado de una pantalla nueva.
        }

        const encontrado = medicos.find((m) => m.id === Number(idMedico));
        setMedico(encontrado ?? null);

        // DÍAS DE ATENCIÓN: salen de los bloques publicados, no del médico.
        // ----------------------------------------------------------------
        // Antes esta línea leía encontrado.dias_atencion, un campo que el
        // backend nunca devuelve: no existe en ningún archivo. La consecuencia
        // era que el valor siempre daba undefined,Null, la grilla de días
        // quedaba vacía para siempre y la pantalla no llegaba a mostrar
        // ningún horario. No daba ningún error visible, solo una agenda
        // permanentemente en blanco.
        //
        // La fuente real son los bloques de /api/disponibilidades, que traen
        // dia_semana con la convención del backend: 1 = lunes ... 7 = domingo.
        // Un profesional con tres bloques publicados atiende tres días, y se
        // necesitan los tres para armar la fila de botones.
        const dias = unicos(bloques.map((b) => Number(b.dia_semana)))
          .filter((d) => d >= 1 && d <= 7)
          .sort((a, b) => a - b);
        // Se ordenan de lunes a domingo, no en el orden en que vinieron. El
        // repository puede devolverlos en cualquier orden y una fila de
        // botones que salta de miércoles a sábado se lee como un error de
        // la pantalla.

        setDiasAtencion(dias.length > 0 ? dias : []);
        // Lista vacía y no null cuando el profesional no publicó nada: ya se
        // consultó y la respuesta fue que no atiende. La pantalla distingue
        // los dos casos con mensajes distintos.
      } catch (err) {
        if (!cancelado) {
          setError(mensajeDeError(err, 'No se pudo cargar el profesional'));
        }
      } finally {
        if (!cancelado) {
          setCargandoMedico(false);
        }
      }
    }

    buscarMedico();
    return () => { cancelado = true; };
  }, [idMedico]);
  // Solo idMedico: los filtros de búsqueda son de esta pantalla, no una
  // dependencia de la carga del profesional.

  // ==================================================================
  // Disponibilidad
  // ==================================================================
  /*
  NO hace falta envolver la llamada de la API en una función propia: el hook
  puede recibir directamente la función de la API. En general sí conviene
  envolverla, pero acá el envoltorio solo agregaría un objeto con el mismo
  `dia` que la pantalla ya conoce por `diaAbierto`. Sería ruido.
  */

  const {
    datos: disponibilidad,
    cargando: cargandoDisponibilidad,
    error: errorDisponibilidad,
    refreshing,
    ultimaActualizacion,
    recargar,
  } = usePolling(
    () => consultarDisponibilidad(idMedico, diaAbierto),
    {
      clave: `disponibilidad-${idMedico}-${diaAbierto ?? 'ninguno'}`,
      activo: Boolean(diaAbierto),
    }
  );
  // activo en false hasta que se despliega un día: consultar sin día haría
  // que el backend responda con un error inútil.

  const segundos = useSegundosDesde(ultimaActualizacion);
  // Alimenta el texto "Actualizado hace N s". El hook corre su propio
  // intervalo de un segundo; al ser un dato cosmético no compensa compartirlo
  // con el ciclo del polling.

  /*
  La respuesta de disponibilidad trae los slots como ARRAY, y cada uno trae su
  propio `disponible` y su `motivo_bloqueo`. Eso permite mostrar también los
  horarios OCUPADOS, y no solo los libres.

  Mostrarlos es una decisión, no un descuido: si la franja de la mañana está
  completa, la persona ve que ese día está lleno en vez de pensar que la
  pantalla falló. Y no se filtra información de terceros, porque
  `motivo_bloqueo` es un texto genérico ("horario reservado") y nunca el
  nombre del otro paciente.
  */
  const slots = disponibilidad?.slots ?? [];
  const haySlots = slots.length > 0;
  const hayLibres = slots.some((s) => s.disponible);

  /*
  CÓMO SE DECIDE SI EL PROFESIONAL ATIENDE ESE DÍA
  -----------------------------------------------
  La versión anterior tomaba la respuesta del backend tal cual:

      const atiendeEseDia = disponibilidad?.atenie_ese_dia;

  y usaba ese booleano como Condition para decidir si se dibujaba la grilla. En
  la prueba real con navegador, el backend respondía con los 8 horarios del día
  (total_slots: 8, slots con 8 elementos) y, al mismo tiempo, ese booleano
  llegaba sin valor utilizable. Resultado en pantalla: "Este profesional no
  atiende ese día" y cero botones de horario, con los 8 horarios disponibles en
  la respuesta.

  Eso es la peor forma de fallar: el backend está bien y la pantalla miente.

  Por eso la decisión no se toma de un único campo. Se deriva de los datos que
  sí están: si hay slots, hay horarios que mostrar, y punto. Los otros dos
  campos solo sirven para distinguir los dos motivos por los que una grilla
  puede estar vacía, que son mensajes distintos para quien la está mirando.

  Con tres estados explícitos, en vez de un booleano y un condicional anidado,
  no queda ningún caso sin cubrir: ni un día de atención que se muestra vacío,
  ni un día sin atención que muestra una grilla en blanco.
  */
  const bloques = disponibilidad?.bloques ?? [];
  const totalSlots = Number(disponibilidad?.total_slots ?? 0);
  // Number() porque el backend puede devolver el número como texto según cómo
  // lo entregue la base, y "8" > 0 es false en JavaScript: comparar texto con
  // número da false siempre.

  const atiendeEseDia =
    haySlots ||
    bloques.length > 0 ||
    totalSlots > 0 ||
    disponibilidad?.atenie_ese_dia === true;
  // La comparación es === true y no un truthy a secas. La razón es que el
  // campo llegó como valor ausente en la prueba, y con truthy cualquier valor
  // raro (una cadena, un 0) se tomaría por un "sí". Comparar contra el
  // booleano exacto hace que un dato inesperado no invente atención.

  // ==================================================================
  // Días a mostrar
  // ==================================================================
  const dias = construirDias(diasAtencion, 7);
  // Los próximos 7 días que el profesional atiende, ya filtrados por los días
  // de atención reales. Si todavía no se consultationó, devuelve una lista
  // vacía y no se muestra ninguna grilla: es preferible un instante de
  // pantalla vacía a una grilla de días tachados que después se corrigen.

  // ==================================================================
  // Handlers
  // ==================================================================
  /** Despliega los horarios de un día, o lo repliega si ya estaba abierto. */
  const alternarDia = (iso) => {
    setDiaAbierto((actual) => (actual === iso ? null : iso));
    // Forma funcional del setState: usa el valor anterior y así no depende de
    // que diaAbierto esté actualizado al momento del clic. Con la forma
    // directa haría falta leer diaAbierto dos veces.
  };

  // ==================================================================
  // Apertura automática del primer día
  // ==================================================================
  /*
  POR QUÉ SE ABRE EL PRIMER DÍA SOLO
  ----------------------------------
  diaAbierto arranca en null y, sin esto, la pantalla llegaba mostrando una fila
  de siete botones de día y nada más. Los horarios aparecían recién después de
  que la persona adivinara que tenía que tocar uno.

  No es un detalle menor de interlocking: es la diferencia entre una pantalla
  que informa y una que parece rota. En la prueba real con navegador, la
  agenda renderizaba exactamente esto: "Dr(a). Lucía Fernández / Lunes 28 /
  Martes 29 / Miércoles 30 / ... / Volver al catálogo". Siete fechas, cero
  horarios y ninguna indicación de que faltaba un clic. La lectura razonable
  de esa pantalla es que el profesional no tiene turnos disponibles.

  En un sistema de turnera, cargar la agenda de un profesional y no mostrar
  ningún horario es un problema: la persona viene a ver si hay lugar, y la
  respuesta "no hay lugar" y la respuesta "no te estoy mostrando nada" se
  ven iguales. Con el primer día abierto, la pantalla responde la pregunta
  apenas carga.

  EL POR QUÉ DEL REF, Y NO DE LAS DEPENDENCIAS
  ------------------------------------------
  El efecto depende solo de diasAtencion, a propósito. La alternativa
  natural sería incluir diaAbierto en las dependencias para "asegurarse" de
  estar al día, y eso rompe el repliegue manual: al cerrar un día con un clic,
  diaAbierto pasa a null, el efecto vuelve a correr y reabre el mismo día. El
  menú quedaría pegado abierto, sin importar cuántas veces se intente cerrar.

  El ref guarda con qué lista de días ya se hizo la apertura automática. Si
  llega la misma lista otra vez, no se repite. Cuando cambia el profesional
  (llega una lista nueva), sí se abre de nuevo, que es lo correcto.
  */
  const aperturasHechasRef = useRef(null);
  // useRef y no useState: guardar un contador o una marca en el estado provocaría
  // un render extra que no cambia nada en pantalla.

  useEffect(() => {
    if (aperturasHechasRef.current === diasAtencion) {
      return;
      // Ya se abrió automáticamente para esta misma lista de días.
    }
    aperturasHechasRef.current = diasAtencion;

    if (!diasAtencion || diasAtencion.length === 0) {
      return;
      // Todavía no se consultó, o el profesional no atiende ningún día. En los
      // dos casos no hay un primer día que abrir.
    }

    const [primero] = construirDias(diasAtencion, 1);
    if (primero) {
      setDiaAbierto(primero.fecha);
    }
  }, [diasAtencion]);
  // Solo diasAtencion. Ver la explicación del ref arriba sobre por qué
  // diaAbierto NO entra en las dependencias.

  /** Va a la pantalla de reserva con el horario elegido. */
  const reservar = (hora) => {
    // La fecha y la hora viajan por la query string en vez de por el estado de
    // React. Es lo que permite que la persona comparta el enlace o recargue la
    // página sin perder la elección: con estado en memoria, un F5 volvería al
    // inicio y perdería todo lo elegido.
    navigate(
      `/turnera/agenda/${idMedico}/reservar?fecha=${encodeURIComponent(diaAbierto)}&hora=${encodeURIComponent(hora)}`
    );
    // navigate y no window.location: la segunda opción dispara una carga
    // completa de la página desde el servidor, recarga los bundles de Vite y
    // descarta todo el estado de la aplicación. Sería la versión web de la
    // turnera desktop funcionando dentro de un iframe.
    // encodeURIComponent por costumbre: hoy los valores vienen del backend y no
    // podrían inyectar caracteres, pero depende de una garantía externa. La
    // codificación cuesta nada y no depende de que esa garantía siga valiendo.
  };

  // ==================================================================
  // Pantalla de carga del profesional
  // ==================================================================
  if (cargandoMedico) {
    return (
      <div className="turnera">
        <Cargando texto="Buscando el profesional..." />
      </div>
    );
  }

  // ==================================================================
  // Profesional no encontrado
  // ==================================================================
  if (!medico) {
    // Es la respuesta a "la URL no corresponde a nadie". No se muestra un
    // error vacío: se ofrece el catálogo, que es la acción útil.
    return (
      <div className="turnera">
        <div className="turnera-header">
          <h1>No encontramos ese profesional</h1>
        </div>

        {error ? (
          <Aviso tipo="error" texto={error} />
        ) : (
          <Vacio
            texto="El link puede estar viejo o el profesional ya no atiende en este consultorio."
            icono="🔎"
          />
        )}
        {/* Sin botón de reintento: el problema no es un fallo de red que se
            arregle reintentando, sino que el id de la URL no corresponde a
            nadie. El botón de reintento aparecería ofreciendo una solución que
            no existe. El enlace al catálogo de abajo sí es la acción útil. */}

        <div className="turnera-filtros">
          <Link to="/turnera" className="btn-turnera btn-primario">
            Ir al catálogo
          </Link>
        </div>
      </div>
    );
  }

  // ==================================================================
  // Agenda
  // ==================================================================
  return (
    <div className="turnera">
      <div className="turnera-header">
        <div>
          <h1>Dr(a). {medico.nombre}</h1>
          {medico.especialidad_nombre && (
            <p className="turnera-subtitulo">
              {medico.especialidad_nombre}
            </p>
          )}
        </div>

        {/* Indicador discreto de que los horarios se refrescan solos, con un
            botón "Actualizar ahora" para quien prefiera no esperar. Ese botón
            no es un adorno: sin él, quien acaba de recibir un aviso de que se
            liberó un horario tiene que esperar hasta el próximo ciclo. */}
        <IndicadorActualizacion
          ultimaActualizacion={ultimaActualizacion}
          alActualizar={recargar}
          segundos={segundos}
          refrescando={refreshing}
        />
      </div>

      {/* Filtros solo visibles si se llegó por una URL inválida. En el camino
          normal llegan desde el catálogo y ya vienen aplicados, así que
          mostrarlos sería ruido. */}
      {(q || especialidad) && (
        <div className="turnera-filtros">
          <span className="medico-meta">
            Filtros activos: {[q, especialidad].filter(Boolean).join(' / ')}
          </span>
          <Link
            to={`/turnera/agenda/${idMedico}`}
            className="btn-turnera btn-secundario"
          >
            Quitar filtros
          </Link>
        </div>
      )}

      {error && <Aviso tipo="error" texto={error} />}

      {/* Tira de días. Se muestra incluso si no hay más de uno, porque es la
          línea de tiempo de la pantalla y sin ella no se entiende qué se está
          mirando. */}
      <div className="dias-selector" role="group" aria-label="Días disponibles">
        {dias.length === 0 ? (
          <p className="sin-dias">
            Este profesional no tiene días de atención cargados.
          </p>
        ) : (
          dias.map((dia) => (
            <button
              key={dia.fecha}
              type="button"
              className={`dia-btn ${diaAbierto === dia.fecha ? 'elegido' : ''}`}
              onClick={() => alternarDia(dia.fecha)}
              aria-pressed={diaAbierto === dia.fecha}
              // aria-pressed comunica a un lector de pantalla que el botón es
              // un interruptor y que ahora está activado. Sin esto, "tachado" y
              // "sin tachar" son visualmente iguales para quien no ve.
            >
              {dia.nombre}
              {/* El número va aparte y con menos peso visual: el nombre del día
                  es la información principal y el número es el complemento. */}
              <span className="dia-numero">{dia.diaDelMes}</span>
            </button>
          ))
        )}
      </div>

      {/* Franja de horarios del día desplegado */}
      {diaAbierto && (
        <div className="agenda-dia">
          <h2 className="agenda-dia-titulo">
            {formatearDiaLargo(diaAbierto)}
          </h2>

          {cargandoDisponibilidad && !disponibilidad && (
            <Cargando texto="Buscando horarios..." />
          )}
          {/* Con la misma condición que en MisTurnos: solo mientras no hay
              datos. Si no, cada refresco del polling taparía la lista. */}

          {errorDisponibilidad && (
            <Aviso tipo="error" texto={errorDisponibilidad} />
          )}

          {disponibilidad && !cargandoDisponibilidad && (
            <>
              {!atiendeEseDia && (
                <p className="sin-horarios">Este profesional no atiende ese día.</p>
              )}

              {atiendeEseDia && !haySlots && (
                <Vacio
                  texto="No hay horarios cargados para este día."
                  textoBoton="Actualizar"
                  alReintentar={recargar}
                  icono="🗓"
                />
                // Botón de reintentar incluido: acá el problema puede ser de
                // red, y recargar es una solución real. En el caso "no
                // encontramos al profesional" de arriba, en cambio, reintentar
                // no habría servido de nada.
              )}

              {atiendeEseDia && haySlots && (
                <>
                  <p className="turnera-subtitulo">
                    {disponibilidad.total_disponibles ?? hayLibres} de{' '}
                    {disponibilidad.total_slots ?? slots.length} horarios libres
                  </p>

                  {/*
                  <ul> con la clase de grilla que ya usa el catálogo, y cada
                  <li> contiene el <button class="slot">.

                  La lista semántica y la grilla visual se combinan sin
                  conflicto: el <ul> comunica que son horarios del mismo tipo,
                  y el CSS pone la grilla sobre el <ul> con list-style:none.
                  Poner la grilla sobre los <li> y el <button> sin contenedor
                  obligaría a sacrificar uno de los dos.
                  */}
                  <ul className="slots-grid">
                    {slots.map((slot) => (
                      <li key={slot.hora}>
                        {slot.disponible ? (
                          <button
                            type="button"
                            className="slot"
                            onClick={() => reservar(slot.hora)}
                          >
                            {slot.hora}
                            <span className="sr-only">, libre. Reservar este horario</span>
                            {/* Texto solo para lectores de pantalla: el color
                                verde del botón es la única señal visual de que
                                está disponible, y el color no se anuncia. */}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="slot slot-ocupado"
                            disabled
                            title={slot.motivo_bloqueo || 'Horario no disponible'}
                          >
                            {slot.hora}
                            <span className="slot-ocupado-marca">
                              {slot.motivo_bloqueo || 'Ocupado'}
                            </span>
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* Enlace de vuelta al catálogo, siempre presente: es la salida natural
          si el profesional no tiene días libres. */}
      <div className="turnera-filtros">
        <Link to="/turnera" className="btn-turnera btn-secundario">
          Volver al catálogo
        </Link>
      </div>
    </div>
  );
}

// ============================================================
// FUNCIONES AUXILIARES
// ============================================================
/*
Estas tres funciones viven fuera del componente a propósito, y por dos razones
concretas:

1. Son puras. No tocan el estado ni el DOM, así que se pueden probar solas.
2. No se recrean en cada render. Si estuvieran definidas dentro del
   componente, su referencia cambiaría en cada render y cualquier useEffect
   que dependiera de ellas se ejecutaría en bucle.
*/

// ============================================================
// FUNCIONES DE FECHA
// ============================================================
/*
El módulo entero depende de que estas conversiones sean correctas, así que van
en un bloque propio y con comentario. El error clásico de fechas en JavaScript
ocurre porque el constructor con un solo argumento de texto interpreta la
cadena como UTC:

    new Date('2026-09-29')  →  2026-09-29T00:00:00Z

En Argentina (UTC-3) eso es 2026-09-28 a las 21:00, o sea el día ANTERIOR. Con
ese error, un horario del martes se mostraría como del lunes y la reserva
fallaría con un mensaje de "fecha inválida" incomprensible.

La solución es no usar nunca el constructor de texto: se pasan los tres
números sueltos (año, mes, día), que sí se interpretan en hora local.
*/

/** Devuelve la fecha de hoy en formato ISO YYYY-MM-DD, en hora local. */
function aFechaISO(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  // El mes se suma 1 porque en JavaScript los meses van de 0 a 11. El padStart
  // con dos dígitos evita que en enero o marzo aparezca "2026-1-05" en vez de
  // "2026-01-05", que es lo que espera el backend.
  return `${y}-${m}-${d}`;
}

/** Convierte el día de la semana de Date al 1..7 que usa el backend. */
function aDiaDeSemana(dia) {
  // Date usa 0=domingo..6=sábado y el backend usa 1=lunes..7=domingo.
  return dia === 0 ? 7 : dia;
}

/** Deja solo los valores únicos de una lista, sin depender del orden. */
function unicos(lista) {
  return [...new Set(lista)];
  // Se usa un Set y no un filter con includes: este último recorre la lista
  // que ya se recorrió por cada elemento, o sea O(n²). Con una agenda que son
  // unos pocos días no se nota, pero el helper queda en el mismo archivo que
  // otras funciones pensadas para(listar) cualquier cantidad de datos.
}

/** Construye la lista de próximos días con atención. */
function construirDias(diasAtencion, cantidad) {
  if (!diasAtencion) {
    return [];
    // Sin días de atención conocidos todavía: lista vacía. La pantalla
    // muestra el mensaje de carga en vez de una grilla que después se
    // corrige.
  }

  if (diasAtencion.length === 0) {
    return [];
    // El profesional no atiende ningún día. Es distinto de "todavía no se
    // consultó": acá ya se sabe la respuesta y no hay nada que esperar. Sin
    // esta salida, el bucle recorrería su tope entero y devolvería una lista
    // vacía igual, pero después de 49 iteraciones en cada render.
  }

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  // Se lleva el reloj a medianoche para comparar solo fechas. Si no, la
  // comparación de días incluiría la hora actual y un día que "es hoy" podría
  // no coincidir por un detalle de minutos.

  const resultado = [];

  // Tope de búsqueda: 7 días reales por cada día con atención que se quiere
  // mostrar.
  //
  // El cálculo parte de una pregunta: ¿cuántos días reales hay que mirar para
  // encontrar `cantidad` días con atención? En el peor caso, el profesional
  // atiende un solo día por semana, y ese día puede ser el último de los siete
  // que se miran. Ahí hacen falta `cantidad` semanas completas, o sea
  // `cantidad * 7` días reales.
  //
  // Con el tope fijo de 14 que se usaba antes, un profesional que atiende solo
  // los sábados devolvía 2 días de atención en lugar de los 7 que la pantalla
  // promete. No era un error visible: se veían dos botones de día y la persona
  // asumía que no había más. La grilla se completaba sola, pero nunca llegaba
  // a la cantidad anunciada.
  const tope = cantidad * 7;

  for (let i = 0; i < tope && resultado.length < cantidad; i += 1) {
    // El tope también cumple la otra función: si el profesional no atiende
    // ningún día, el bucle termina solo y no queda ninguna chance de un bucle
    // infinito.

    const dia = new Date(hoy);
    dia.setDate(hoy.getDate() + i);
    // Se copia el día de hoy antes de sumar, porque setDate modifica el objeto
    // sobre el que se llama. Si se hiciera sobre `hoy` directamente, todos los
    // días saldrían iguales.

    const diaSemana = aDiaDeSemana(dia.getDay());

    if (diasAtencion.includes(diaSemana)) {
      resultado.push({
        fecha: aFechaISO(dia),
        nombre: NOMBRES_DIAS[diaSemana - 1],
        // El índice -1 porque aDiaDeSemana() devuelve 1..7 y los arrays de
        // JavaScript se indexan desde 0.
        diaDelMes: dia.getDate(),
      });
    }
  }

  return resultado;
}

/** Convierte '2026-09-29' en 'martes 29 de septiembre'. */
function formatearDiaLargo(iso) {
  // Se parte el texto en vez de usar new Date(iso) por el problema de UTC
  // descrito arriba: acá solo se lee el texto, no se convierte a marca de
  // tiempo, así que no hay riesgo.

  const [anio, mes, dia] = iso.split('-').map(Number);
  // mes viene 1-based de split, que es justo lo que quiere getMonth.
  const fecha = new Date(anio, mes - 1, dia);

  return `${NOMBRES_DIAS[aDiaDeSemana(fecha.getDay()) - 1].toLowerCase()} ${dia} de ${NOMBRE_MES[mes - 1]}`;
}

const NOMBRE_MES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
// Nombre de los meses en español, en minúscula para poder escribir
// "29 de septiembre" sin que la capitalización se vea forzada.

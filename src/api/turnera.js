// ============================================================
// MÓDULO DE API: TURNERA
// ============================================================
// Este archivo aisla TODAS las llamadas HTTP del módulo de turnera.
//
// ¿Por qué un archivo aparte y no hacer las llamadas desde los componentes?
// Porque las rutas de la API y, sobre todo, la FORMA de las respuestas están
// concentradas en un único lugar. Si el backend cambia la forma de una
// respuesta (por ejemplo, si mañana un listado deja de venir paginado y pasa
// a devolver un array plano), hay que tocar UN archivo, no veinte
// componentes. Además permite ver de un vistazo todo lo que la web le pide
// al backend, que es exactamente lo que se revisa en un parcial.
//
// ────────────────────────────────────────────────────────────
// FORMAS REALES DE LAS RESPUESTAS (verificadas contra la API)
// ────────────────────────────────────────────────────────────
// Todas las respuestas del backend envuelven el resultado en
// { ok, mensaje, data }. Hay dos variantes de `data` que conviene
// distinguir porque son la causa habitual de "undefined is not iterable":
//
//   • LISTADOS PAGINADOS  →  data = { items: [...], total, pagina,
//                               por_pagina, total_paginas }
//     Los usan: /api/medicos, /api/citas y /api/notificaciones.
//
//   • LISTADOS SIMPLES o un objeto suelto  →  data = [...]  o  data = { ... }
//     Los usan: /api/especialidades, /api/disponibilidades,
//     /api/citas/disponibilidad, /api/estadisticas, /api/auth/me.
//
// Por eso todas las funciones devuelven YA la forma normalizada (un array o
// un objeto limpio) y los componentes nunca tocan .data.data. Así el
// componente no necesita saber si un endpoint viene paginado o no.
// ============================================================

import client from './client';
// Importa la instancia de Axios configurada. A través de ella heredamos
// automáticamente: el header Authorization con el token JWT (interceptor de
// petición) y la limpieza de sesión ante un 401 (interceptor de respuesta).

// ============================================================
// UTILIDADES INTERNAS
// ============================================================

/**
 * Desenvuelve la respuesta de la API y normaliza los listados paginados.
 *
 * La API responde { ok, mensaje, data }. Para el resto de la aplicación
 * solo interesa `data`, así que se desenvuelve acá. Además, cuando `data`
 * viene con la forma paginada ({ items: [...] }) se devuelve
 * directamente el arreglo de items, para que el consumidor pueda usar
 * .map() sin tener que preguntar primero por la forma.
 *
 * @param {object} response Respuesta completa de Axios.
 * @returns {Array|object} Los items del listado, o el objeto suelto.
 */
function desenvolver(response) {
  const data = response?.data?.data;
  // Se toma el campo "data" de la respuesta. El ?. encadenado evita que
  // una respuesta mal formada (por ejemplo un 500 con HTML en vez de JSON)
  // rompa la aplicación con un error de lectura de propiedad de undefined.

  // Si la API devolvió un listado paginado, se devuelve el arreglo de items.
  if (data && !Array.isArray(data) && Array.isArray(data.items)) {
    return data.items;
    // Se reconoce la forma paginada por tener un arreglo en .items
  }

  return data;
  // En cualquier otro caso (array plano u objeto único) se devuelve tal cual.
}

/**
 * Traduce un error de la API a un mensaje entendible para mostrar en pantalla.
 *
 * El backend responde { ok: false, mensaje: "..." }. Se recorre la respuesta
 * buscando el mensaje y, si no aparece en ningún nivel conocido, se devuelve
 * un texto genérico. Nunca se devuelve undefined: un error sin mensaje en la
 * interfaz hace que el usuario piense que la aplicación se rompió.
 *
 * @param {object} error Error capturado en el catch de una promesa.
 * @param {string} porDefecto Mensaje a usar si la API no trae ninguno claro.
 * @returns {string} Mensaje listo para mostrar.
 */
export function mensajeDeError(error, porDefecto = 'Ocurrió un error inesperado') {
  const datos = error?.response?.data;
  // response.data es el cuerpo de la respuesta fallida. Puede ser undefined
  // si la petición ni siquiera llegó al servidor (error de red o CORS).

  return (
    datos?.mensaje ||
    datos?.error ||
    datos?.errores?.[0]?.mensaje ||
    // La API también puede mandar una lista de errores de validación
    error?.message ||
    porDefecto
  );
  // El orden importa: primero se busca el mensaje específico del backend
  // ("El horario ya fue tomado") antes que el genérico de Axios
  // ("Request failed with status code 409"), que no le dice nada al usuario.
}

// ============================================================
// CATÁLOGOS PÚBLICOS
// Se consultan sin iniciar sesión: son datos de catálogo, no datos clínicos.
// ============================================================

/**
 * Obtiene el listado de especialidades con cuántos médicos atienden en cada una.
 * @returns {Promise<Array>} [{ id, nombre, activo, cantidad_medicos }]
 */
export async function listarEspecialidades() {
  const response = await client.get('/api/especialidades');
  return desenvolver(response) ?? [];
  // ?? [] evita que un null inesperado haga fallar el .map() del componente.
  // Cada elemento trae 'cantidad_medicos', que la web usa para no ofrecer
  // una especialidad sin profesionales disponibles.
}

/**
 * Obtiene el catálogo de médicos.
 *
 * @param {object} filtros Filtros opcionales.
 * @param {string} filtros.especialidad Filtra por especialidad (coincidencia exacta).
 * @param {string} filtros.q Búsqueda por nombre o matrícula.
 * @param {number} filtros.porPagina Cantidad por página (por defecto 50, para el catálogo).
 * @returns {Promise<Array>} [{ id, nombre, matricula, especialidad, activo }]
 */
export async function listarMedicos(filtros = {}) {
  const params = {};
  // Se arma el objeto de parámetros en vez de concatenar el string a mano:
  // Axios se encarga de codificar los caracteres especiales del nombre.

  if (filtros.especialidad) {
    params.especialidad = filtros.especialidad;
  }
  // Solo se manda el parámetro si el filtro realmente se está usando,
  // para no ensuciar la URL con valores vacíos.

  if (filtros.q) {
    params.q = filtros.q;
  }

  if (filtros.activo !== undefined && filtros.activo !== null && filtros.activo !== '') {
    params.activo = filtros.activo ? 1 : 0;
  }
  // La turnera pública tiene que pedir SÍ O SÍ los profesionales activos, así
  // que el parámetro se reenvía explícitamente. La comprobación previa evita
  // mandar un activo vacío si el valor nunca fue asignado, y el ? 1 : 0
  // convierte el booleano de JavaScript al 1 o 0 que el backend espera.

  params.por_pagina = filtros.porPagina ?? 50;
  // 50 por página: el catálogo de un consultorio tiene pocos profesionales y
  // con la paginación por defecto de 10 había que paginar para verlos a todos.

  const response = await client.get('/api/medicos', { params });
  return desenvolver(response) ?? [];
}

/**
 * Trae los bloques de atención publicados por un profesional.
 *
 * ES UNA LLAMADA DISTINTA A consultarDisponibilidad, y la diferencia es
 * importante:
 *
 *   - /api/disponibilidades devuelve QUÉ DÍAS ATIENDE el profesional: los bloques
 *     horarios que publicó, uno por día de la semana. No dice si un turno está
 *     libre, solo que ese día existe atención.
 *   - /api/citas/disponibilidad?id_medico&fecha devuelve los HORARIOS DE UN DÍA
 *     CONCRETO y dice cuáles están libres y cuáles ya se tomaron.
 *
 * Son dos preguntas distintas y por eso dos endpoints. La pantalla de agenda
 * necesita las dos: la primera para armar la fila de botones de días, la
 * segunda para pintar los horarios del día que se desplegó.
 *
 * @param {number} idMedico Id del profesional.
 * @returns {Promise<Array>} [{ id, dia_semana, hora_inicio, hora_fin,
 *                              duracion_minutos, activo }]
 */
export async function listarDisponibilidades(idMedico) {
  const response = await client.get('/api/disponibilidades', {
    params: { id_medico: idMedico },
  });
  return desenvolver(response) ?? [];
  // El ?? [] porque un profesional que no publicó nada devuelve una lista vacía,
  // y la agenda tiene que poder distinguir "no atiende ningún día" de "todavía
  // no se consultó": esos dos casos se representan con [] y con null.
}

/**
 * Consulta los turnos concretos de un profesional en una fecha.
 *
 * ES PÚBLICA a propósito: el paciente tiene que ver los horarios ANTES de
 * comprometerse a reservar. Que exigiera login haría perder a quien solo
 * está consultando.
 *
 * Importante: esta respuesta nunca incluye datos de terceros. Si un horario
 * está tomado, el backend solo dice `disponible: false` con un
 * `motivo_bloqueo`, jamás el nombre del paciente ni el motivo de su consulta.
 *
 * @param {number} idMedico Id del profesional.
 * @param {string} fecha Fecha en formato YYYY-MM-DD.
 * @returns {Promise<object>} {
 *   id_medico, nombre_medico, especialidad, matricula, fecha, dia_semana,
 *   bloques: [...], slots: [{ hora, hora_fin, disponible, motivo_bloqueo, id_cita }],
 *   total_slots, total_disponibles, atiende_ese_dia
 * }
 */
export async function consultarDisponibilidad(idMedico, fecha) {
  const response = await client.get('/api/citas/disponibilidad', {
    params: { id_medico: idMedico, fecha },
  });
  // fecha va como parámetro, no interpolada en el string de la URL, para que
  // Axios la codifique correctamente y el backend la valide.
  return desenvolver(response);
}

// ============================================================
// ACCIONES DEL USUARIO AUTENTICADO
// ============================================================

/**
 * Reserva un turno.
 *
 * El `id_paciente` se manda SOLO si quien reserva no es un paciente.
 *
 * La razón es una regla de seguridad del backend: si el rol es 'paciente', el
 * servicio IMPONE el id de paciente que viene del token e ignora el del
 * cuerpo de la petición. Mandarlo igualmente no rompe nada (se descarta), pero
 * mucho peor sería permitir que se respetara, porque cualquiera podría
 * entonces reservar en nombre de otra persona manipulando la petición desde
 * el navegador.
 *
 * En cambio, un médico o un admin SÍ deben indicar de quién es el turno: el
 * backend exige que el cuerpo traiga `id_paciente` y no tiene de dónde sacarlo
 * solo, porque está reservando en nombre de otra persona.
 *
 * @param {object} datos Datos del turno.
 * @param {number} datos.idMedico Profesional elegido.
 * @param {string} datos.fecha Fecha YYYY-MM-DD.
 * @param {string} datos.hora Hora del slot elegido (HH:MM).
 * @param {string} [datos.motivo] Motivo de la consulta (opcional, máx. 255).
 * @param {string} [datos.notas] Notas internas para el consultorio (opcional).
 * @param {number} [datos.idPaciente] Paciente para el que se reserva.
 *        OBLIGATORIO si quien reserva es médico o admin; se omite si es un
 *        paciente (el backend lo deduce del token).
 * @returns {Promise<object>} La cita creada.
 * @throws {Error} Con mensaje de la API si el horario fue tomado (409).
 */
export async function reservarTurno({ idMedico, fecha, hora, motivo, notas, idPaciente }) {
  const cuerpo = {
    id_medico: idMedico,
    fecha,
    hora,
    motivo: motivo ?? null,
    // null en vez de '' porque el backend hace trim() y un string vacío
    // llegaría como dato en lugar de "no informado".
    notas: notas ?? null,
  };

  if (idPaciente) {
    cuerpo.id_paciente = Number(idPaciente);
    // Se agrega el id solo cuando corresponde. En snake_case porque así lo
    // espera la API, y con Number() porque el <select> devuelve un string y el
    // backend lo castearía a 0 silenciosamente (y "0" no es un id válido).
  }

  const response = await client.post('/api/citas', cuerpo);
  return desenvolver(response);
}

/**
 * Lista los pacientes del estudio.
 * Se usa en la pantalla de reserva para que un médico o un admin elijan de quién
 * es el turno, ya que en su caso el paciente no se deduce del token.
 *
 * @returns {Promise<Array>} [{ id, nombre, dni }]
 */
export async function listarPacientes() {
  const response = await client.get('/api/pacientes', {
    params: { por_pagina: 100 },
  });
  // 100 por página: es un selector de apoyo, no un listado para recorrer, así
  // que alcanza con que entren los pacientes del estudio en una sola consulta.
  return desenvolver(response) ?? [];
}

/**
 * Lista turnos. El alcance lo decide el backend según el rol, no la web:
 * un paciente solo puede ver los suyos porque el servicio los filtra con el
 * token, aunque la web pidiera la agenda completa.
 *
 * @param {object} filtros Filtros opcionales.
 * @param {string} [filtros.estado] Filtra por estado (pendiente, confirmada...).
 * @param {string} [filtros.desde] Fecha inicial YYYY-MM-DD.
 * @param {string} [filtros.hasta] Fecha final YYYY-MM-DD.
 * @param {boolean} [filtros.mias] Fuerza el filtro "mis turnos" (útil para el paciente).
 * @param {number} [filtros.pagina] Número de página.
 * @returns {Promise<Array>} Los turnos del usuario.
 */
export async function listarTurnos(filtros = {}) {
  const params = {};

  if (filtros.estado) {
    params.estado = filtros.estado;
  }
  if (filtros.desde) {
    params.desde = filtros.desde;
  }
  if (filtros.hasta) {
    params.hasta = filtros.hasta;
  }
  if (filtros.mias) {
    params.mias = '1';
    // '1' y no true: el backend lo lee con isset($_GET['mias']), y enviar
    // el booleano true lo serializaría como "true", que también funciona,
    // pero el '1' es explícito y coincide con lo que espera el endpoint.
  }
  params.por_pagina = filtros.porPagina ?? 50;

  const response = await client.get('/api/citas', { params });
  return desenvolver(response) ?? [];
}

/**
 * Cancela un turno y libera el horario para que otro pueda tomarlo.
 *
 * Tiene endpoint propio y no solo un PATCH de estado porque es la acción más
 * frecuente de la autogestión: merece un botón claro y un mensaje de
 * confirmación, no una llamada genérica de actualización.
 *
 * @param {number} idCita Id del turno.
 * @returns {Promise<object>} El turno ya en estado 'cancelada'.
 */
export async function cancelarTurno(idCita) {
  const response = await client.post(`/api/citas/${idCita}/cancelar`);
  return desenvolver(response);
}

/**
 * Cambia el estado de un turno (confirmar, completar, marcar ausente...).
 * Qué estados puede aplicar cada rol lo valida el backend, no esta función.
 *
 * @param {number} idCita Id del turno.
 * @param {string} estado Nuevo estado.
 * @returns {Promise<object>} El turno con el estado actualizado.
 */
export async function cambiarEstadoTurno(idCita, estado) {
  const response = await client.patch(`/api/citas/${idCita}/estado`, { estado });
  return desenvolver(response);
}

/**
 * Confirma la asistencia a un turno.
 *
 * Es un envoltorio de `cambiarEstadoTurno` y no una función nueva contra otro
 * endpoint, porque el backend no tiene un endpoint de "confirmar": confirmar es
 * simplemente cambiar el estado a 'confirmada'. El envoltorio existe para que el
 * componente diga `confirmarTurno(turno.id)` en vez de
 * `cambiarEstadoTurno(turno.id, 'confirmada')`.
 *
 * A cambio, vale la pena el indirección porque el string del estado queda en
 * UN solo lugar. Si mañana el backend renombra el estado, hay que corregir un
 * literal y no buscarlos desperdigados por cinco componentes.
 *
 * @param {number} idCita Id del turno.
 * @returns {Promise<object>} El turno ya en estado 'confirmada'.
 */
export async function confirmarTurno(idCita) {
  return await cambiarEstadoTurno(idCita, 'confirmada');
}

/**
 * Lista los turnos propios del usuario autenticado.
 *
 * ESTA FUNCIÓN NO LANZA EXCEPCIONES A PROPÓSITO. Devuelve siempre un objeto con
 * la forma { turnos, error, vacios }.
 *
 * La razón es que la consume `usePolling`, que está pensado para seguir
 * reintentando aunque la consulta falle. Si esta función lanzara, el polling
 * necesitaría un try/catch propio y, peor, el componente tendría que manejar
 * dos caminos distintos para "no hay turnos" y "no se pudieron cargar los
 * turnos". Con un solo objeto de retorno, la pantalla siempre tiene las tres
 * respuestas bien separadas:
 *
 *   error  → se avisó que no se pudo consultar
 *   vacios → se consultó bien y no hay turnos
 *   turnos → la lista
 *
 * Esa distinción es la que permite que "no tenés turnos" y "no pudimos
 * consultar" no se vean iguales en pantalla: son problemas opuestos y la
 * persona tiene que poder distinguirlos.
 *
 * @returns {Promise<{turnos: Array, error: string|null, vacios: boolean}>}
 */
export async function listarMisTurnos() {
  const respuesta = await client.get('/api/citas', {
    params: { mias: 1, por_pagina: 50 },
  });
  // mias=1: el backend filtra por el token, así que la web no manda ningún id
  // de usuario. Aunque alguien manipulase la petición desde el navegador, no
  // podría pedir los turnos de otra persona: el alcance lo impone el servidor.
  const turnos = desenvolver(respuesta) ?? [];

  return { turnos, vacios: turnos.length === 0 };

  // NOTA sobre por qué NO se captura el error aquí.
  // -----------------------------------------
  // Una versión anterior de esta función envolvía todo en un try/catch y
  // devolvía {turnos: [], error: '...', vacios: true} cuando el backend fallaba.
  // Parece robusto: nunca rompe la pantalla. En la práctica producía el peor
  // error posible, uno invisible.
  //
  // usePolling solo considera fallida una carga si la función PROMESA rechaza.
  // Si la función resuelve con un objeto que trae 'error' adentro, el hook la
  // toma por una respuesta exitosa, deja la pantalla en estado "no hay datos" y
  // no muestra ningún aviso. Un 500 del servidor se veía exactamente igual que
  // una lista vacía: cero turnos. La persona cerraba la pestaña pensando que
  // nadie la había atendido nunca, cuando en realidad era un problema de red o
  // del servidor.
  //
  // Con 'error' dentro del objeto, además, el componente tiene que acordarse de
  // mirarlo en un segundo lugar distinto del error del hook. El hook ya sabe
  // distinguir "falló" de "vació", y lo hace con el rejection de la promesa.
  // Un solo camino para un solo tipo de problema.
}

// ============================================================
// FICHA DEL USUARIO
// ============================================================

/**
 * Vincula la cuenta de acceso con la ficha clínica.
 *
 * Sin este vínculo NO se puede reservar: la API necesita saber a quién se le
 * asigna el turno. Para un paciente es el DNI; para un médico, la matrícula.
 *
 * @param {string} tipo 'paciente' o 'medico'.
 * @param {string} documento DNI (7-8 dígitos) o matrícula del profesional.
 * @returns {Promise<object>} Resultado de la vinculación.
 */
export async function vincularFicha(tipo, documento) {
  const response = await client.post('/api/auth/vincular', {
    tipo,
    documento,
  });
  return desenvolver(response);
}

/**
 * Lista los avisos (notificaciones) del usuario autenticado.
 * @returns {Promise<Array>} Los avisos, del más reciente al más antiguo.
 */
export async function listarNotificaciones() {
  const response = await client.get('/api/notificaciones');
  return desenvolver(response) ?? [];
}

/**
 * Genera los recordatorios pendientes de los turnos que se acercan.
 *
 * Es idempotente: se puede llamar cada vez que se abre el panel sin generar
 * avisos duplicados, porque el backend no vuelve a crear uno si la cita ya lo
 * tiene. Por eso la web lo invoca en cada apertura: no hay que llevar el
 * control de duplicados, porque quedó delegado en el índice único del backend.
 *
 * @returns {Promise<object>} Resumen de lo generado.
 */
export async function generarRecordatorios() {
  const response = await client.post('/api/notificaciones/recordatorios');
  return desenvolver(response);
}

// ============================================================
// MÉTRICAS DE GESTIÓN
// ============================================================

/**
 * Obtiene las estadísticas de demanda, ocupación y asistencia.
 * No va por tiempo real: son métricas de gestión y un retraso de unos
 * segundos es irrelevante para decidir, así que van por REST normal.
 *
 * @returns {Promise<object>} {
 *   rango: { desde, hasta, dias },
 *   demanda: { total_citas, por_dia, por_especialidad, promedio_diario },
 *   ocupacion: { turnos_ofrecidos, turnos_reservados, porcentaje },
 *   asistencia: { por_estado, ausentismo_porcentaje, tasa_cancelacion },
 *   autogestion: { reservadas_por_paciente, reservadas_por_consultorio, porcentaje_online },
 *   profesionales: [...]
 * }
 */
export async function obtenerEstadisticas() {
  const response = await client.get('/api/estadisticas');
  return desenvolver(response);
}

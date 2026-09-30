// ============================================================
// PANTALLA: Reservar turno (turnera)
// ============================================================
// Última pantalla del flujo público y primera que exige sesión. Muestra un
// resumen del horario elegido y pide confirmar.
//
// LA REGLA DE NEGOCIO CENTRAL DE ESTA PANTALLA
// --------------------------------------------
// Para reservar, la cuenta tiene que estar VINCULADA a una ficha clínica. Sin
// vínculo no hay reserva posible, porque la API necesita saber a quién se le
// asigna el turno. Por eso esta pantalla tiene TRES estados distintos y no
// uno solo:
//
//   A. Sin sesión                       → invitación a registrarse o entrar
//   B. Con sesión pero sin ficha        → formulario de vinculación
//   C. Con sesión y ficha vinculada      → formulario de confirmación
//
// Resolverlo con una sola pantalla "reservar" habría producido el peor error
// posible: que el usuario llenara el formulario, apretara reservar, y recién
// ahí se enterara de que le faltaba una cuenta.
//
// DOS MODOS DE RESERVA SEGÚN EL ROL
// ---------------------------------
// • Paciente: reserva para sí mismo. El backend impone su id de paciente
//   leyendo el token, así que la web ni lo manda.
//
// • Médico o admin: reserva en nombre de alguien, y el backend NO puede
//   deducir de quién. Por eso esta pantalla les muestra un selector de
//   paciente. Es la diferencia real entre los dos flujos, y por eso el
//   selector solo aparece para esos roles.
//
// NOTA DE SEGURIDAD
// -----------------
// Esta pantalla nunca manda el id del paciente cuando quien reserva es un
// paciente. Aunque la web lo conozca, no lo envía: el backend lo impone desde
// el token justamente para que nadie pueda reservar en nombre de otra persona
// manipulando la petición desde el navegador.
// ============================================================

import React, { useState, useEffect } from 'react';
// useState: estado del formulario y de las acciones en curso.
// useEffect: validaciones y cargas que se disparan al montar.

import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
// useParams: el id del profesional.
// useSearchParams: la fecha y la hora elegidas en la pantalla de agenda.
// useNavigate: navegación programática.
// Link: enlaces de la SPA, sin recargar la aplicación.

import {
  reservarTurno,
  vincularFicha,
  listarPacientes,
  mensajeDeError,
} from '../../api/turnera';
// Importa SOLO las funciones de la API: este componente nunca ve URLs ni Axios.

import { useAuth } from '../../hooks/useAuth';
// Para saber si hay sesión, qué rol tiene y si ya está vinculado a una ficha.

import { Cargando, Aviso } from './PiezasTurnera';
// Piezas de interfaz compartidas por el módulo.

import './Turnera.css';
// Estilos del módulo.

export default function ReservarTurno() {
  const { idMedico } = useParams();
  // Profesional elegido. Llega como string desde la URL.

  const [parametros] = useSearchParams();
  // useSearchParams devuelve [los parámetros, la función para cambiarlos].
  // Solo se usa el primer valor: la fecha y la hora no se editan desde acá.

  const navigate = useNavigate();

  const { autenticado, usuario, cargando: cargandoSesion, recargarSesion } = useAuth();
  // cargandoSesion evita mostrar "necesitás una cuenta" antes de que el
  // backend termine de verificar el token guardado. Sin esa espera, un
  // usuario con sesión válida vería la pantalla de registro parpadear.

  // ---- Datos del turno elegido (vienen de la pantalla de agenda) ----
  const fecha = parametros.get('fecha');
  // '2026-09-29'

  const hora = parametros.get('hora');
  // '10:00'

  // ---- Estado del formulario ----
  const [motivo, setMotivo] = useState('');
  const [notas, setNotas] = useState('');
  // Motivo de consulta y notas para el consultorio. Ambos opcionales.

  const [documento, setDocumento] = useState('');
  // DNI (paciente) o número de matrícula (médico) para la vinculación.

  const [pacienteElegido, setPacienteElegido] = useState('');
  // Solo se usa cuando quien reserva es médico o admin.

  const [pacientes, setPacientes] = useState([]);
  // Listado para ese selector.

  // ---- Estado de las operaciones ----
  const [error, setError] = useState(null);
  const [exito, setExito] = useState(null);
  const [enviando, setEnviando] = useState(false);
  // Flags para deshabilitar los botones mientras la petición está en curso.

  const [vinculando, setVinculando] = useState(false);
  // Flag equivalente para el formulario de vinculación.

  // ==================================================================
  // ¿La cuenta está vinculada a una ficha?
  // ==================================================================
  // El criterio depende del rol porque cada uno se vincula a una ficha
  // distinta: el paciente a su ficha de paciente (id_paciente) y el médico a
  // su ficha de profesional (id_medico). El admin no se vincula a nada: opera
  // en nombre del estudio, así que se lo considera siempre habilitado.
  const vinculado =
    usuario?.tipo_usuario === 'admin'
      ? true
      : usuario?.tipo_usuario === 'medico'
        ? Boolean(usuario?.id_medico)
        : Boolean(usuario?.id_paciente);
  // Se escribe con operadores anidados en vez de if/else para no crear una
  // función que se vuelve a definir en cada render.

  const reservaEnNombreDeOtro = usuario?.tipo_usuario === 'medico' || usuario?.tipo_usuario === 'admin';
  // Si es verdadero, hay que preguntar de quién es el turno.

  // ==================================================================
  // Validación de la URL y carga de pacientes
  // ==================================================================
  useEffect(() => {
    if (!fecha || !hora) {
      // Si alguien borra la query de la URL a mano o entra por un enlace
      // viejo, no hay horario que reservar. Mejor decirlo explícitamente que
      // mostrar un formulario con datos incompletos que fallaría al enviar.
      setError('Falta elegir el horario. Volvé a la agenda para elegir día y hora.');
    }
  }, [fecha, hora]);
  // Solo al cambiar la query: los datos vengados de la URL son fijos.

  useEffect(() => {
    if (!autenticado || !reservaEnNombreDeOtro) {
      return;
      // El selector solo le hace falta a quien reserva en nombre de otro.
    }

    let cancelado = false;

    async function cargarPacientes() {
      try {
        const datos = await listarPacientes();
        if (!cancelado) {
          setPacientes(datos);
        }
      } catch (err) {
        if (!cancelado) {
          setError('No se pudo cargar el listado de pacientes.');
          // Sin este aviso el selector aparecería vacío y el usuario creería
          // que el estudio no tiene pacientes registrados.
        }
      }
    }

    cargarPacientes();
    return () => { cancelado = true; };
  }, [autenticado, reservaEnNombreDeOtro]);
  // No depende de usuario.id_medico a propósito: cambiar de profesional no
  // obliga a recargar el listado de pacientes.

  // ==================================================================
  // Handlers
  // ==================================================================

  /** Confirma la reserva del turno. */
  const confirmarReserva = async (evento) => {
    evento.preventDefault();
    // Evita la recarga de página que el navegador hace por defecto en un form.

    if (enviando) {
      return;
      // Doble clic: se ignora el segundo intento. Esta comprobación es la que
      // evita el problema real: dos POST seguidos, donde el segundo fallaría
      // con un 409 ("el horario ya fue tomado") cuando en realidad el turno
      // quedó reservado bien con el primero.
    }

    if (reservaEnNombreDeOtro && !pacienteElegido) {
      setError('Elegí para qué paciente es el turno.');
      return;
      // Validación de la web por cortesía. El backend igual la rechazaría,
      // pero avisar acá evita un viaje de ida y vuelta por la red.
    }

    setEnviando(true);
    setError(null);

    try {
      await reservarTurno({
        idMedico: Number(idMedico),
        fecha,
        hora,
        motivo: motivo.trim(),
        notas: notas.trim(),
        // Para el paciente se omite: el backend lo impone desde el token.
        idPaciente: reservaEnNombreDeOtro ? pacienteElegido : undefined,
      });

      navigate('/turnera/mis-turnos');
      // Se navega de una, sin mensaje de éxito intermedio. Mostrar un cartel
      // y esperar 2 segundos antes de navegar alarga el camino y obliga a
      // agregar un temporizador que se puede quedar sin cancelar si el
      // usuario navega antes. La pantalla de destino muestra el turno
      // reservado, y eso ya es la confirmación.
    } catch (err) {
      const esConflicto = err?.response?.status === 409;
      // 409 = el horario fue tomado entre que se eligió y se confirmó.

      setError(
        esConflicto
          ? 'Ese horario acaba de ser tomado por otra persona. Volvé a la agenda para elegir otro.'
          : mensajeDeError(err, 'No se pudo reservar el turno')
      );
      // El 409 merece un mensaje propio: no es un fallo de la persona ni del
      // sistema, es una carrera legítima. Decirle "volvé a elegir" orienta;
      // un "error al reservar" la deja sin saber qué hacer.

      if (esConflicto) {
        // Se vuelve a la agenda para que vea los horarios frescos, con el
        // tomado ya tachado. Dejarlo en el formulario de confirmación con el
        // horario posible lo llevaría a apretar reservar otra vez y a
        // recibir el mismo error.
        setTimeout(() => navigate(`/turnera/agenda/${idMedico}`), 2200);
      }
    } finally {
      setEnviando(false);
      // finally: el botón se rehabilita haya pasado lo que haya pasado.
    }
  };

  /** Vincula la cuenta con la ficha clínica. */
  const confirmarVinculacion = async (evento) => {
    evento.preventDefault();

    if (vinculando) {
      return;
      // Misma protección contra el doble clic.
    }

    setVinculando(true);
    setError(null);
    setExito(null);

    try {
      await vincularFicha(usuario.tipo_usuario, documento.trim());
      setExito('Ficha vinculada. Ya podés confirmar tu turno.');
      // El mensaje se muestra porque la transición al formulario de reserva
      // ocurre recién cuando llegan los datos frescos de la sesión.

      await recargarSesion();
      // Vuelve a consultar /api/auth/me para que el contexto traiga el id de
      // la ficha recién vinculada. Sin esto, 'vinculado' seguiría dando false
      // y el formulario de confirmación no aparecería: el usuario tendría que
      // recargar la página a mano para poder terminar.
    } catch (err) {
      setError(mensajeDeError(err, 'No se pudo vincular la ficha'));
    } finally {
      setVinculando(false);
    }
  };

  // ==================================================================
  // Resumen del turno (se usa en los tres estados)
  // ==================================================================
  const resumen = (
    <div className="resumen-turno">
      {/* dl / dt / dd es la semántica correcta para un conjunto de
          "término: definición". No es un detalle menor: es lo que permite que
          un lector de pantalla anuncie "Fecha, 29 de septiembre". */}
      <dl>
        <div className="resumen-fila">
          <dt>Fecha</dt>
          <dd>{fecha || '—'}</dd>
        </div>
        <div className="resumen-fila">
          <dt>Hora</dt>
          <dd>{hora || '—'}</dd>
        </div>
        {autenticado && vinculado && (
          <div className="resumen-fila">
            <dt>A nombre de</dt>
            {/* Para el paciente es su propio nombre. Para el personal, el del
                paciente que se haya elegido en el selector. */}
            <dd>
              {reservaEnNombreDeOtro
                ? pacientes.find((p) => p.id === Number(pacienteElegido))?.nombre
                  ?? 'sin elegir'
                : usuario?.nombre}
            </dd>
          </div>
        )}
      </dl>
    </div>
  );

  // ==================================================================
  // ESTADO A: sin sesión
  // ==================================================================
  if (cargandoSesion) {
    return (
      <div className="turnera">
        <Cargando texto="Verificando tu sesión..." />
      </div>
    );
  }

  if (!autenticado) {
    // Se muestra el horario elegido para que la persona vea que su elección no
    // se perdió. Dejar el resumen a la vista es lo que hace que entienda PARA
    // QUÉ se le pide registrarse.
    return (
      <div className="turnera">
        <div className="turnera-header">
          <h1>Confirmar turno</h1>
        </div>

        {resumen}

        <Aviso
          tipo="info"
          texto="Para reservar este turno necesitás una cuenta. Tardás menos de un minuto en crearla."
        />

        <div className="turnera-filtros">
          {/* Link y no <a href>: así la navegación es de la SPA, sin recargar
              la aplicación entera. Con un href el usuario perdería el
              horario elegido al volver. */}
          <Link to="/register" className="btn-turnera btn-primario">
            Crear mi cuenta
          </Link>
          <Link to="/login" className="btn-turnera btn-secundario">
            Ya tengo cuenta
          </Link>
        </div>
      </div>
    );
  }

  // ==================================================================
  // ESTADO B: con sesión pero sin ficha vinculada
  // ==================================================================
  if (!vinculado) {
    return (
      <div className="turnera">
        <div className="turnera-header">
          <h1>Vincular tu ficha</h1>
          <p>
            Antes de reservar necesitamos vincular tu cuenta con tu ficha del
            consultorio. Es un solo paso y se hace una sola vez.
          </p>
        </div>

        {error && <Aviso tipo="error" texto={error} />}

        <form className="turnera-form" onSubmit={confirmarVinculacion}>
          <div className="form-campo">
            <label htmlFor="vinculo-documento">
              {usuario.tipo_usuario === 'medico' ? 'Número de matrícula' : 'Número de DNI'}
            </label>
            <input
              id="vinculo-documento"
              type="text"
              value={documento}
              onChange={(e) => setDocumento(e.target.value)}
              placeholder={usuario.tipo_usuario === 'medico' ? 'Ej: 44556' : 'Ej: 30111222'}
              autoComplete="off"
              // inputMode="numeric" en los móviles abre el teclado numérico en
              // lugar del de letras, que es lo que corresponde a un documento.
              inputMode="numeric"
              required
              // required del navegador: avisa antes de mandar la petición.
            />
          </div>

          <button
            type="submit"
            className="btn-turnera btn-primario"
            disabled={vinculando}
          >
            {vinculando ? 'Vinculando...' : 'Vincular mi ficha'}
          </button>
        </form>
      </div>
    );
  }

  // ==================================================================
  // ESTADO C: con sesión y ficha vinculada
  // ==================================================================
  return (
    <div className="turnera">
      <div className="turnera-header">
        <h1>Confirmar turno</h1>
        <p>Revisá los datos antes de confirmar.</p>
      </div>

      {error && <Aviso tipo="error" texto={error} />}
      {exito && <Aviso tipo="exito" texto={exito} />}

      {resumen}

      <form className="turnera-form" onSubmit={confirmarReserva}>
        {/* Selector de paciente: solo para quien reserva en nombre de otro */}
        {reservaEnNombreDeOtro && (
          <div className="form-campo">
            <label htmlFor="reserva-paciente">Paciente para el que es el turno</label>
            <select
              id="reserva-paciente"
              value={pacienteElegido}
              onChange={(e) => setPacienteElegido(e.target.value)}
              required
            >
              <option value="">Elegí un paciente</option>
              {pacientes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nombre} (DNI: {p.dni})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-campo">
          <label htmlFor="reserva-motivo">Motivo de la consulta (opcional)</label>
          <textarea
            id="reserva-motivo"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="Ej: dolor de garganta desde hace tres días"
            rows="3"
            maxLength="255"
          />
          {/* maxLength en el atributo, y no solo con un contador en pantalla:
              el atributo frena el envío desde el navegador y el backend recorta
              a 255 igual. Hacen falta las dos barreras: la del cliente es una
              comodidad, la del servidor es la que realmente protege el dato. */}
        </div>

        <div className="form-campo">
          <label htmlFor="reserva-notas">Notas para el consultorio (opcional)</label>
          <textarea
            id="reserva-notas"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            rows="2"
          />
        </div>

        <button
          type="submit"
          className="btn-turnera btn-primario"
          disabled={enviando}
        >
          {enviando ? 'Reservando...' : 'Confirmar turno'}
        </button>
      </form>
    </div>
  );
}

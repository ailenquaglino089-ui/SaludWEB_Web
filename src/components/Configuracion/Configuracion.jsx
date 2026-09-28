// ============================================================
// PANTALLA: Configuración de la cuenta
// ============================================================
// Reúne todo lo que la persona puede cambiar de sí misma, en un solo lugar:
// su contraseña y su ficha clínica.
//
// POR QUÉ UNA PANTALLA APARTE Y NO UN MENÚ DESPLEGABLE
// ---------------------------------------------------
// El navbar ya tiene seis entradas. Agregarle una séptima que se despliegue al
// hacer clic esconde la función detrás de un gesto que nadie descubre solo, y
// además es la clase de control que peor funciona en pantallas chicas. Una
// ruta propia es visible, se puede compartir por enlace y tiene un lugar fijo
// en el historial del navegador.
//
// QUÉ SE PUEDE CAMBIAR Y QUÉ NO
// ----------------------------
// Se puede cambiar la contraseña, porque es un dato que la persona conoce y
// por lo tanto puede verificar por sí misma.
//
// NO se puede cambiar el DNI, el nombre ni la especialidad desde acá, a
// propósito. Esos datos son la identidad de la persona, y si cualquiera
// pudiera editarlos por su cuenta, la vinculación con la ficha clínica dejaría
// de significar nada: bastaría con escribir el DNI de otra persona para entrar
// a sus turnos. Cambiarlos requiere un proceso de verificación administrativa,
// no un formulario. Esta decisión es de seguridad, no una funcionalidad
// pendiente.
// ============================================================

import React, { useState } from 'react';
// useState: estado de los formularios.
// No hace falta useEffect: los datos de la cuenta llegan con el contexto de
// sesión, que ya se cargó al montar la aplicación. Esta pantalla no tiene que
// volver a pedirlos.

import { useNavigate } from 'react-router-dom';
// useNavigate: para volver al panel tras cambiar la contraseña.

import { useAuth } from '../../hooks/useAuth';
// Lee la sesión, el usuario actual y el método de cambio de contraseña.

import { mensajeDeError, vincularFicha } from '../../api/turnera';
// Importa SOLO las funciones de la API. El cambio de contraseña NO se pide
// acá: ya vive en AuthContext, que es quien conoce el token y el flujo de
// sesión. Pedirla otra vez por API sería duplicar ese lógica en dos lugares.

import { Cargando, Aviso } from '../Turnera/PiezasTurnera';
// Se reutilizan las piezas del módulo de turnera: un indicador de carga y un
// aviso de error no son exclusivos de la turnera, y duplicar esas piezas
// produce dos estilos distintos para lo mismo.

import '../Turnera/Turnera.css';
// Los estilos de formulario vienen de las reglas compartidas del módulo.

export default function Configuracion() {
  const { usuario, cargando, recargarSesion, cambiarContrasena } = useAuth();
  // usuario: los datos actuales de la cuenta.
  // cambiarContrasena: viene del contexto, no de la API.

  const navigate = useNavigate();

  // ---- Cambio de contraseña ----
  const [actual, setActual] = useState('');
  const [nueva, setNueva] = useState('');
  const [repetir, setRepetir] = useState('');
  // Tres campos y no dos. El tercero parece redundante, pero es la única
  // forma de detectar el error más común al cambiar una contraseña: elegir una
  // nueva que se haya tecleado mal. Con dos campos, la persona se encuentra
  // con una contraseña que no recuerda haber escrito y tiene que adivinar cuál
  // de las dos pulsaciones era la correcta.

  const [errorContrasena, setErrorContrasena] = useState(null);
  const [exitoContrasena, setExitoContrasena] = useState(null);
  const [enviandoContrasena, setEnviandoContrasena] = useState(false);

  // ---- Ficha clínica ----
  const [documento, setDocumento] = useState('');
  const [errorVinculo, setErrorVinculo] = useState(null);
  const [exitoVinculo, setExitoVinculo] = useState(null);
  const [vinculando, setVinculando] = useState(false);

  // El usuario puede ser null un instante aunque la sesión sea válida, porque
  // /api/auth/me es asíncrono. Mientras tanto no se renderiza ningún formulario.
  if (cargando || !usuario) {
    return (
      <div className="turnera">
        <Cargando texto="Cargando tu configuración..." />
      </div>
    );
  }

  // ==================================================================
  // Estado derivado
  // ==================================================================
  const vinculado =
    usuario.tipo_usuario === 'admin'
      ? true
      : usuario.tipo_usuario === 'medico'
        ? Boolean(usuario.id_medico)
        : Boolean(usuario.id_paciente);
  // Mismo criterio que en la pantalla de reserva, y por la misma razón: cada
  // rol se vincula a una ficha distinta y el admin no se vincula a ninguna.

  const sonFormulariosVacios = !actual || !nueva || nueva.length < 8;
  // La validación de la longitud se repite acá, además de la que hace el
  // backend. Se valida dos veces a propósito: en el cliente para dar el aviso
  // al instante sin gastar un viaje de red, y en el servidor porque es la
  // única validación de la que se puede confiar.

  // ==================================================================
  // Handlers
  // ==================================================================
  const guardarContrasena = async (evento) => {
    evento.preventDefault();

    if (enviandoContrasena) {
      return;
    }

    if (nueva !== repetir) {
      setErrorContrasena('Las dos contraseñas nuevas no coinciden.');
      return;
    }

    if (sonFormulariosVacios) {
      setErrorContrasena('La contraseña nueva debe tener al menos 8 caracteres.');
      return;
    }

    setEnviandoContrasena(true);
    setErrorContrasena(null);
    setExitoContrasena(null);

    try {
      await cambiarContrasena(actual, nueva);
      setExitoContrasena('Contraseña actualizada. Volviendo al panel...');

      // El backend invalida los tokens anteriores al cambiar la contraseña,
      // por seguridad. Como el token que tiene esta sesión deja de servir, la
      // navegación posterior ya iría con un token rechazado. Por eso, en vez de
      // confiar en que otro hook se dé cuenta, se espera a que el mensaje se lea
      // y se vuelve al login explícitamente.
      setTimeout(() => navigate('/login'), 1500);
    } catch (err) {
      setErrorContrasena(mensajeDeError(err, 'No se pudo cambiar la contraseña'));
    } finally {
      setEnviandoContrasena(false);
    }
  };

  const guardarVinculo = async (evento) => {
    evento.preventDefault();

    if (vinculando) {
      return;
    }

    setVinculando(true);
    setErrorVinculo(null);
    setExitoVinculo(null);

    try {
      await vincularFicha(usuario.tipo_usuario, documento.trim());
      setExitoVinculo('Ficha vinculada correctamente.');
      await recargarSesion();
      // Igual que en la pantalla de reserva: el id de la ficha lo agrega el
      // backend a la sesión, y sin recargarla la pantalla seguiría mostrando
      // el formulario de vinculación como si nada hubiera pasado.
    } catch (err) {
      setErrorVinculo(mensajeDeError(err, 'No se pudo vincular la ficha'));
    } finally {
      setVinculando(false);
    }
  };

  // ==================================================================
  // Render
  // ==================================================================
  return (
    <div className="turnera">
      <div className="turnera-header">
        <h1>Configuración</h1>
        <p>Gestioná tu cuenta y tu ficha del consultorio.</p>
      </div>

      {/* ---- Datos de la cuenta, solo lectura ---- */}
      {/* Se muestran para que la persona confirme que la cuenta es la que cree
          antes de cambiar algo. Un formulario de cambio de contraseña sin
          mostrar a quién pertenece es una pantalla de la nada. */}
      <section className="config-seccion">
        <h2>Tu cuenta</h2>
        <dl className="resumen-turno">
          <div className="resumen-fila">
            <dt>Nombre</dt>
            <dd>{usuario.nombre}</dd>
          </div>
          <div className="resumen-fila">
            <dt>Correo</dt>
            <dd>{usuario.email}</dd>
          </div>
          <div className="resumen-fila">
            <dt>Rol</dt>
            <dd>{usuario.tipo_usuario}</dd>
          </div>
          <div className="resumen-fila">
            <dt>Ficha clínica</dt>
            <dd>
              {usuario.tipo_usuario === 'admin'
                ? 'No aplica (cuenta administrativa)'
                : vinculado
                  ? 'Vinculada'
                  : 'Sin vincular'}
            </dd>
          </div>
        </dl>
      </section>

      {/* ---- Cambio de contraseña ---- */}
      <section className="config-seccion">
        <h2>Cambiar contraseña</h2>

        {errorContrasena && <Aviso tipo="error" texto={errorContrasena} />}
        {exitoContrasena && <Aviso tipo="exito" texto={exitoContrasena} />}

        <form className="turnera-form" onSubmit={guardarContrasena}>
          <div className="form-campo">
            <label htmlFor="config-actual">Contraseña actual</label>
            <input
              id="config-actual"
              type="password"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              autoComplete="current-password"
              // autoComplete no es decorativo: el gestor de contraseñas del
              // navegador lo usa para proponer la contraseña correcta. Sin esto,
              // el campo queda vacío y la persona tiene que buscarla a mano.
              required
            />
          </div>

          <div className="form-campo">
            <label htmlFor="config-nueva">Contraseña nueva</label>
            <input
              id="config-nueva"
              type="password"
              value={nueva}
              onChange={(e) => setNueva(e.target.value)}
              autoComplete="new-password"
              minLength="8"
              required
            />
          </div>

          <div className="form-campo">
            <label htmlFor="config-repetir">Repetí la contraseña nueva</label>
            <input
              id="config-repetir"
              type="password"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              autoComplete="new-password"
              minLength="8"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-turnera btn-primario"
            disabled={enviandoContrasena || sonFormulariosVacios}
          >
            {enviandoContrasena ? 'Guardando...' : 'Guardar contraseña'}
          </button>
        </form>
      </section>

      {/* ---- Ficha clínica ---- */}
      {usuario.tipo_usuario !== 'admin' ? (
        <section className="config-seccion">
          <h2>Ficha clínica</h2>

          {errorVinculo && <Aviso tipo="error" texto={errorVinculo} />}
          {exitoVinculo && <Aviso tipo="exito" texto={exitoVinculo} />}

          {vinculado ? (
            <Aviso
              tipo="exito"
              texto="Tu cuenta ya está vinculada a tu ficha. Para cambiar los datos de la ficha, pedilo en recepción."
            />
          ) : (
            <>
              <p>
                Todavía no vinculaste tu cuenta con tu ficha del consultorio.
                Necesitás hacerlo para reservar turnos y ver tu historial.
              </p>

              <form className="turnera-form" onSubmit={guardarVinculo}>
                <div className="form-campo">
                  <label htmlFor="config-documento">
                    {usuario.tipo_usuario === 'medico' ? 'Número de matrícula' : 'Número de DNI'}
                  </label>
                  <input
                    id="config-documento"
                    type="text"
                    value={documento}
                    onChange={(e) => setDocumento(e.target.value)}
                    inputMode="numeric"
                    autoComplete="off"
                    required
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
            </>
          )}
        </section>
      ) : (
        <Aviso
          tipo="info"
          texto="Las cuentas administrativas no se vinculan a una ficha clínica."
        />
      )}
    </div>
  );
}

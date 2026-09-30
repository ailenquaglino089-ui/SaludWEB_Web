// ============================================================
// BARRA DE NAVEGACIÓN
// ============================================================
import { Link, useLocation, useNavigate } from 'react-router-dom';
// Link: navegación de la SPA (no recarga la página).
// useLocation: para saber en qué ruta está la persona y marcar el enlace activo.
// useNavigate: para el cierre de sesión, que además de limpiar el token tiene
// que cambiar de ruta.

import { useAuth } from '../hooks/useAuth';
// Acceso al contexto de autenticación (usuario, logout, autenticado).

import { useState } from 'react';
// Estado local del menú desplegable en pantallas pequeñas.

import './Navbar.css';
// Estilos específicos de la barra de navegación.

/**
 * Enlaces que se muestran a cualquiera, con o sin sesión.
 *
 * "Turnera" va primero a propósito, y no por un capricho de orden: es la única
 * parte de la aplicación que una persona sin cuenta puede usar. Todo lo demás
 * es el interior de la herramienta de gestión, y sin sesión no existe.
 */
const ENLACES_PUBLICOS = [
  { a: '/turnera', texto: 'Turnera' },
];

/**
 * Enlaces que solo tienen sentido con una sesión activa, según el rol.
 *
 * "Mis turnos" NO va en la lista pública de esta función a propósito. Para
 * alguien que todavía no reservó nada es un destino vacío, y ofrecerlo en el
 * menú principal lo convierte en una promesa que la pantalla no puede cumplir.
 * Quien tenga turnos los alcanza desde el catálogo y desde la confirmación de
 * la reserva, que es el momento en que esa pantalla se vuelve útil.
 *
 * POR QUÉ EL ROL DECIDE Y NO SOLO "TIENE SESIÓN"
 * ----------------------------------------------
 * Una versión anterior de este archivo mostraba los mismos cinco enlaces a
 * cualquiera que estuviera conectado, y se verificó en el navegador que un
 * paciente recibía un menú con "Médicos", "Pacientes" y "Prescripciones".
 *
 * El problema no es que esos enlaces estuvieran rotos: ProtectedRoute solo
 * comprueba que haya sesión, así que el clic los dejaba pasar y la pantalla
 * terminaba mostrando un 403. El problema es la promesa: un menú que ofrece
 * cinco destinos y tres fallan convierte la aplicación en algo que no se puede
 * usar. Peor todavía, un 403 se lee como "tu sesión está rota" cuando en
 * realidad el sistema está haciendo lo correcto.
 *
 * El backend igual va a rechazar esas peticiones, y esa es la defensa que no
 * se puede saltar desde el navegador. Lo que se hace acá es no ofrecer lo que
 * va a ser rechazado: la seguridad no cambia, cambia la honestidad de la
 * pantalla.
 *
 * Ojo con una confusión fácil: el backend llama a este campo tipo_usuario y a
 * la vez guarda "rol" en otros lados. acá se usa tipo_usuario, que es el que
 * devuelve /api/auth/me y el que se guarda en el contexto de sesión.
 */
const ENLACES_SEGUN_ROL = {
  admin: [
    { a: '/dashboard', texto: 'Dashboard' },
    { a: '/medicos', texto: 'Médicos' },
    { a: '/pacientes', texto: 'Pacientes' },
    { a: '/prescripciones', texto: 'Prescripciones' },
    { a: '/usuarios', texto: 'Usuarios' },
    { a: '/configuracion', texto: 'Configuración' },
  ],
  // "Usuarios" (la pantalla de permisos) es la ÚNICA entrada que el
  // administrador tiene y el resto de los roles no. Va después de
  // Prescripciones y antes de Configuración por una razón de uso, no de
  // jerarquía: los tres primeros son los módulos de trabajo diario, este es
  // una tarea de administración poco frecuente, y Configuración es el último
  // lugar donde alguien busca algo.
  //
  // Ocultarlo para los demás roles no es la defensa. La defensa son los
  // requireRol() del backend, y un token de médico contra /api/usuarios
  // recibe 403 igual. Lo que hace el menú es no ofrecer un destino que va a
  // ser rechazado, que es el mismo criterio que aplica al resto del archivo.
  medico: [
    { a: '/dashboard', texto: 'Dashboard' },
    { a: '/medicos', texto: 'Médicos' },
    { a: '/pacientes', texto: 'Pacientes' },
    { a: '/prescripciones', texto: 'Prescripciones' },
    { a: '/configuracion', texto: 'Configuración' },
  ],
  // El médico ve los mismos módulos que el administrador en el menú, y la
  // diferencia real la aplica el backend en cada endpoint: un médico solo ve
  // su propia agenda y sus pacientes. Filtrar el menú con una granularidad más
  // fina que la del backend escondería enlaces que sí funcionan, que es el
  // error simétrico del que se quiere evitar acá.

  paciente: [
    { a: '/dashboard', texto: 'Dashboard' },
    { a: '/turnera/mis-turnos', texto: 'Mis turnos' },
    { a: '/configuracion', texto: 'Configuración' },
  ],
  // El paciente sí tiene "Mis turnos" en el menú, a diferencia de la lista
  // pública. La razón es que acá el enlace ya está dentro de la sesión: si la
  // persona está conectada y tiene la pantalla de turnos a un clic, esconderla
  // no evita un destino vacío, solo agrega pasos.

  por_defecto: [
    { a: '/dashboard', texto: 'Dashboard' },
    { a: '/configuracion', texto: 'Configuración' },
  ],
  // Si algún día llega un rol que este archivo no conoce, se muestra lo
  // mínimo en vez de la lista completa. Es el mismo criterio que antes: por
  // defecto se ofrece poco, porque un enlace de más produce un error visible y
  // un enlace de menos solo cuesta un paso.
};

export default function Navbar() {
  const { usuario, logout, autenticado } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [menuAbierto, setMenuAbierto] = useState(false);
  // Indica si el menú desplegable (hamburguesa) está abierto o cerrado.

  /** Cierra la sesión y vuelve al login. */
  const handleLogout = async () => {
    await logout();
    // logout() limpia el token del localStorage y el estado global. Con eso
    // alcanza: no hace falta recargar la página a mano.
    navigate('/login', { replace: true });
    // replace en vez de push: la pantalla anterior era el panel, y volver con
    // el botón "atrás" del navegador llevaría a una ruta protegida que
    // redirigirá al login de nuevo. Con replace, el login queda como único
    // punto de entrada.
    setMenuAbierto(false);
  };

  /** Cierra el menú móvil al navegar, para que no tape la pantalla de destino. */
  const irA = () => setMenuAbierto(false);
  // Se pasa a cada enlace como onClick. Sin esto, en móvil el menú sigue
  // abierto encima de la página a la que se acaba de ir, y la persona tiene
  // que cerrarlo a mano cada vez.

  /**
   * Marca el enlace activo.
   * @param {string} ruta La ruta del enlace.
   * @returns {boolean} true si ese enlace es el que se está viendo.
   */
  const esActivo = (ruta) => location.pathname === ruta;
  // Comparación EXACTA y no startsWith. Con startsWith, /turnera marcaría como
  // activo también /turnera/mis-turnos y /turnera/agenda/4, y el menú dejaría
  // de decir dónde está la persona. El catálogo es el único enlace que
  // representa a toda la sección, así que es el único caso donde haría falta
  // una regla especial, y no vale la pena: la URL exacta ya dice dónde está.

  /**
   * Cierra el menú al pulsar Escape.
   * Un menú desplegable que solo se cierra con el mismo botón que lo abrió deja
   * atrapada a la persona que navega con teclado: Tab sigue metiendo el foco
   * dentro del menú y no hay forma de salir salvo con el mouse.
   */
  const alPulsarEscape = (evento) => {
    if (evento.key === 'Escape') {
      setMenuAbierto(false);
    }
  };

  return (
    <nav className="navbar" onKeyDown={alPulsarEscape}>
      {/* onKeyDown en lugar de un addEventListener: el evento se maneja con el
          ciclo de vida de React y no hay que acordarse de quitarlo. */}

      <div className="navbar-container">
        {/* La marca navega al catálogo de la turnera, no al dashboard. Quien
            no tiene sesión igual puede ver profesionales, y la marca es el
            único elemento visible en todas las pantallas. Mandarla al
            dashboard mandaría a alguien sin sesión directo al login, que es
            una mala primera impresión: la persona solo quería mirar la
            cartilla de profesionales y de golpe le piden contraseña. */}
        <Link to="/turnera" className="navbar-brand">
          🏥 SaludWEB
        </Link>

        {/* Botón "hamburguesa" (☰): solo visible en pantallas pequeñas.
            aria-expanded es lo que le dice a un lector de pantalla si el menú
            que este botón controla está abierto o cerrado. Sin ese atributo,
            el botón se anuncia como "botón" y nada más. */}
        <button
          type="button"
          className="navbar-toggle"
          onClick={() => setMenuAbierto(!menuAbierto)}
          aria-expanded={menuAbierto}
          aria-controls="navbar-menu"
          aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
        >
          ☰
        </button>

        <div
          id="navbar-menu"
          className={`navbar-menu ${menuAbierto ? 'open' : ''}`}
        >
          {/* El id del div es el que referencia aria-controls del botón. Sin
              esta relación, un lector de pantalla anuncia el botón sin decir
              qué menú es el que abre. */}

          <div className="navbar-links">
            {ENLACES_PUBLICOS.map((enlace) => (
              <Link
                key={enlace.a}
                to={enlace.a}
                className="navbar-link"
                onClick={irA}
                aria-current={esActivo(enlace.a) ? 'page' : undefined}
              >
                {enlace.texto}
              </Link>
            ))}

            {autenticado &&
              (ENLACES_SEGUN_ROL[usuario?.tipo_usuario] ?? ENLACES_SEGUN_ROL.por_defecto).map(
                (enlace) => (
                  <Link
                    key={enlace.a}
                    to={enlace.a}
                    className="navbar-link"
                    onClick={irA}
                    aria-current={esActivo(enlace.a) ? 'page' : undefined}
                  >
                    {enlace.texto}
                  </Link>
                )
              )}
            {/* Los enlaces privados se eligen por rol, con lista vacía si
                todavía no se sabe quién es.

                El ?? ENLACES_SEGUN_ROL.por_defecto no es un detalle menor:
                cubre el caso de que el contexto todavía esté cargando y
                tipo_usuario sea undefined. Con lista vacía en ese instante, el
                menú aparecería sin enlaces privados y luego saltarían al llegar
                los datos: un parpadeo que se ve en cada carga. Con la lista
                mínima, el menú pasa de dos entradas a las definitivas sin
                aparecer vacío.

                La seguridad de estos enlaces NO depende de acá: el backend
                responde 403 a un paciente que pide /api/pacientes aunque el
                navegador le ofrezca el botón. Esto es únicamente para no
                ofrecer destinos que van a fallar. */}
          </div>

          <div className="navbar-user">
            {autenticado ? (
              <>
                <span className="user-name">
                  {usuario?.nombre}
                  {usuario?.tipo_usuario && (
                    <span className="user-role">{usuario.tipo_usuario}</span>
                  )}
                </span>

                <button type="button" className="btn-logout" onClick={handleLogout}>
                  Cerrar Sesión
                </button>
              </>
            ) : (
              /* Sin sesión se ofrecen las dos acciones posibles, no solo
                 "Ingresar". Alguien que llegó a la turnera sin cuenta casi
                 siempre está a punto de crear una: pedirle que se registre es
                 el camino corto, y esconder esa opción detrás de "ya tengo
                 cuenta" agrega un paso sin motivo. */
              <>
                <Link to="/login" className="navbar-link" onClick={irA}>
                  Ingresar
                </Link>
                <Link to="/register" className="btn-logout" onClick={irA}>
                  Crear cuenta
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

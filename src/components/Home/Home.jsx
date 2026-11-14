import { Link } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';

import logoBlanco from '../../../docs/brand/saludweb-logo-principal-blanco.svg';
import isotipo from '../../../docs/brand/saludweb-isotipo.svg';

import './Home.css';

/**
 * HOME pública de SaludWEB.
 *
 * La primera pantalla replica el flyer de presentación: fondo tecnológico,
 * logo blanco, persona, cuatro funciones, CTA y robot. Debajo se mantiene el
 * contenido que explica el problema, la solución y el flujo por rol.
 *
 * Los botones cambian según la sesión, pero la HOME siempre es accesible: una
 * persona sin cuenta puede conocer el sistema antes de decidir registrarse.
 */

/** Las cuatro barras celestes con tilde que aparecen en el flyer. */
const FUNCIONES_FLYER = [
  'Gestión de turnos',
  'Creación de recetas',
  'Información organizada',
  'Ahorrá tiempo',
];

const BENEFICIOS = [
  {
    titulo: 'Reserva 24/7',
    texto: 'El paciente elige especialidad, profesional y horario desde el celular o la computadora, sin llamar.',
  },
  {
    titulo: 'Horarios reales',
    texto: 'La disponibilidad se consulta en el momento: si un horario ya está ocupado, no se ofrece.',
  },
  {
    titulo: 'Agenda compartida',
    texto: 'Cuando el paciente confirma, el turno aparece en la agenda del médico con la misma fecha y hora.',
  },
  {
    titulo: 'Menos errores',
    texto: 'Una sola fuente de verdad evita turnos duplicados, anotaciones en papel y cambios que nadie ve.',
  },
  {
    titulo: 'Historia conectada',
    texto: 'Pacientes, médicos y recetas trabajan sobre la misma ficha, con permisos separados por rol.',
  },
  {
    titulo: 'Desde cualquier pantalla',
    texto: 'La experiencia se adapta a celulares, tablets y computadoras sin instalar programas.',
  },
];

const PROBLEMAS = [
  {
    numero: '01',
    titulo: 'Llamados en horario limitado',
    texto: 'La persona tiene que llamar justo cuando alguien atiende, muchas veces mientras trabaja.',
  },
  {
    numero: '02',
    titulo: 'Turnos duplicados',
    texto: 'Dos agendas, un papel y una planilla abierta terminan reservando el mismo horario dos veces.',
  },
  {
    numero: '03',
    titulo: 'Poca confirmación',
    texto: 'El paciente no sabe si el turno quedó tomado hasta que vuelve a llamar o llega al consultorio.',
  },
  {
    numero: '04',
    titulo: 'Información dispersa',
    texto: 'Los datos del paciente, su receta y su turno viven en lugares que no se hablan entre sí.',
  },
];

const PASOS = [
  {
    numero: '1',
    titulo: 'Elegís a quién ver',
    texto: 'Buscás por especialidad o profesional y ves la cartilla disponible.',
  },
  {
    numero: '2',
    titulo: 'Elegís el horario',
    texto: 'Seleccionás el día y la hora que te sirve entre los turnos realmente libres.',
  },
  {
    numero: '3',
    titulo: 'Confirmás y listo',
    texto: 'El turno queda reservado para el paciente y visible para el médico en el mismo instante.',
  },
];

const ROLES = [
  {
    nombre: 'Paciente',
    descripcion: 'Reserva, consulta y cancela sus turnos. Ve sus recetas y sus propios datos.',
    accion: 'Reservar un turno',
    enlace: '/turnera',
  },
  {
    nombre: 'Médico',
    descripcion: 'Consulta su agenda, sus pacientes y las prescripciones que tiene que emitir.',
    accion: 'Ingresar como médico',
    enlace: '/login',
  },
  {
    nombre: 'Administrador',
    descripcion: 'Gestiona profesionales, pacientes y usuarios, con una vista general del consultorio.',
    accion: 'Ingresar al panel',
    enlace: '/login',
  },
];

/**
 * Mujer del flyer: cabello largo y claro, flequillo recto, anteojos de armazón
 * claro, remera roja de mangas largas y collar gris en forma de luna.
 *
 * Se dibuja con SVG inline porque el diseño no incluye una foto recortada ni
 * un asset independiente. Así la ilustración escala sin perder nitidez y no
 * agrega una petición de imagen.
 */
function PersonaFlyer() {
  return (
    <svg
      viewBox="0 0 220 260"
      className="home-flyer__person-svg"
      role="img"
      aria-label="Mujer de cabello largo y claro, flequillo recto, anteojos de armazón claro, remera roja de mangas largas y collar gris en forma de luna"
    >
      <defs>
        <linearGradient id="personaFondo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#dff3ff" />
          <stop offset="100%" stopColor="#8ecbff" />
        </linearGradient>
        <linearGradient id="personaRopa" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ef5350" />
          <stop offset="100%" stopColor="#b51f2f" />
        </linearGradient>
        <linearGradient id="personaPelo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f5e5bc" />
          <stop offset="55%" stopColor="#dfc187" />
          <stop offset="100%" stopColor="#b98e4f" />
        </linearGradient>
        <linearGradient id="personaCollar" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="45%" stopColor="#c6ced6" />
          <stop offset="100%" stopColor="#7f8b96" />
        </linearGradient>
        <radialGradient id="personaCollarBrillo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <clipPath id="personaRecorte">
          <circle cx="110" cy="118" r="104" />
        </clipPath>
      </defs>
      <circle cx="110" cy="118" r="104" fill="url(#personaFondo)" opacity="0.22" />
      <g clipPath="url(#personaRecorte)">
        {/* Melena larga detrás de los hombros: enmarca el rostro sin tapar la prenda. */}
        <path d="M52 104c-8-44 18-74 58-74s66 30 58 74c7 42 1 79-13 105-11 20-27 30-45 30s-34-10-45-30c-14-26-20-63-13-105z" fill="url(#personaPelo)" />
        <path d="M62 100c0-34 20-56 48-56s48 22 48 56c0 22-7 45-18 62-8 12-18 18-30 18s-22-6-30-18c-11-17-18-40-18-62z" fill="#c49a5c" opacity="0.55" />
        {/* El cuello va detrás de la prenda: el escote tapa su base y evita una mancha clara sobre el rojo. */}
        <path d="M88 150v22c0 10 10 18 22 18s22-8 22-18v-22z" fill="#f4c7aa" />
        <path d="M88 164c8 8 36 8 44 0" fill="none" stroke="#d89c84" strokeWidth="3" opacity="0.45" />
        {/* Remera roja de mangas largas: las mangas van primero y el torso tapa la unión. */}
        <path d="M80 174C60 181 48 196 42 216" fill="none" stroke="url(#personaRopa)" strokeWidth="30" strokeLinecap="round" />
        <path d="M140 174c20 7 32 22 38 42" fill="none" stroke="url(#personaRopa)" strokeWidth="30" strokeLinecap="round" />
        <path d="M46 208l-8 14M174 208l8 14" fill="none" stroke="#a31827" strokeWidth="30" strokeLinecap="butt" />
        <path d="M74 170c10-6 62-6 72 0l10 44c1 7-4 12-11 12H75c-7 0-12-5-11-12z" fill="url(#personaRopa)" />
        <path d="M77 184c4 12 7 25 8 38M143 184c-4 12-7 25-8 38" fill="none" stroke="#8f1d2a" strokeWidth="3" opacity="0.35" strokeLinecap="round" />
        {/* Collar gris con forma de luna y un brillo suave sobre el escote. */}
        <path d="M90 168c7 10 33 10 40 0" fill="none" stroke="#aab4be" strokeWidth="1.6" strokeLinecap="round" />
        <circle cx="110" cy="184" r="13" fill="url(#personaCollarBrillo)" />
        <path d="M110 174a11 11 0 1 0 8 19 9 9 0 1 1-8-19z" fill="url(#personaCollar)" stroke="#7f8b96" strokeWidth="1" />
        <path d="M112 177a7 7 0 0 0 5 14" fill="none" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.65" />
        <circle cx="110" cy="108" r="54" fill="#f4c7aa" />
        {/* Flequillo recto: el borde inferior es una línea horizontal sobre la frente. */}
        <path d="M62 88c0-34 20-54 48-54s48 20 48 54z" fill="url(#personaPelo)" />
        <path d="M76 60c10-12 22-18 34-18 12 0 24 6 34 18-12-4-22-6-34-6s-22 2-34 6z" fill="#f7e7bd" opacity="0.65" />
        {/* Mechones delanteros que terminan a la altura del hombro, sin invadir la prenda. */}
        <path d="M58 88c-6 26-5 50 3 68 3 7 7 12 12 16-2-15-1-34 4-50-9-4-15-12-19-34z" fill="url(#personaPelo)" />
        <path d="M162 88c6 26 5 50-3 68-3 7-7 12-12 16 2-15 1-34-4-50 9-4 15-12 19-34z" fill="url(#personaPelo)" />
        <path d="M57 104c1 22 4 40 11 56M163 104c-1 22-4 40-11 56" fill="none" stroke="#b98e4f" strokeWidth="4" strokeLinecap="round" opacity="0.45" />
        {/* Lentes con armazón claro, ojos y sonrisa. */}
        <g fill="#f8fcff" opacity="0.32">
          <rect x="68" y="96" width="38" height="28" rx="12" />
          <rect x="116" y="96" width="38" height="28" rx="12" />
        </g>
        <circle cx="87" cy="110" r="4" fill="#4a3828" />
        <circle cx="135" cy="110" r="4" fill="#4a3828" />
        <circle cx="88.5" cy="108.5" r="1.2" fill="#ffffff" opacity="0.8" />
        <circle cx="136.5" cy="108.5" r="1.2" fill="#ffffff" opacity="0.8" />
        <g fill="none" stroke="#c9b08a" strokeWidth="7">
          <rect x="68" y="96" width="38" height="28" rx="12" />
          <rect x="116" y="96" width="38" height="28" rx="12" />
          <path d="M106 108h10M68 104l-9-4M152 104l9-4" />
        </g>
        <g fill="none" stroke="#f5ead7" strokeWidth="3">
          <rect x="68" y="96" width="38" height="28" rx="12" />
          <rect x="116" y="96" width="38" height="28" rx="12" />
        </g>
        <path d="M110 116c-2 6-4 10-7 13" fill="none" stroke="#c98f79" strokeWidth="3" strokeLinecap="round" />
        <path d="M96 138c9 8 20 8 29 0" fill="none" stroke="#a35353" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/**
 * Robot amigable con laptop que acompaña el flyer.
 *
 * Igual que la persona, es un SVG inline para conservar el estilo ilustrado y
 * evitar depender de una imagen externa.
 */
function RobotFlyer() {
  return (
    <svg
      viewBox="0 0 320 280"
      className="home-flyer__robot-svg"
      role="img"
      aria-label="Robot amigable usando una laptop"
    >
      <defs>
        <linearGradient id="robotCabeza" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0fbff" />
          <stop offset="100%" stopColor="#9cd9ff" />
        </linearGradient>
        <linearGradient id="robotCuerpo" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#bfeeff" />
          <stop offset="100%" stopColor="#64b9f4" />
        </linearGradient>
        <linearGradient id="robotPantalla" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0b3c6e" />
          <stop offset="100%" stopColor="#041b3d" />
        </linearGradient>
      </defs>
      <ellipse cx="160" cy="252" rx="108" ry="18" fill="rgba(2,15,40,0.35)" />
      <line x1="160" y1="38" x2="160" y2="20" stroke="#9ee8ff" strokeWidth="5" />
      <circle cx="160" cy="16" r="8" fill="#9ee8ff" />
      <rect x="92" y="38" width="136" height="102" rx="30" fill="url(#robotCabeza)" stroke="#bfefff" strokeWidth="5" />
      <rect x="112" y="66" width="96" height="54" rx="20" fill="#06234a" />
      <circle cx="138" cy="92" r="8" fill="#7ef0ff" />
      <circle cx="182" cy="92" r="8" fill="#7ef0ff" />
      <path d="M142 108c10 8 26 8 36 0" fill="none" stroke="#7ef0ff" strokeWidth="5" strokeLinecap="round" />
      <rect x="74" y="148" width="172" height="72" rx="26" fill="url(#robotCuerpo)" stroke="#bfefff" strokeWidth="5" />
      <circle cx="160" cy="184" r="18" fill="#06234a" stroke="#7ef0ff" strokeWidth="4" />
      <path d="M160 174v20M150 184h20" stroke="#7ef0ff" strokeWidth="4" strokeLinecap="round" />
      <path d="M86 160c-26 10-38 28-40 50" fill="none" stroke="#bfefff" strokeWidth="14" strokeLinecap="round" />
      <path d="M234 160c26 10 38 28 40 50" fill="none" stroke="#bfefff" strokeWidth="14" strokeLinecap="round" />
      <path d="M32 230h256l-18 22H50z" fill="#d8f4ff" />
      <path d="M82 184h156l-16 46H98z" fill="url(#robotPantalla)" stroke="#7ef0ff" strokeWidth="5" />
      <path d="M110 196h100l-8 22H118z" fill="#7ef0ff" opacity="0.65" />
      <circle cx="160" cy="232" r="4" fill="#7ef0ff" />
    </svg>
  );
}

export default function Home() {
  const { autenticado, usuario } = useAuth();

  // La acción principal lleva al panel si ya hay sesión y a la turnera pública
  // si todavía no la hay. La secundaria invita a entrar o a mirar la turnera.
  const enlacePrincipal = autenticado ? '/dashboard' : '/turnera';
  const textoPrincipal = autenticado ? 'Ir al panel' : 'Conocer el sistema';
  const enlaceSecundario = autenticado ? '/turnera' : '/login';
  const textoSecundario = autenticado ? 'Ver turnera' : 'Ingresar';

  return (
    <div className="home">
      {/* Flyer principal: composición visual de la presentación. */}
      <section className="home-flyer">
        {/* La persona queda fuera del flujo para acompañar el logo arriba a la derecha. */}
        <div className="home-flyer__person">
          <PersonaFlyer />
        </div>

        <div className="home-flyer__top">
          <img
            src={logoBlanco}
            alt="SaludWEB PRO, sistema de gestión de salud"
            className="home-flyer__logo"
          />
        </div>

        <div className="home-flyer__main">
          <div className="home-flyer__content">
            <p className="home-flyer__kicker">
              {autenticado ? `Hola, ${usuario?.nombre}` : 'Sistema de gestión de salud'}
            </p>
            <h1>
              Salud <span>WEB</span> PRO
            </h1>
            <p className="home-flyer__slogan">¡Simplificá la gestión de tu consultorio!</p>

            {/* Funciones del flyer: se generan desde una lista para mantener el orden y el texto. */}
            <ul className="home-flyer__features" aria-label="Funciones del sistema">
              {FUNCIONES_FLYER.map((funcion) => (
                <li key={funcion}>
                  <span className="home-flyer__check" aria-hidden="true">✓</span>
                  {funcion}
                </li>
              ))}
            </ul>

            <div className="home-flyer__bottom">
              <div>
                <p className="home-flyer__cta-text">
                  ¡Conocé el sistema y empezá a optimizar tu tiempo hoy!
                </p>
                <div className="home-flyer__actions">
                  <Link to={enlacePrincipal} className="btn btn-light">
                    {textoPrincipal}
                  </Link>
                  <Link to={enlaceSecundario} className="btn btn-ghost">
                    {textoSecundario}
                  </Link>
                </div>
                <p className="home-flyer__credit">
                  Integrante: <strong>Ailen Quaglino Fail</strong>
                </p>
              </div>
            </div>
          </div>

          {/* El robot cierra la composición abajo a la derecha en escritorio. */}
          <div className="home-flyer__robot">
            <RobotFlyer />
          </div>
        </div>
      </section>

      {/* Indicadores rápidos que resumen el valor del sistema. */}
      <section className="home-strip" aria-label="Características del sistema">
        <div>
          <strong>24/7</strong>
          <span>Reserva en cualquier momento</span>
        </div>
        <div>
          <strong>1 agenda</strong>
          <span>Paciente y médico ven lo mismo</span>
        </div>
        <div>
          <strong>3 roles</strong>
          <span>Cada persona ve lo que le corresponde</span>
        </div>
        <div>
          <strong>0 instalación</strong>
          <span>Se usa desde el navegador</span>
        </div>
      </section>

      <section className="home-section home-section--split">
        <div className="home-section__head">
          <span className="home-kicker">El problema</span>
          <h2>Las turneras de siempre tienen los mismos problemas.</h2>
          <p>
            No es solo la espera: es la sensación de no saber si el turno quedó
            reservado, la agenda que se pisa y la información que se pierde entre
            una llamada y otra.
          </p>
        </div>

        <div className="home-grid home-grid--2">
          {PROBLEMAS.map((problema) => (
            <article className="home-problem" key={problema.titulo}>
              <span className="home-problem__number" aria-hidden="true">
                {problema.numero}
              </span>
              <h3>{problema.titulo}</h3>
              <p>{problema.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section home-section--soft">
        <div className="home-section__head home-section__head--center">
          <span className="home-kicker">La solución</span>
          <h2>Una sola agenda. Una sola verdad.</h2>
          <p>
            SaludWEB no agrega otra planilla: reemplaza el ida y vuelta por un
            circuito claro entre el paciente, el profesional y la administración.
          </p>
        </div>

        <div className="home-grid home-grid--3">
          {BENEFICIOS.map((beneficio) => (
            <article className="home-benefit" key={beneficio.titulo}>
              <span className="home-benefit__mark" aria-hidden="true">+</span>
              <h3>{beneficio.titulo}</h3>
              <p>{beneficio.texto}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-section">
        <div className="home-section__head home-section__head--center">
          <span className="home-kicker">Cómo funciona</span>
          <h2>Reservar un turno, en tres pasos.</h2>
          <p>
            El horario es el corazón de la experiencia: se elige una vez y queda
            confirmado para las dos partes.
          </p>
        </div>

        <ol className="home-steps">
          {PASOS.map((paso) => (
            <li className="home-step" key={paso.numero}>
              <span className="home-step__number" aria-hidden="true">{paso.numero}</span>
              <h3>{paso.titulo}</h3>
              <p>{paso.texto}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-section home-section--roles">
        <div className="home-section__head">
          <span className="home-kicker">Para cada rol</span>
          <h2>La misma información, con el acceso correcto.</h2>
          <p>
            El sistema no muestra todo a todos: cada cuenta entra con su rol y ve
            únicamente las acciones que puede realizar.
          </p>
        </div>

        <div className="home-grid home-grid--3">
          {ROLES.map((rol) => (
            <article className="home-role" key={rol.nombre}>
              <h3>{rol.nombre}</h3>
              <p>{rol.descripcion}</p>
              <Link to={rol.enlace} className="home-role__link">
                {rol.accion} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="home-cta">
        <img src={isotipo} alt="" className="home-cta__isotipo" aria-hidden="true" />
        <span className="home-kicker home-kicker--light">SaludWEB PRO</span>
        <h2>Menos vueltas para el paciente. Más claridad para el consultorio.</h2>
        <p>
          Probá el circuito completo: reservá un turno, miralo desde la agenda del
          médico y revisá el panorama desde el panel de administración.
        </p>
        <div className="home-actions home-actions--center">
          <Link to={enlacePrincipal} className="btn btn-light">
            {autenticado ? 'Ir al panel' : 'Empezar ahora'}
          </Link>
          <Link to={enlaceSecundario} className="btn btn-ghost">
            {autenticado ? 'Ver turnera' : 'Ingresar'}
          </Link>
        </div>
      </section>
    </div>
  );
}

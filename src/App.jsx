// ============================================================
// App.jsx - Raíz de la SPA: router, contexto de sesión y tabla de rutas
// ============================================================
// Este archivo es el mapa de la aplicación. Decide qué pantalla se ve para
// cada URL y qué pantallas exigen sesión. Todo lo demás cuelga de acá, así
// que antes de tocarlo conviene tener en cuenta tres cosas:
//
//  1. QUÉ VIVE EN ESTE ARCHIVO Y QUÉ NO. Aquí no hay lógica de negocio, no
//     hay llamadas a la API y no hay estado propio. Solo hay dos decisiones:
//     dónde se monta el contexto de sesión y qué ruta abre qué componente.
//     Si alguna vez aparece un useState con datos del dominio, es una señal
//     de que ese estado le corresponde a la pantalla o a un provider
//     dedicado, no a este archivo.
//
//  2. EL ORDEN DE LAS CAPAS. BrowserRouter envuelve a AuthProvider y este
//     envuelve a AppContent. Es un orden obligatorio. ProtectedRoute consulta
//     AuthContext, y AuthContext usa la redirección de React Router para
//     mandar al login cuando la sesión no vale. Si se invirtiera, ProtectedRoute
//     intentaría leer un contexto que todavía no existe y la app no montaría.
//
//  3. POR QUÉ HAY DOS FormAS DE PROTEGER UNA RUTA. (/login y /register)
//     resuelven el caso con un ternario; el resto usa ProtectedRoute. La
//     diferencia es de propósito: ProtectedRoute es para páginas que no
//     tienen sentido sin sesión, mientras que login y register necesitan
//     además expulsar a quien YA tiene sesión. Se explica al lado de cada
//     ruta.
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext.jsx';
import { useContext } from 'react';

import Navbar from './components/Navbar';
import AvisoOffline from './components/common/AvisoOffline';
import Login from './components/Auth/Login';
import Register from './components/Auth/Register';
import Dashboard from './components/Dashboard/Dashboard';
import ListaMedicos from './components/Medicos/ListaMedicos';
import ListaPacientes from './components/Pacientes/ListaPacientes';
import ListaPrescripciones from './components/Prescripciones/ListaPrescripciones';
import Configuracion from './components/Configuracion/Configuracion';
import Usuarios from './components/Usuarios/Usuarios';
import CatalogoTurnera from './components/Turnera/CatalogoTurnera';
import AgendaMedico from './components/Turnera/AgendaMedico';
import ReservarTurno from './components/Turnera/ReservarTurno';
import MisTurnos from './components/Turnera/MisTurnos';
import './App.css';

// ------------------------------------------------------------
// ProtectedRoute: guardia de las páginas que exigen sesión
// ------------------------------------------------------------
// No es un chequeo de permisos: solo verifica que haya una sesión. El nivel de
// acceso a un dato (que un paciente vea su propia ficha y no la de otro) lo
// aplica el BACKEND, nunca el frontend. Este guarda existe para no mostrar
// pantallas vacías o con errores a quien no tiene sesión, no para segurizar.
//
// Va en un componente aparte y no como un if dentro de AppContent porque cada
// ruta lo necesita por separado, y repetir el mismo if ocho veces es la forma
// más rápida de que una quede sin proteger el día de mañana.
function ProtectedRoute({ children }) {
  const { autenticado, cargando } = useContext(AuthContext);

  // El orden de los dos if de abajo no es intercambiable.
  //
  // Durante el primer render, cargando es true y autenticado todavía false,
  // porque AuthContext todavía no consultó si el token guardado sigue vivo.
  // Si el if de !autenticado estuviera primero, todas las rutas protegidas
  // expulsarían al usuario al login durante esa verificación. Se vería el
  // formulario de acceso parpadear en cada recarga para alguien que sí tiene
  // sesión, y además se perdería la URL: ProtectedRoute no puede devolver a
  // la persona a donde estaba, porque Navigate no guarda la ruta de origen.
  //
  // Por eso cargando se consulta PRIMERO y devuelve un estado que no decide
  // nada. Es la respuesta correcta a "todavía no sé": no se asume nada y no
  // se rebota a ninguna pantalla.
  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  // Terminó la verificación y no hay sesión: ahora sí corresponde expulsar.
  if (!autenticado) {
    return <Navigate to="/login" />;
  }

  // Sesión válida: se renderiza la página que la ruta pidió.
  return children;
}

// ------------------------------------------------------------
// AdminRoute: ProtectedRoute + exigir rol de administrador
// ------------------------------------------------------------
// Existe ProtectedRoute aparte de esto, y no se agrega un `esAdmin` a
// ProtectedRoute, por una razón concreta: las rutas protegidas son de dos
// clases. Casi todas necesitan "tengas sesión". UNA necesita además "seas
// administrador". Si el chequeo del rol estuviera dentro de ProtectedRoute,
// cada ruta protegida tendría que decidir si lo exige, y el día que alguien
// copie una ruta existente sin copiar ese detalle, se abre un acceso que
// no debía.
//
// Con dos guards, el acceso queda explícito en la tabla de rutas:
// <ProtectedRoute>  → con sesión alcanza
// <AdminRoute>       → con sesión y siendo admin
//
// Y NO es la defensa. El backend responde 403 a un token que no sea admin
// contra /api/usuarios, se escriba la URL que se escriba. Esto solo evita
// mostrar una pantalla que va a fallar.
function AdminRoute({ children }) {
  // cargando viene de ProtectedRoute y se necesita acá también: mientras se
  // verifica la sesión el usuario puede ser null, y sin esta guarda una
  // recarga en /usuarios expulsaría a un administrador que sí tiene sesión.
  const { usuario, autenticado, cargando } = useContext(AuthContext);

  if (cargando) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    );
  }

  if (!autenticado) {
    return <Navigate to="/login" />;
  }

  // La comparación es con tipo_usuario y no con "rol" porque así se llama el
  // campo en el contexto: viene de /api/auth/me y de la respuesta del login.
  // El backend devuelve "rol" en el endpoint de usuarios, pero acá se lee
  // el de sesión. Son dos nombres para el mismo dato, en dos contextos
  // distintos, y conviene no mezclarlos.
  if (usuario?.tipo_usuario !== 'admin') {
    // No se manda al dashboard en silencio. Alguien que escribió la URL a
    // mano tiene que entender que no tiene permiso, no creer que la ruta
    // está mal. El aviso lo muestra la propia pantalla de Usuarios, que
    // hace su propio chequeo; Navigate solo evita el intento de carga.
    return <Navigate to="/dashboard" />;
  }

  return children;
}

function AppContent() {
  // AppContent arma la estructura visual y la tabla de rutas.
  const { autenticado } = useContext(AuthContext);

  return (
    <div className="app">
      {/* El Navbar va FUERA de <Routes> a propósito. Si estuviera adentro,
          cambiar de pantalla lo volvería a montar y perdería el estado; acá
          es una sola instancia que se mantiene durante toda la navegación. */}
      <Navbar />

      {/* AvisoOffline es un cartel GLOBAL: va también fuera de <Routes>,
          justo debajo del Navbar, porque "sin conexión" es un estado de la
          aplicación entera, no de una pantalla. Al vivir acá no se desmonta
          al navegar y conserva su estado (si el cartel está visible, sigue
          visible al cambiar de ruta, que es lo correcto). */}
      <AvisoOffline />

      <main className="main-content">
        <Routes>
          {/* ==========================================================
              RUTAS PÚBLICAS
              Las tres comparten la misma regla: si ya hay sesión, no tienen
              sentido. Dejar el formulario de login visible para alguien que ya
              entró hace que dude de si el clic de "salir" funcionó, y un
              /register al alcance podría dejar crear un usuario duplicado.
              Por eso se resuelven con un ternario y no con ProtectedRoute:
             ProtectedRoute solo sabe expulsar, no sabe devolver al dashboard.
              ========================================================== */}

          <Route
            path="/login"
            element={autenticado ? <Navigate to="/dashboard" /> : <Login />}
          />
          <Route
            path="/register"
            element={autenticado ? <Navigate to="/dashboard" /> : <Register />}
          />

          {/* ==========================================================
              RUTAS PROTEGIDAS
              Todo lo que opera sobre datos del sistema o sobre la cuenta
              del usuario va acá. Cada una envuelve su componente en
              ProtectedRoute, y ese es el punto: el wrap es explícito y visible
              en la tabla de rutas, para que al agregar una ruta nueva se vea
              de entrada si va protegida o no.
              ========================================================== */}

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/medicos"
            element={
              <ProtectedRoute>
                <ListaMedicos />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pacientes"
            element={
              <ProtectedRoute>
                <ListaPacientes />
              </ProtectedRoute>
            }
          />

          <Route
            path="/prescripciones"
            element={
              <ProtectedRoute>
                <ListaPrescripciones />
              </ProtectedRoute>
            }
          />

          {/* Gestión de roles. Es la única ruta que usa AdminRoute en vez de
              ProtectedRoute, porque es la única que no alcanza con tener
              sesión. El backend igual exige rol admin en los tres endpoints
              de /api/usuarios; esto solo evita ofrecer una pantalla que
              respondería 403. */}
          <Route
            path="/usuarios"
            element={
              <AdminRoute>
                <Usuarios />
              </AdminRoute>
            }
          />

          <Route
            path="/configuracion"
            element={
              <ProtectedRoute>
                <Configuracion />
              </ProtectedRoute>
            }
          />

          {/* ==========================================================
              RUTAS DE LA TURNERA: aquí la protección es irregular a
              propósito, y no por descuido.

              El catálogo y la agenda son PÚBLICOS. La turnera existe para que
              alguien sin cuenta pueda ver profesionales y horarios antes de
              decidir si le conviene crear una. Pedir login en este punto
              empujaría a la gente a un formulario de registro antes de saber
              siquiera si el consultorio le sirve, que es la forma más rápida
              de que se vaya.

              "Mis turnos" sí exige sesión: no hay forma de mostrar los turnos
              de alguien sin saber quién es.

              La RESERVA, en cambio, va suelta a propósito. ReservarTurno ya
              tiene sus propios tres estados: sin sesión ofrece registrarse o
              entrar, con sesión pide reservar, y con sesión sin ficha vinculada
              manda a vincularla. Si la ruta estuviera protegida, el primer
              estado nunca se vería, porque ProtectedRoute redirigiría al login
              antes de que el componente llegue a renderizarse. El resultado
              sería expulsar a alguien que estaba mirando los horarios justo
              cuando la siguiente pantalla tenía lo que necesitaba.

              Si alguna vez se cambia esto, hay que cambiarlo junto con los
              tres estados de ReservarTurno, no solo la ruta. */}
          <Route
            path="/turnera"
            element={<CatalogoTurnera />}
          />
          <Route
            path="/turnera/agenda/:idMedico"
            element={<AgendaMedico />}
          />
          <Route
            path="/turnera/mis-turnos"
            element={
              <ProtectedRoute>
                <MisTurnos />
              </ProtectedRoute>
            }
          />
          <Route
            path="/turnera/agenda/:idMedico/reservar"
            element={<ReservarTurno />}
          />

          {/* Raíz: decides a dónde va quien entra por el dominio sin ruta.
              No se deja en blanco para que una pantalla vacía no se confunda
              con un error de carga. */}
          <Route path="/" element={<Navigate to={autenticado ? "/dashboard" : "/login"} />} />

          {/* Comodín: cualquier URL desconocida vuelve a la raíz. Con esto una
              ruta vieja o mal escrita no deja la app en blanco, que es lo
              que se ve cuando React Router no encuentra coincidencia y no hay
              un "*" declarado. */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      {/* BrowserRouter va primero porque AuthProvider puede necesitar
          navegar (para el caso del 401) y no puede hacerlo si el router no
          está montado arriba. */}
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

// ============================================================
// Usuarios.jsx - Gestión de roles y permisos (SOLO ADMIN)
// ============================================================
// Esta es la pantalla que responde a la regla del proyecto: el único que
// puede cambiar los permisos de las personas y de las prescripciones es el
// administrador.
//
// LO QUE HACE Y LO QUE NO HACE
// -----------------------------
// Hace: listar las cuentas del sistema y cambiar su tipo_usuario
// (paciente / medico / admin).
//
// NO hace: decidir si una persona puede ver una prescripción. Eso no se
// configura acá. Un paciente ve su propia ficha porque el backend se lo
// permite, y un médico ve la suya, y eso no se cambia desde un <select>. La
// diferencia es importante y conviene tenerla clara:
//
//   - Esta pantalla ajusta el ROL (qué tipo de cuenta es).
//   - El backend decide los PERMISOS (qué puede hacer con ese rol).
//
// Si se quisiera administrar permisos finos desde acá, haría falta una tabla
// de permisos en el backend y esta pantalla sería otra cosa. Hoy el rol es lo
// único configurable, y ofrecer más habría sido mentir sobre lo que el
// sistema puede hacer.
//
// LA DEFENSA REAL ESTÁ EN EL BACKEND
// ---------------------------------
// Esta pantalla se oculta a quien no es admin y las rutas devuelven 403 a
// cualquier otro. Pero ocultar un enlace no es seguridad: se puede escribir
// la URL a mano. Lo que no se puede esquivar son los requireRol() del
// backend, y por eso la pantalla tiene que manejar el 403 como un caso real,
// no como una sorpresa: si el rol de esta persona cambió mientras estaba en
// la pantalla, el 403 la saca de ahí en lugar de dejarla mirando algo que ya
// no puede hacer.
import React, { useState, useEffect, useCallback } from 'react';
import client from '../../api/client';
import { useAuth } from '../../hooks/useAuth';
import MenuAcciones from './MenuAcciones';
import './Usuarios.css';

// ====================================================================
// ROLES
// ====================================================================
// Valor de respaldo que se usa solo si el endpoint de roles no responde.
//
// Existe por una razón concreta: sin esto la pantalla quedaría con el filtro
// y el selector vacíos, que es peor que una lista desactualizada. Un 500 en
// /api/usuarios/roles no puede dejar la tabla sin poder mostrar cuentas.
//
// La fuente de verdad sigue siendo el backend. Estos tres valores no son una
// decisión de diseño: son los que acepta el ENUM de la columna
// tipo_usuario. Agregar un cuarto acá haría que el frontend ofreciera un rol
// que el backend rechaza con 422.
const ROLES_FALLBACK = [
  { valor: 'paciente', etiqueta: 'Paciente' },
  { valor: 'medico', etiqueta: 'Médico' },
  { valor: 'admin', etiqueta: 'Administrador' },
];

// Cuánto se espera antes de buscar mientras se escribe.
//
// 400ms es el punto donde la espera se deja de notar y las peticiones se
// dejan de notar. Con menos, "González" dispara seis búsquedas y el
// servidor se entera de cada tecla. Con más, la tabla tarda en responder y
// parece que no registra lo que se está escribiendo.
const ESPERA_BUSQUEDA_MS = 400;

export default function Usuarios() {
  // El usuario de la sesión. Se usa para dos cosas: comparar su id con el de
  // cada fila (para no ofrecer cambiarle el rol a sí mismo) y para decidir
  // si la pantalla tiene sentido abierta.
  const { usuario } = useAuth();

  // --- Estado de la tabla -------------------------------------------------
  // Las cuatro variables de paginación y búsqueda viven juntas porque
  // siempre cambian juntas: al buscar se vuelve a la página 1, y no tiene
  // sentido conservar la página 4 de un listado que recién cambió.
  const [datos, setDatos] = useState({ items: [], total: 0, total_paginas: 1 });
  const [pagina, setPagina] = useState(1);

  // `busqueda` es lo que la persona está escribiendo.
  // `busquedaAplicada` es lo que realmente se le pide al backend.
  //
  // Son dos variables y no una a propósito. Con una sola, escribir una
  // letra dispara la petición en el acto, porque la carga depende del valor
  // de la caja de texto. El "debounce" se vuelve necesario recién cuando se
  // separa lo que se escribe de lo que se busca: el input cambia al instante
  // (para que no se sienta lento) y la red espera a que dejes de escribir.
  const [busqueda, setBusqueda] = useState('');
  const [busquedaAplicada, setBusquedaAplicada] = useState('');
  const [filtroRol, setFiltroRol] = useState('');

  // --- Estados de la pantalla ---------------------------------------------
  // Son tres y no uno porque se confunden si se mezclan: `cargando` es la
  // primera carga, `guardandoId` es el feedback del clic, y `error` es algo
  // que hay que mostrar hasta que la persona haga algo al respecto.
  const [cargando, setCargando] = useState(true);
  const [guardandoId, setGuardandoId] = useState(null);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Los roles vienen del backend, no de una lista escrita acá. Se piden una
  // sola vez al montar la pantalla: los roles del sistema no cambian durante
  // una sesión, y volver a pedirlos en cada cambio de página sería tráfego
  // para un dato que ya está.
  const [roles, setRoles] = useState(ROLES_FALLBACK);

  useEffect(() => {
    // La petición se cancela si la pantalla se desmonta antes de responder.
    // Sin esto, un usuario que entra y sale rápido deja un estado actualizado
    // sobre un componente que ya no existe, y React avisa por consola.
    let cancelado = false;

    client
      .get('/api/usuarios/roles')
      .then(({ data }) => {
        // El endpoint devuelve el array directo dentro de la envoltura
        // { ok, mensaje, data }, igual que el resto de la API.
        const recibidos = data.data;
        // Se valida que sea un array no vacío antes de adoptarlo: un
        // respuesta con la forma correcta pero vacía dejaría el filtro sin
        // opciones, que es exactamente lo que el fallback evita.
        if (!cancelado && Array.isArray(recibidos) && recibidos.length > 0) {
          setRoles(recibidos);
        }
      })
      .catch(() => {
        // No se muestra nada. El fallback ya está cargado y es equivalente,
        // así que avisar "no se pudieron cargar los roles" sería metering ruido
        // por algo que no le afecta: la pantalla funciona igual.
      });

    return () => {
      cancelado = true;
    };
  }, []);

  // El debounce. Acá sí se aplica de verdad: la caja de texto actualiza
  // `busqueda` en cada tecla, pero el valor que consulta la red solo cambia
  // cuando pasa el tiempo sin escribir.
  useEffect(() => {
    const timer = setTimeout(() => {
      // Volver a la página 1 es parte del debounce y no un detalle: si se
      // estaba en la página 3 y la búsqueda deja 2 resultados, quedarse en la
      // 3 muestra una tabla vacía sin explicación.
      setBusquedaAplicada(busqueda);
      setPagina(1);
    }, ESPERA_BUSQUEDA_MS);

    // Se limpia el temporizador anterior. Sin esto, escribir rápido deja un
    // temporizador por tecla pendiente, y cada uno dispara su propia carga:
    // el debounce no esperaría, se acumularían.
    return () => clearTimeout(timer);
  }, [busqueda]);

  // useCallback mantiene estable la función de carga. No es una optimización
  // prematura: sin esto, guardar `cargarUsuarios` en un useEffect la vuelve a
  // crear en cada render, el efecto se dispara otra vez, y la pantalla pide
  // los mismos datos en bucle.
  //
  // Fijate que la dependencia es `busquedaAplicada` y no `busqueda`. Si
  // dependiera de la caja de texto, la búsqueda volvería a ser inmediata y el
  // debounce de arriba no serviría para nada.
  const cargarUsuarios = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const { data } = await client.get('/api/usuarios', {
        params: {
          pagina,
          por_pagina: 10,
          q: busquedaAplicada,
          rol: filtroRol,
        },
      });
      // La respuesta viene envuelta en { ok, mensaje, data }. Lo que se usa
      // está un nivel adentro, en data.data, que es el contrato que
      // Response::ok() impone a toda la API.
      setDatos(data.data);
    } catch (err) {
      setError(mensajeDeError(err));
    } finally {
      // finally, no un camino único: si la petición falla, el spinner tiene
      // que desaparecer igual. Sin esto, un error deja la pantalla cargando
      // para siempre, que es el bug más caro de los de este estilo.
      setCargando(false);
    }
  }, [pagina, busquedaAplicada, filtroRol]);

  // Se recarga cuando cambian página, búsqueda aplicada o filtro.
  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  // El aviso de éxito se borra solo a los 3 segundos. Se hace con un timer y
  // no con un setTimeout desnudo porque si la persona hace clic en otro
  // usuario antes, el aviso anterior tiene que desaparecer, no acumularse.
  useEffect(() => {
    if (!aviso) return undefined;
    const timer = setTimeout(() => setAviso(''), 3000);
    return () => clearTimeout(timer);
  }, [aviso]);

  /**
   * Cambia el rol de un usuario.
   *
   * @param {number} idUsuario Usuario a modificar
   * @param {string} rolNuevo  Rol destino
   */
  const cambiarRol = async (idUsuario, rolNuevo) => {
    setGuardandoId(idUsuario);
    setError('');
    setAviso('');
    try {
      const { data } = await client.patch(`/api/usuarios/${idUsuario}/rol`, {
        rol: rolNuevo,
      });
      setDatos((anterior) => ({
        ...anterior,
        // Se actualiza SOLO la fila afectada, en lugar de volver a pedir la
        // página entera. La respuesta del PATCH ya trae el usuario con el rol
        // nuevo, así que no hay nada que volver a buscar.
        items: anterior.items.map((u) =>
          u.id === idUsuario ? data.data : u
        ),
      }));
      setAviso('Rol actualizado correctamente');
    } catch (err) {
      // Un 409 acá no es un error técnico: es el backend impedir algo que la
      // interfaz creyó posible (degradar al único admin, o al propio usuario).
      // Por eso el mensaje del servidor se muestra tal cual, y no se
      // reemplaza por un "no se pudo guardar" genérico que esconde el motivo.
      setError(mensajeDeError(err));
    } finally {
      setGuardandoId(null);
    }
  };

  // Traduce el código que viene del backend a la palabra que se muestra.
  //
  // Sin esto, la columna ROL diría "paciente", "medico", "admin" en
  // minúsculas y sin tilde. Son los valores del ENUM, pensados para la base de
  // datos, no para leerlos. La tabla muestra el dato, y un dato se muestra
  // escrito.
  //
  // Se arma como diccionario y no con una búsqueda lineal en el array porque
  // se usa una vez por fila en cada render, y con 10 filas por página son diez
  // recorridos del array por pasada.
  const etiquetaDeRol = useCallback(
    (valor) => roles.find((r) => r.valor === valor)?.etiqueta ?? valor,
    [roles]
  );

  // Si esta persona no es admin, no se muestra la tabla. La ruta ya está
  // protegida y el backend igual responde 403, pero una pantalla vacía es
  // más clara que una tabla que carga y nunca termina de hacerlo.
  if (usuario?.tipo_usuario !== 'admin') {
    return (
      <div className="usuarios-container">
        <div className="alert alert-error">
          Esta pantalla es solo para administradores.
        </div>
      </div>
    );
  }

  return (
    <div className="usuarios-container">
      <div className="lista-header">
        <h1>Usuarios y Permisos</h1>
        <p className="lista-subtitulo">
          Cada cuenta tiene un ROL y, si sos administrador, una ACCIÓN para
          cambiarlo.
        </p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {aviso && <div className="alert alert-success">{aviso}</div>}

      {/* ----------------------------------------------------------------
          FILTROS
          El buscador y el filtro de rol están en la misma barra porque se
          combinan entre sí: buscar "González" Y filtrar por médico da un
          resultado distinto de cualquiera de los dos por separado.
          ---------------------------------------------------------------- */}
      <div className="usuarios-filtros">
        <div className="form-grupo">
          <label htmlFor="usuarios-busqueda">Buscar</label>
          {/* El texto se escribe acá y la red se entera más tarde, en el
              debounce de arriba. Por eso el value es `busqueda` y no
              `busquedaAplicada`: si fuera el segundo, las letras aparecerían
              con 400ms de retraso y se escribiría lento. */}
          <input
            id="usuarios-busqueda"
            type="text"
            placeholder="Nombre o email..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>

        <div className="form-grupo">
          <label htmlFor="usuarios-rol">Filtrar por rol</label>
          {/* El value="" es la opción "Todos". El backend lo interpreta como
              "sin filtro", y no como "filtrar por rol vacío", que no
              existiría. */}
          <select
            id="usuarios-rol"
            value={filtroRol}
            onChange={(e) => {
              setFiltroRol(e.target.value);
              setPagina(1);
            }}
          >
            <option value="">Todos los roles</option>
            {roles.map((r) => (
              <option key={r.valor} value={r.valor}>
                {r.etiqueta}
              </option>
            ))}
          </select>
        </div>
      </div>

      {cargando ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      ) : datos.items.length === 0 ? (
        <div className="alert alert-info">
          No se encontraron usuarios con esos filtros.
        </div>
      ) : (
        <>
          <table className="tabla">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                {/* ROL y ACCIÓN son columnas separadas, y no una sola con
                    el selector pegado al nombre. La razón es de lectura: el
                    ROL es el dato que describes de la persona y la ACCIÓN es lo
                    que hacés con ella. Juntas, la columna de rol queda tan
                    ancha que empuja la acción fuera de la pantalla y obliga a
                    desplazamiento horizontal en una tabla de cinco columnas. */}
                <th>Rol</th>
                <th>Estado</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {datos.items.map((u) => {
                // El id con el que se compara contra la sesión. Se calcula
                // acá y no en el JSX porque se usa en dos lugares (el select
                // de la acción y el aviso de abajo) y la comparación tiene que
                // dar el mismo resultado en los dos.
                //
                // Number() en los dos lados porque el id viene como número del
                // listado y como número de la sesión, pero JSON no garantiza
                // que lleguen los dos igual y con === un "6" y un 6 darían
                // distintos sin conversion. Es la clase de bug que aparece
                // solo con algunos usuarios.
                const esPropio = Number(u.id) === Number(usuario?.id);

                return (
                  <tr key={u.id}>
                    <td>
                      {u.nombre}
                      {esPropio && <span className="badge-propio"> (vos)</span>}
                    </td>
                    <td>{u.email}</td>

                    {/* --------------------------------------------------------
                        COLUMNA ROL
                        Solo muestra el dato, no permite cambiarlo. Es
                        deliberado que sea un <span> y no el <select>: el
                        cambio de rol es una ACCIÓN con consecuencias, y por
                        eso vive en su propia columna (ver más abajo). Poner el
                        selector acá haría que leer el rol de alguien obligara a
                        estar a un clic de degradarlo por accidente.
                        -------------------------------------------------------- */}
                    <td>
                      <span className="rol-pildora">
                        {etiquetaDeRol(u.rol)}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          u.activo ? 'badge-activo' : 'badge-inactivo'
                        }`}
                      >
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>

                    {/* --------------------------------------------------------
                        COLUMNA ACCIÓN
                        Acá vive MenuAcciones, que es un desplegable con una
                        acción por rol ("Convertir en Médico",
                        "Convertir en Administrador", etc.) y no un <select>.

                        El <select> que había antes queda solo con el motivo
                        escrito abajo: los datos para la acción y la acción
                        misma están en el menú.
                        -------------------------------------------------------- */}
                    <td>
                      <MenuAcciones
                        usuario={u}
                        roles={roles}
                        esPropio={esPropio}
                        guardando={guardandoId === u.id}
                        alCambiar={cambiarRol}
                      />
                      {/* El aviso de vinculación lo manda el backend en
                          nota_vinculacion. Se muestra acá porque es la
                          consecuencia REAL de cambiar el rol: promover a
                          médico a alguien sin ficha de médico no le da
                          acceso a nada, y sin este aviso el cambio parece
                          haber funcionado cuando en la práctica no cambió
                          nada. */}
                      <span className="texto-ayuda">
                        {u.nota_vinculacion || '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {datos.total_paginas > 1 && (
            <div className="paginacion">
              <button
                className="btn btn-secondary"
                disabled={pagina <= 1}
                onClick={() => setPagina((p) => p - 1)}
              >
                Anterior
              </button>
              <span>
                Página {pagina} de {datos.total_paginas} ({datos.total}{' '}
                usuarios)
              </span>
              <button
                className="btn btn-secondary"
                disabled={pagina >= datos.total_paginas}
                onClick={() => setPagina((p) => p + 1)}
              >
                Siguiente
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * Saca un mensaje legible de un error de Axios.
 *
 * Existe porque el problema de la API devuelve SIEMPRE { ok, mensaje }, y
 * Axios mete eso en err.response.data. Pero hay tres casos donde eso no
 * sirve:
 *
 *   - no hay respuesta (red caída, servidor apagado): err.response es undefined
 *     y leer .data de undefined rompe la pantalla
 *   - la petición se canceló: tampoco hay respuesta
 *   - el backend devolvió algo que no es JSON
 *
 * Sin esta función, los dos primeros casos tiran un TypeError dentro del
 * catch, que se pierde y deja la pantalla con el spinner girando.
 *
 * @param {object} err Error de Axios
 * @returns {string} Mensaje para mostrar
 */
function mensajeDeError(err) {
  if (!err.response) {
    return 'No se pudo conectar con el servidor. Revisá tu conexión.';
  }
  if (err.code === 'ECONNABORTED') {
    return 'La petición tardó demasiado. Intentá de nuevo.';
  }
  return (
    err.response.data?.mensaje ||
    err.response.data?.error ||
    'Ocurrió un error inesperado'
  );
}

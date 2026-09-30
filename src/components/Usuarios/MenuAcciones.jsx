// ============================================================
// MenuAcciones.jsx - Desplegable de acciones por usuario
// ============================================================
// Es el control de la columna ACCIÓN de la pantalla de Usuarios.
//
// QUÉ LO MOTIVÓ
// -------------
// Antes, cambiar el rol se hacía con un <select> que tenía las tres opciones
// y nada más. Funcionaba, pero no era un menú de acciones: era un campo de
// formulario con tres valores posibles, y se leía como tal.
//
// La diferencia importa acá por una razón concreta. Un <select> dice "elegí
// un valor". Un menú de acciones dice "podés hacer esto". Cuando lo que se
// elige tiene consecuencias —darle administrador a alguien, Sacarle
// permisos— lo que uno quiere ver antes de apretar es la ACCIÓN, no el dato.
//
// Con el menú, cada opción es una frase con verbo y consecuencia:
//
//   "Convertir en Médico"        en vez de  "medico"
//   "Convertir en Administrador" en vez de  "admin"
//
// "Convertir en Administrador" se entiende sin saber qué es un rol, y sobre
// todo avisa: acá se le están dando permisos a otra persona.
//
// LO QUE NO HACE
// --------------
// No inventa acciones. El backend solo expone PATCH /api/usuarios/{id}/rol,
// así que las únicas acciones reales son cambiar el rol. No hay "Desactivar
// cuenta" ni "Ver ficha" porque no existe endpoint para eso, y poner un botón
// que devuelve un 404 es peor que no ponerlo.
//
// QUÉ SE HIZO CON LAS DEMÁS ACCIONES
// -----------------------------------
// Lo que antes estaba repartido en varias columnas ahora está junto:
//
//   - El ROL que tiene la persona, como dato, en la columna ROL.
//   - Lo que se le puede hacer a esa persona, en el desplegable de ACCIÓN.
//   - Por qué una acción no se puede usar, escrito adentro del menú.
//
// Antes el <select> estaba en la columna "Rol", al lado del estado. Se leía
// como que el rol era editable ahí, cuando en realidad lo que se editaba era
// otra cosa.
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ------------------------------------------------------------
// ESTADOS Y PROPS
// ------------------------------------------------------------

/**
 * @param {object}   props
 * @param {object}   props.usuario    Fila que se está mostrando
 * @param {Array}    props.roles      Roles permitidos, desde la API
 * @param {boolean}  props.esPropio   Si la cuenta es la de quien mira
 * @param {boolean}  props.guardando  Si esta fila se está guardando ahora
 * @param {Function} props.alCambiar  Callback (idUsuario, rolNuevo) => void
 */
export default function MenuAcciones({ usuario, roles, esPropio, guardando, alCambiar }) {
  // Si el menú está abierto. Un solo booleano porque el menú tiene dos
  // estados, no tres: abierto o cerrado.
  const [abierto, setAbierto] = useState(false);

  // Referencia al <div> que envuelve todo, para detectar los clics de afuera.
  // Se usa una ref y no un id o un querySelector porque el componente puede
  // aparecer muchas veces en la misma pantalla y un id tendría que ser único.
  const contenedor = useRef(null);

  // El botón que abre el menú, para devolverle el foco cuando se cierra con
  // Escape. Sin esto, el foco se pierde en el cuerpo de la página y alguien
  // que navega con teclado tiene que empezar de nuevo desde arriba.
  const boton = useRef(null);

  // ------------------------------------------------------------
  // CERRAR AL HACER CLIC AFUERA
  // ------------------------------------------------------------
  // Se registra en el documento y no en el contenedor porque el clic que
  // cierra el menú muchas veces es sobre otro elemento: si se escuchara
  // solamente adentro, nunca se cerraría.
  useEffect(() => {
    if (!abierto) {
      return undefined;
    }

    const alHacerClic = (evento) => {
      // contains() en vez de comparar con el id: cubre también los clics en
      // los hijos, que es donde caería el clic en un botón del menú.
      if (contenedor.current && !contenedor.current.contains(evento.target)) {
        setAbierto(false);
      }
    };

    document.addEventListener('mousedown', alHacerClic);
    return () => document.removeEventListener('mousedown', alHacerClic);
  }, [abierto]);

  // ------------------------------------------------------------
  // CERRAR CON ESCAPE
  // ------------------------------------------------------------
  // Escape es la tecla que se espera para "salir de lo que estás", y sin
  // esto un menú desplegado no se puede cerrar sin llegar al mouse.
  useEffect(() => {
    if (!abierto) {
      return undefined;
    }

    const alPulsar = (evento) => {
      if (evento.key === 'Escape') {
        setAbierto(false);
        // El foco vuelve al botón que abrió el menú. Sin esta línea, el menú
        // se cierra pero el foco queda en un elemento que ya no existe, y la
        // persona de teclado queda sin saber dónde está.
        boton.current?.focus();
      }
    };

    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, [abierto]);

  // ------------------------------------------------------------
  // ACCIONES
  // ------------------------------------------------------------
  /**
   * Ejecuta una acción y cierra el menú.
   *
   * Se cierra siempre, incluso si la acción falla. Si el menú quedara abierto
   * con un error arriba, la persona vería el mismo menú sobre un mensaje de
   * error, que es ruido. El error se muestra igual, más arriba.
   *
   * @param {string} rolNuevo Rol destino
   */
  const ejecutar = useCallback(
    (rolNuevo) => {
      setAbierto(false);
      alCambiar(usuario.id, rolNuevo);
    },
    [alCambiar, usuario.id]
  );

  // El nombre de la acción para un rol. Se arma acá y no en el <option> como
  // antes porque cada opción necesita un texto distinto ("Convertir en
  // Médico") del que se necesita para el valor ("medico").
  const textoAccion = (rol) => `Convertir en ${rol.etiqueta}`;

  // ------------------------------------------------------------
  // CASOS SIN ACCIONES
  // ------------------------------------------------------------
  // La cuenta propia no se puede cambiar a sí misma, y el backend lo rechaza
  // con 409. En vez de mostrar un menú que no tiene nada adentro, se dice por
  // qué no se puede. Un control deshabilitado sin explicación obliga a adivinar
  // si el sistema falló o si la regla es esa.
  if (esPropio) {
    return (
      <span className="texto-ayuda">
        No podés cambiar tu propio rol
      </span>
    );
  }

  // ------------------------------------------------------------
  // GUARDANDO
  // ------------------------------------------------------------
  // Mientras se guarda, el botón se ve ocupado. No se deshabilita el menú
  // entero: el resto de la tabla sigue andando, y el cambio de esta fila es
  // el único que espera.
  if (guardando) {
    return <span className="texto-guardando">Guardando...</span>;
  }

  return (
    <div className="menu-acciones" ref={contenedor}>
      <button
        ref={boton}
        type="button"
        className="btn btn-sm btn-info"
        onClick={() => setAbierto((v) => !v)}
        // aria-haspopup y aria-expanded le dicen a un lector de pantalla que
        // este botón abre algo y si está abierto ahora. Sin los dos, el menú
        // aparece de la nada y no hay forma de saber que se cerró.
        aria-haspopup="menu"
        aria-expanded={abierto}
        // aria-controls empareja el botón con la lista del menú. Necesita un
        // id, y por eso se compone con el id del usuario: si dos filas
        // tuvieran el mismo id, un lector de pantalla no podría saber cuál
        // menú pertenece a cuál botón.
        aria-controls={`menu-acciones-${usuario.id}`}
      >
        Acciones ▾
      </button>

      {abierto && (
        <ul className="menu-acciones-lista" id={`menu-acciones-${usuario.id}`} role="menu">
          {roles.map((rol) => {
            // El rol que ya tiene se muestra, pero no se puede elegir. Se
            // deshabilita en vez de ocultarse para que quede claro que la
            // acción existe y que ya está hecha.
            const esElActual = rol.valor === usuario.rol;

            return (
              <li key={rol.valor} role="none">
                <button
                  type="button"
                  role="menuitem"
                  className="menu-acciones-item"
                  // Solo se deshabilita el rol actual. No hay una condición
                  // de "sin cambios pendientes" como había antes: en un menú
                  // cada opción es una acción y una acción sobre el estado
                  // actual no es una acción.
                  disabled={esElActual}
                  onClick={() => ejecutar(rol.valor)}
                >
                  {esElActual ? (
                    <>
                      {/* El "(vos)" se pone acá, al lado, y no en el texto de
                          la acción, para que el código del rol siga siendo
                          "Convertir en Médico" y no cambie según la fila. */}
                      {textoAccion(rol)}{' '}
                      <span className="menu-acciones-actual">(ya es su rol)</span>
                    </>
                  ) : (
                    textoAccion(rol)
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

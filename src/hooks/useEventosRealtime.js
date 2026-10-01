import { useEffect, useRef, useState, useCallback } from 'react';
// Hooks de React. useEffect es el que maneja el ciclo de vida de la
// suscripción, useState guarda el estado de conexión para poder mostrarlo, y
// useRef guarda valores que NO deben provocar un re-render.

import { suscribirseAlCanal, TIPOS_EVENTO } from '../api/realtime';
// Importa el wrapper de SSE. El componente nunca toca EventSource directamente:
// esa lógica queda en un archivo y no se reparte por todos los componentes.

/**
 * Hook que escucha el canal de tiempo real de un componente.
 *
 * POR QUÉ EXISTE ESTE HOOK Y NO USAR EventSource EN EL COMPONENTE
 * --------------------------------------------------------------
 * Abrir un canal desde un componente se hace en tres líneas, pero cerrarlo
 * bien es lo que complica. Si el componente se desmonta y no cierra el canal,
 * el navegador sigue recibiendo eventos de una pantalla que ya no existe, el
 * backend mantiene un proceso de PHP vivo por cada pestaña cerrada, y el
 * próximo error es "la web se froze cuando abro el panel". Ese tipo de problema
 * es muy difícil de encontrar después, porque funciona en las pruebas (donde el
 * componente se monta una vez) y falla en el uso real (donde el usuario navega).
 *
 * Este hook resuelve el ciclo de vida completo: abre al montar y CIERRA al
 * desmontar, sin que el componente tenga que acordarse.
 *
 * @param {string} canal          Canal declarativo: tablero | mis-turnos | mi-agenda
 * @param {Function} alRecibir    Se llama con (tipo, datos) por cada evento
 * @param {boolean} activo         Si es false, no se abre el canal (pausa)
 * @returns {{estado: string, ultimoEvento: object|null, reconectar: Function}} Estado del canal
 */
export default function useEventosRealtime(canal, alRecibir, activo = true) {
  // Estado de la conexión. Se guarda en state y no en una variable normal
  // porque la interfaz lo muestra ("En vivo", "Reconectando..."): si fuera una
  // variable común, el cartel no se actualizaría al cambiar la conexión.
  const [estado, setEstado] = useState('inactivo');
  // 'inactivo' | 'conectando' | 'conectado' | 'reconectando' | 'cerrado' | 'sin-sesion'

  // Último evento recibido. Se usa para mostrar "hace un momento hubo un
  // cambio", que es información útil para el usuario: le confirma que el canal
  // está funcionando y no freezing.
  const [ultimoEvento, setUltimoEvento] = useState(null);

  // Referencia al callback del componente.
  //
  // ESTE ES EL DETALLE QUE HACE QUE NO SE REPITA LA SUSCRIPCIÓN
  // ------------------------------------------------------
  // Si el efecto dependiera directamente de alRecibir, y el componente le pasa
  // una función nueva en cada render (que es lo normal, porque las funciones
  // inline como () => cargarDatos() se recrean siempre), el efecto se
  // desarmaría y se volvería a armar en cada render: la suscripción se
  // cerraría y se abriría sin parar, subiendo y bajando el canal decenas de
  // veces por minuto.
  //
  // Guardar la función en un useRef y usar una versión estable en el efecto
  // rompe esa dependencia: el canal se abre UNA vez y el callback siempre
  // apunta a la versión más reciente.
  const refCallback = useRef(alRecibir);

  useEffect(() => {
    refCallback.current = alRecibir;
  }, [alRecibir]);
  // Cada vez que el componente pasa una función nueva, se actualiza la
  // referencia. No abre ni cierra nada.

  // Similar para el canal: si cambia el canal (por ejemplo, el usuario pasa
  // de "tablero" a "mi-agenda"), hay que reabrir la suscripción.
  const refCanal = useRef(canal);
  useEffect(() => {
    refCanal.current = canal;
  }, [canal]);

  // Referencia al objeto de control del canal (el que trae cerrar() y
  // reconectar()). Existe para que la función reconectar() de más abajo pueda
  // llegar al canal abierto.
  const refControl = useRef(null);

  // El callback que realmente usa el efecto. Es estable porque no depende de
  // nada que cambie: siempre llama a la referencia, que apunta a lo último.
  const manejarEvento = useCallback((tipo, datos) => {
    refCallback.current?.(tipo, datos);
    setUltimoEvento({ tipo, datos, momento: Date.now() });
  }, []);

  const manejarEstado = useCallback((nuevoEstado) => {
    setEstado(nuevoEstado);
  }, []);

  // --------------------------------------------------
  // La suscripción en sí
  // --------------------------------------------------
  useEffect(() => {
    // Si el componente se monta pero todavía no tiene que escuchar (activo es
    // false), no se abre nada. Sirve para no gastar un canal del servidor en
    // una pantalla que está oculta o en una vista que todavía no cargó datos.
    if (!activo || !canal) {
      setEstado('inactivo');
      return undefined;
    }

    const control = suscribirseAlCanal({
      canal,
      alRecibir: manejarEvento,
      alCambiarEstado: manejarEstado,
    });

    // Se guarda el control en una referencia para que la función reconectar()
    // de más abajo pueda invocarlo. Va en un useRef y no en un useState a
    // propósito: guardar el objeto de control en el estado provocaría un
    // re-render en el momento exacto en que se abre la conexión, y ese render
    // dispararía el efecto otra vez (porque controlRef es una dependencia),
    // que cerraría y reabriría el canal. Un ciclo así se repite hasta que la
    // página se cuelga. Es el mismo tipo de error que produce un useEffect mal
    // construido: poner en las dependencias algo que el propio efecto define.
    refControl.current = control;

    // ESTA línea es la que evita la fuga de memoria.
    //
    // Lo que devuelve useEffect se ejecuta cuando el componente se desmonta o
    // cuando las dependencias cambian antes. Sin este return, el canal seguiría
    // abierto para siempre: el componente desaparece de la pantalla pero la
    // conexión sigue viva, recibiendo eventos y guardándolos en estado de un
    // componente que React ya no está pintando.
    return () => {
      control.cerrar();
      refControl.current = null;
    };
    // Dependencias: el canal, el flag activo y los dos manejadores (que son
    // estables). alRecibir NO entra a propósito, por lo que se explica arriba.
  }, [canal, activo, manejarEvento, manejarEstado]);

  // --------------------------------------------------
  // Reconexión manual
  // --------------------------------------------------
  // Se expone como función estable. No se guarda en un estado porque eso
  // provocaría un re-render en cada apertura del canal, y los componentes que
  // reciben esta función a través de props se re-pintarían sin necesidad.
  const reconectar = useCallback(() => {
    refControl.current?.reconectar();
  }, []);
  // El array de dependencias vacío es correcto acá: la función no depende de
  // nada que cambie, solo del ref, que es estable por definición.

  return {
    estado,
    ultimoEvento,
    reconectar,
    // Los tipos se re-exportan desde acá para que el componente que usa el
    // hook no tenga que importar de dos archivos distintos. Menos imports
    // significa menos chances de importar el tipo equivocado.
    TIPOS_EVENTO,
  };
}
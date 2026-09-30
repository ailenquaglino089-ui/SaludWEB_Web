// ============================================================
// AvisoOffline.jsx - Aviso global de "sin conexión"
// ============================================================
// Un cartel fijo arriba de todo que avisa cuando NO hay conexión.
// Se monta una sola vez en App.jsx, por encima de las rutas, porque el
// estado no pertenece a ninguna pantalla: si estás sin red, eso se nota en
// todas (listados, turnos, reservas) y cada pantalla avisándolo por su lado
// sería cacofonía.
//
// DE DÓNDE SALE EL ESTADO (dos fuentes, a propósito):
//   1. Los eventos del navegador "online"/"offline". Son la señal de que la
//      red del dispositivo cambió, pero no alcanza: no detectan que el
//      SERVIDOR esté caído ni que un proxy corte la ruta.
//   2. El cliente API (src/api/client.js). Cuando una petición falla SIN
//      respuesta (servidor inalcanzable, timeout, DNS rota) dispara el evento
//      "saludweb:sin-conexion", y cada respuesta exitosa dispara
//      "saludweb:con-conexion". Con eso el cartel aparece aunque el
//      navegador siga diciendo "online", y se limpia solo en cuanto una
//      petición vuelve a funcionar.
//
// POR QUÉ ES UN CARTEL FIJO Y NO UN TOAST:
//   El toast es para eventos puntuales (se creó el médico, se guardó).
//   Estar sin red es un ESTADO, no un evento: puede durar minutos, y una
//   notificación que se auto-oculta en 3 segundos no alcanza a explicar por
//   qué la tabla quedó vacía o por qué el guardado "no hizo nada". Un cartel
//   persistente con aria-live sigue ahí mientras dure el problema.
import React, { useEffect, useState } from 'react';
import './AvisoOffline.css';

// Nombre del evento que el cliente API usa para avisar de una caída de red.
// Se declara acá como constante para no escribirlo con errores de tipeo en
// dos archivos (la regla de una sola fuente de verdad para los nombres que
// viajan por el navegador).
const EVENTO_SIN_CONEXION = 'saludweb:sin-conexion';
const EVENTO_CON_CONEXION = 'saludweb:con-conexion';

export default function AvisoOffline() {
  // ¿Estamos sin conexión? Se inicializa con el valor real del navegador
  // (si la app arrancó sin red, el cartel aparece desde el primer render, no
  // recién cuando falle la primera petición).
  const [sinConexion, setSinConexion] = useState(() => !navigator.onLine);
  // ¿El usuario cerró el cartel con la ✕? Se vuelve a mostrar si vuelve a
  // detectarse una caída: el cierre es un "ya lo vi", no un "no me avises más".
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    // La sesión del navegador dijo "la red volvió": el cartel desaparece.
    const volverOnline = () => setSinConexion(false);
    // El navegador detectó que perdimos la red (avión, WiFi fuera): aparece.
    const perderOnline = () => setSinConexion(true);

    // Una petición de la API falló sin respuesta del servidor.
    const falloDeApi = () => {
      setSinConexion(true);
      setOculto(false); // Suma una caída nueva: el cierre previo no aplica.
    };
    // Una petición de la API respondió: hay camino que funciona, se limpia.
    const exitoDeApi = () => setSinConexion(false);

    // "online"/"offline" son eventos del WINDOW, no de window.navigator.
    window.addEventListener('online', volverOnline);
    window.addEventListener('offline', perderOnline);
    // Los eventos de la API también van en el window: es el "reloj" común
    // que todas las pestañas (o esta) comparten por defecto.
    window.addEventListener(EVENTO_SIN_CONEXION, falloDeApi);
    window.addEventListener(EVENTO_CON_CONEXION, exitoDeApi);

    // Cleanup: al desmontar el componente se quitan TODOS los listeners.
    // Si no se hiciera, el cartel seguiría recibiendo eventos con el
    // componente ya fuera del DOM (el "Sin conexión" de una app que se
    // desmontó no se le muestra a nadie, pero es mal hábito igual).
    return () => {
      window.removeEventListener('online', volverOnline);
      window.removeEventListener('offline', perderOnline);
      window.removeEventListener(EVENTO_SIN_CONEXION, falloDeApi);
      window.removeEventListener(EVENTO_CON_CONEXION, exitoDeApi);
    };
  }, []);

  // Sin problema de conexión, o el usuario ya lo cerró: no se renderiza nada.
  if (!sinConexion || oculto) return null;

  return (
    // role="alert" con aria-live: los lectores de pantalla anuncian el cambio
    // de estado (que ES la información: "ahora estás offline").
    <div className="aviso-conexion" role="alert">
      <span className="aviso-conexion-icono" aria-hidden="true">📡</span>
      <span className="aviso-conexion-texto">
        Sin conexión. Los datos podrían no actualizarse y los cambios no llegan al servidor.
      </span>
      {/* Botón para cerrar el cartel (no es un error que bloquee la app). */}
      <button
        className="aviso-conexion-cerrar"
        onClick={() => setOculto(true)}
        aria-label="Cerrar aviso de conexión"
      >
        ✕
      </button>
    </div>
  );
}
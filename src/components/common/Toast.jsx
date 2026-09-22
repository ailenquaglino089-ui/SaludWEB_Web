// Importamos React y el hook useEffect para el auto-ocultamiento de los toasts.
import React, { useEffect } from 'react';
// Importamos los estilos propios del toast.
import './Toast.css';

// Notificación flotante (toast) reutilizable (guía CRUD: "Sistema Centralizado de Notificaciones").
// Representa mostrarMensaje(tipo, texto): un único componente que se reutiliza
// desde cualquier operación (crear, editar, eliminar) peda dar feedback claro.
// Tipos: 'exito' (verde), 'error' (rojo) e 'info' (azul).
// Los toasts de éxito/info se ocultan solos (duracion ms); los de error quedan
// hasta que el usuario los cierre (guía: errores que requieren acción del usuario).
// Props:
//  - tipo: 'exito' | 'error' | 'info'
//  - texto: mensaje a mostrar (vacío = no se renderiza nada)
//  - onCerrar: se llama al auto-ocultarse o al tocar la ✕
//  - duracion: milisegundos que permanece un toast efímero (por defecto 3000)
export default function Toast({ tipo = 'info', texto = '', onCerrar, duracion = 3000 }) {
  // Efecto que programa el auto-ocultamiento de los toasts temporales.
  useEffect(() => {
    // Si no hay mensaje, no hay nada que temporizar.
    if (!texto) return undefined;
    // Un error debe permanecer hasta que el usuario actúe: no lo ocultamos solo.
    if (tipo === 'error') return undefined;
    // setTimeout programa el cierre automático; clearTimeout lo cancela si cambia el mensaje.
    const timer = setTimeout(onCerrar, duracion);
    // Limpieza: si el toast cambia o se desmonta, se cancela el timer pendiente.
    return () => clearTimeout(timer);
  }, [texto, tipo, onCerrar, duracion]); // Dependencias: se re-programa solo si cambian

  // Sin mensaje no se renderiza nada (evita un cuadro vacío flotando).
  if (!texto) return null;

  return (
    // El rol "status" le avisa a los lectores de pantalla que hay un mensaje temporar.
    <div className={`toast toast--${tipo}`} role="status">
      {/* Texto del mensaje */}
      <span className="toast-texto">{texto}</span>
      {/* Botón para cerrar manualmente (útil sobre todo en errores) */}
      <button className="toast-cerrar" onClick={onCerrar} aria-label="Cerrar notificación">✕</button>
    </div>
  );
}
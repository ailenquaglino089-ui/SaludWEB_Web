/**
 * Utilidades comunes para operaciones CRUD
 * Reutilizable en componentes de Médicos, Pacientes y Prescripciones
 * Este módulo concentra helpers que estandarizan el manejo de errores, el formateo de fechas
 * y la presentación de estados, para no repetir lógica en cada componente de listado/ABM
 */

export const handleApiError = (error) => {
  // handleApiError: traduce un error de Axios a un mensaje legible para el usuario (se usa en los bloques catch de los CRUD)
  if (error.response) {
    // Caso 1: el servidor respondió, pero con un estado HTTP de error (4xx/5xx)
    // Error del servidor (formato API: { ok: false, mensaje, errores })
    const data = error.response.data;
    // data: cuerpo de la respuesta de error enviada por la API backend
    if (data?.mensaje) {
      // Si la API envió un mensaje de error propio (formato estándar del backend)...
      const detalle = Array.isArray(data.errores) && data.errores.length
        // Se verifica si también vienen errores de validación en un arreglo "errores" no vacío...
        ? ` (${data.errores.join(', ')})`
        // ...si existen, se agregan como detalle entre paréntesis y separados por comas
        : '';
      // ...si no hay errores de validación, el detalle queda como string vacío
      return data.mensaje + detalle;
      // Retorna el mensaje principal concatenado con el detalle de validaciones (mensaje completo)
    }
    return data?.message || data?.error || error.response.statusText;
    // Si la API no envió "mensaje", se busca en otras claves ("message"/"error"); si nada, se usa el statusText HTTP
  } else if (error.request) {
    // Caso 2: la petición se envió, pero NO hubo respuesta (servidor caído, sin red, timeout)
    // No hay respuesta del servidor
    return "Sin conexión al servidor";
    // Mensaje claro y orientado al usuario final: no llega a existir una respuesta del backend
  } else {
    // Caso 3: el error ocurrió antes de enviarse la petición (error de configuración del cliente, etc.)
    return error.message;
    // Se devuelve el mensaje nativo de JavaScript del error (información técnica del cliente)
  }
};

// Desenvuelve el payload de la API ({ ok, mensaje, data }) retornando el recurso
export const getDatos = (response, porDefecto = null) => response?.data?.data ?? porDefecto;
// getDatos: accede a la respuesta de Axios, extrae "data" de la API y devuelve el recurso en .data; si falta, usa porDefecto (nullable) evita errores con respuestas inesperadas

export const formatDate = (dateString) => {
  // formatDate: convierte una fecha ISO (string) a formato corto día/mes/año legible en español
  const date = new Date(dateString);
  // Crea un objeto Date de JavaScript a partir del string que envía la API
  return date.toLocaleDateString('es-ES', {
    // toLocaleDateString: formatea la fecha según la configuración regional española
    year: 'numeric',
    // Muestra el año en cuatro dígitos (por ejemplo, 2026)
    month: '2-digit',
    // Mes en dos dígitos (por ejemplo, "03" en lugar de "marzo")
    day: '2-digit'
    // Día en dos dígitos (por ejemplo, "05")
  });
};

export const formatDateTime = (dateString) => {
  // formatDateTime: igual que formatDate, pero incluyendo además la hora y los minutos
  const date = new Date(dateString);
  // Crea un objeto Date de JavaScript a partir del string de fecha-hora de la API
  return date.toLocaleString('es-ES', {
    // toLocaleString: formatea fecha Y hora según la configuración regional española
    year: 'numeric',
    // Año en cuatro dígitos
    month: '2-digit',
    // Mes en dos dígitos
    day: '2-digit',
    // Día en dos dígitos
    hour: '2-digit',
    // Hora en formato de dos dígitos
    minute: '2-digit'
    // Minutos en formato de dos dígitos
  });
};

export const getStatusColor = (status) => {
  // getStatusColor: devuelve un color HEX según el estado del registro (para pintar insignias/badges)
  const colors = {
    // Mapa de estados posibles a colores (diccionario clave -> valor)
    activa: '#4CAF50',      // Verde
    // Estado "activa" (prescripción vigente): verde
    vencida: '#FF9800',     // Naranja
    // Estado "vencida": naranja (avisa que expiró)
    dispensada: '#2196F3',  // Azul
    // Estado "dispensada": azul
    cancelada: '#f44336',   // Rojo
    // Estado "cancelada": rojo (destaca lo anulado)
    activo: '#4CAF50',
    // Estado "activo" (p.ej. médico): verde
    inactivo: '#999'
    // Estado "inactivo": gris
  };
  return colors[status] || '#999';
  // Busca el color en el mapa; si el estado no está contemplado, usa gris por defecto (#999)
};

export const getStatusBadge = (status) => {
  // getStatusBadge: devuelve el texto (con ícono) que se muestra como etiqueta según el estado
  const badges = {
    // Mapa de estados posibles a textos/badges legibles (diccionario clave -> valor)
    activa: '✓ Activa',
    // Prescripción activa: "✓ Activa"
    vencida: '⚠ Vencida',
    // Prescripción vencida: "⚠ Vencida"
    dispensada: '✓ Dispensada',
    // Prescripción dispensada: "✓ Dispensada"
    cancelada: '✗ Cancelada',
    // Prescripción cancelada: "✗ Cancelada"
    activo: '✓ Activo',
    // Recurso activo (p.ej. médico): "✓ Activo"
    inactivo: '✗ Inactivo'
    // Recurso inactivo: "✗ Inactivo"
  };
  return badges[status] || status;
  // Busca la etiqueta en el mapa; si el estado no está contemplado, se muestra el estado crudo (el string original)
};
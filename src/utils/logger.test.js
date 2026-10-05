/**
 * logger.test.js - Pruebas del logger del navegador
 * ----------------------------------------------------
 * Módulo: "Calidad Profesional del Software - Testing"
 *
 * Las pruebas usan el runner que viene con Node (`node --test`), sin agregar
 * dependencias: el proyecto no necesita un framework entero para comprobar
 * que un secreto no se escribe en la consola.
 *
 * CASOS:
 *   • Camino feliz: la línea tiene los campos obligatorios y es JSON válido.
 *   • Bordes:      filtrado por nivel, nivel desconocido, truncado.
 *   • Fallas:      los secretos NO se escriben, ni en objetos anidados.
 *
 * El caso de los secretos es el más importante de todos. Un token o una
 * contraseña que llegan a la consola del navegador quedan expuestos en una
 * pantalla compartida o en un video de soporte, así que la prueba verifica el
 * comportamiento contrario al habitual: que la información sensible desaparezca.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  configurar,
  info,
  warn,
  error,
  debug,
  registro,
  nivelActual,
  correlationId,
  restablecer,
  limpiarContexto,
} from './logger.js';
import { olvidar, inicializar } from './correlationId.js';

/**
 * Captura lo que el logger escribe.
 *
 * Se inyecta un destino propio en lugar de espiar `console`: así la prueba no
 * depende de cómo esté implementado el destino real, solo de lo que el logger
 * decide escribir.
 *
 * @returns {{lineas: Array<{etiqueta: string, texto: string}>, restaurar: Function}}
 */
function capturar() {
  const lineas = [];
  configurar({
    destino: (etiqueta, texto) => lineas.push({ etiqueta, texto }),
  });

  return {
    lineas,
    // Se llama al final de cada prueba para que el logger no siga escribiendo
    // en un array que ya nadie mira, y para no contaminar la prueba siguiente.
    restaurar: restablecer,
  };
}

// Cada prueba empieza y termina en el mismo estado: sin identificador
// guardado y con el logger en su configuración por defecto.
test.beforeEach(() => {
  olvidar();
  restablecer();
});

test.afterEach(() => {
  olvidar();
  restablecer();
});

/** Camino feliz: la línea tiene forma de JSON con los campos del contrato. */
test('la línea de log es JSON con los campos obligatorios', () => {
  const cap = capturar();

  info('login exitoso', { usuario_id: 7 });

  assert.equal(cap.lineas.length, 1, 'debe escribirse exactamente una línea');

  const { etiqueta, texto } = cap.lineas[0];
  const linea = JSON.parse(texto);

  assert.equal(etiqueta, 'INFO', 'el destino recibe la etiqueta del nivel');
  assert.equal(linea.nivel, 'INFO');
  assert.equal(linea.mensaje, 'login exitoso');
  assert.equal(linea.contexto.usuario_id, 7);
  assert.match(linea.ts, /^\d{4}-\d{2}-\d{2}T/, 'la fecha va en formato ISO');
  assert.equal(linea.correlation_id, correlationId(), 'todas las líneas comparten correlación');

  cap.restaurar();
});

/** La correlación debe ser la misma en dos eventos distintos. */
test('dos eventos comparten el identificador de correlación', () => {
  const cap = capturar();

  info('uno');
  warn('dos');

  const [a, b] = cap.lineas.map((linea) => JSON.parse(linea.texto));

  assert.equal(a.correlation_id, b.correlation_id);
  assert.match(a.correlation_id, /^cid_[a-f0-9]{16}$/);

  cap.restaurar();
});

/** Borde: con nivel info, un debug no se escribe. */
test('un nivel por debajo del mínimo no se escribe', () => {
  const cap = capturar();

  info('ignorar'); // fija el mínimo en info
  configurar({ nivel: 'info' });
  debug('esto no debería aparecer');

  assert.equal(cap.lineas.length, 1);

  cap.restaurar();
});

/** Con nivel warn, info y debug quedan fuera y warn sí. */
test('el nivel mínimo filtra por debajo y deja pasar por encima', () => {
  const cap = capturar();
  configurar({ nivel: 'warn' });

  debug('fuera');
  info('fuera');
  warn('dentro');
  error('dentro');

  const mensajes = cap.lineas.map((linea) => JSON.parse(linea.texto).mensaje);

  assert.deepEqual(mensajes, ['dentro', 'dentro']);
  cap.restaurar();
});

/** Un nivel que no existe se ignora en lugar de romper la aplicación. */
test('un nivel desconocido no se escribe', () => {
  const cap = capturar();

  registro('inventado', 'esto no es un nivel');

  assert.equal(cap.lineas.length, 0);

  cap.restaurar();
});

/** El nivel mínimo por defecto se puede consultar y cambiar. */
test('el nivel mínimo se configura y se consulta', () => {
  assert.equal(nivelActual(), 'info');

  configurar({ nivel: 'WARN' }); // en mayúsculas también vale

  assert.equal(nivelActual(), 'warn');
});

/** Un nivel mal escrito en la configuración no deja al sistema sin logs. */
test('un nivel mal configurado conserva el nivel anterior', () => {
  configurar({ nivel: 'warn' });
  configurar({ nivel: 'VERBOSE' });

  assert.equal(nivelActual(), 'warn');
});

/** Falla principal: los secretos no se escriben. */
test('una contraseña en el contexto queda redactada', () => {
  const cap = capturar();

  error('fallo en el login', { password: 'MiClave123', usuario_id: 7 });

  const linea = JSON.parse(cap.lineas[0].texto);

  assert.equal(linea.contexto.password, '[oculto]');
  assert.ok(!cap.lineas[0].texto.includes('MiClave123'), 'la contraseña no puede aparecer en la línea');
  assert.equal(linea.contexto.usuario_id, 7, 'el resto de los datos se conserva');

  cap.restaurar();
});

/** El token tampoco, en ninguna de las claves habituales. */
test('los tokens quedan redactados', () => {
  const cap = capturar();

  error('falla', {
    token: 'eyJhbGciOiJIUzI1NiJ9.cuerpo.firma',
    jwt: 'abc.def.ghi',
    refresh_token: 'otro-token',
    authorization: 'Bearer abc',
  });

  const linea = JSON.parse(cap.lineas[0].texto);

  for (const clave of ['token', 'jwt', 'refresh_token', 'authorization']) {
    assert.equal(linea.contexto[clave], '[oculto]', `${clave} debe quedar redactada`);
  }
  assert.ok(!cap.lineas[0].texto.includes('eyJhbGci'), 'el cuerpo del token no puede aparecer');

  cap.restaurar();
});

/**
 * El caso que hace útil la recursión: en el uso real, el token viaja dentro de
 * `config.headers.authorization` de un error de axios. Si la redacción solo
 * mirara el primer nivel, el token pasaría limpio.
 */
test('los secretos anidados también quedan redactados', () => {
  const cap = capturar();

  error('error de axios', {
    config: {
      url: '/api/citas',
      headers: {
        Authorization: 'Bearer token-secreto-123',
        'Content-Type': 'application/json',
      },
    },
  });

  const { texto } = cap.lineas[0];
  const linea = JSON.parse(texto);

  assert.equal(linea.contexto.config.headers.Authorization, '[oculto]');
  assert.ok(!texto.includes('token-secreto-123'));
  // Lo que no es secreto se conserva: sin esto el log no serviría para
  // diagnosticar.
  assert.equal(linea.contexto.config.url, '/api/citas');

  cap.restaurar();
});

/** Los datos personales se enmascaran a medias, para poder correlacionar. */
test('los datos personales quedan enmascarados parcialmente', () => {
  const cap = capturar();

  info('busqueda', { email: 'paciente@mail.com', dni: '30111222' });

  const linea = JSON.parse(cap.lineas[0].texto);

  assert.ok(linea.contexto.email.startsWith('paci'), 'se conservan los primeros caracteres');
  assert.ok(linea.contexto.email.includes('*'), 'el resto se reemplaza por asteriscos');
  assert.ok(!linea.contexto.email.includes('mail.com'));
  assert.ok(linea.contexto.dni.startsWith('3011'));
});

/** Un valor corto se redacta entero: mostrar cuatro de cinco no protege nada. */
test('un dato personal muy corto se redacta completo', () => {
  const cap = capturar();

  info('dato corto', { email: 'a@b.c' });

  assert.equal(JSON.parse(cap.lineas[0].texto).contexto.email, '[oculto]');

  cap.restaurar();
});

/** El truncado evita que una respuesta gigante inunde el log. */
test('un valor gigante se trunca con aviso', () => {
  const cap = capturar();

  info('respuesta enorme', { datos: 'x'.repeat(900) });

  const linea = JSON.parse(cap.lineas[0].texto);

  assert.ok(linea.contexto.datos.endsWith('...[truncado]'), 'debe quedar claro que se recortó');
  assert.ok(linea.contexto.datos.length < 900);

  cap.restaurar();
});

/** Un array se limpia elemento por elemento. */
test('los arrays se limpian elemento por elemento', () => {
  const cap = capturar();

  info('usuarios', { lista: [{ email: 'ana@mail.com' }, { email: 'beto@mail.com' }] });

  const { lista } = JSON.parse(cap.lineas[0].texto).contexto;

  assert.equal(lista.length, 2);
  assert.ok(lista[0].email.startsWith('ana'));
  assert.ok(!lista[1].email.includes('mail.com'));

  cap.restaurar();
});

/** Un error se reduce a su mensaje: el stack en la consola es ruido. */
test('un error se reduce a su mensaje', () => {
  const limpio = limpiarContexto(new Error('falló la consulta'));

  assert.equal(limpio, 'falló la consulta');
});

/**
 * Si el destino falla, la aplicación no se cae. Un logger es un instrumento de
 * diagnóstico: no puede ser la causa del problema que ayuda a diagnosticar.
 */
test('un destino que lanza no rompe la aplicación', () => {
  configurar({
    destino: () => {
      throw new Error('consola bloqueada');
    },
  });

  assert.doesNotThrow(() => error('no importa dónde se escriba'));
});

/** La correlación del logger es la del módulo de correlación. */
test('el logger expone el identificador vigente', () => {
  olvidar();
  const id = inicializar();

  assert.equal(correlationId(), id);
});
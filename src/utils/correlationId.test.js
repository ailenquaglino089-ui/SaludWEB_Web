/**
 * correlationId.test.js - Pruebas del identificador de correlación
 * -----------------------------------------------------------------
 * Módulo: "Calidad Profesional del Software - Testing"
 *
 * CASOS:
 *   • Camino feliz: se genera un id con el formato acordado con el backend.
 *   • Bordes:      reutiliza el id guardado, acepta UUID, ids repetidos.
 *   • Fallas:      rechaza saltos de línea, espacios y valores corruptos.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  generar,
  esValido,
  actual,
  inicializar,
  olvidar,
} from './correlationId.js';

// localStorage no existe en Node, así que se simula uno. Cada prueba parte de
// un almacén vacío para que el resultado no dependa del orden.
function simularAlmacen() {
  const datos = new Map();
  globalThis.localStorage = {
    getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
    setItem: (clave, valor) => datos.set(clave, String(valor)),
    removeItem: (clave) => datos.delete(clave),
  };
  return datos;
}

test.beforeEach(() => {
  olvidar();
  simularAlmacen();
});

test.afterEach(() => {
  olvidar();
  delete globalThis.localStorage;
});

/** Camino feliz: el formato es el mismo que usa el backend. */
test('el identificador generado tiene el formato del backend', () => {
  const id = generar();

  assert.match(id, /^cid_[a-f0-9]{16}$/);
  assert.ok(esValido(id), 'un id generado tiene que ser válido por definición');
});

/** Dos ids seguidos distintos: si se repitieran, se mezclarían los logs. */
test('los identificadores generados son distintos', () => {
  const ids = new Set([generar(), generar(), generar(), generar(), generar()]);

  assert.equal(ids.size, 5, 'no puede repetirse el identificador');
});

/** Sin nada guardado, se genera uno y queda disponible. */
test('inicializar genera un identificador cuando no hay nada guardado', () => {
  const id = inicializar();

  assert.match(id, /^cid_/);
  assert.equal(actual(), id, 'actual() debe devolver el mismo id');
});

/**
 * La persistencia es lo que hace que una recarga de página no corte la
 * correlación: el mismo error reportado dos veces sigue siendo rastreable.
 *
 * Para simular la recarga se importa el módulo otra vez con un parámetro
 * distinto. Node lo vuelve a evaluar, así que la memoria del módulo arranca
 * vacía, pero localStorage queda como estaba: exactamente lo que pasa en el
 * navegador al presionar F5.
 */
test('el identificador se reutiliza entre recargas', async () => {
  const id = inicializar();

  const trasRecarga = await import('./correlationId.js?v=recarga');

  assert.equal(trasRecarga.inicializar(), id, 'con el mismo almacenamiento debe recoverse el mismo id');
});

/** Dos pestañas del mismo navegador comparten el contexto guardado. */
test('inicializar dos veces no cambia el identificador', () => {
  const primero = inicializar();

  assert.equal(inicializar(), primero);
});

/** Cerrar sesión deja el almacenamiento limpio. */
test('olvidar borra el identificador guardado', () => {
  inicializar();
  assert.ok(globalThis.localStorage.getItem('saludweb:correlation-id'));

  olvidar();

  assert.equal(globalThis.localStorage.getItem('saludweb:correlation-id'), null);
});

/** Borde: se acepta un id con guiones, como los UUID que ya usan algunos. */
test('se aceptan identificadores con guiones y guiones bajos', () => {
  assert.ok(esValido('550e8400-e29b-41d4-a716-446655440000'));
  assert.ok(esValido('web_2026_10_05_a1b2'));

  // Y se adopta tal cual, sin regenerarlo: el cliente ya tenía su correlación.
  globalThis.localStorage.setItem('saludweb:correlation-id', 'web-2026-a1b2');

  assert.equal(inicializar(), 'web-2026-a1b2');
});

/**
 * Seguridad: un salto de línea en el id permitiría escribir una línea falsa en
 * el archivo de log del backend. Tiene que rechazarse.
 */
test('un identificador con salto de línea se rechaza', () => {
  assert.equal(esValido('abc\n{"nivel":"INFO"}'), false);
  assert.equal(esValido('abc\r\ndef'), false);
});

/** Un espacio rompería la cabecera HTTP. */
test('un identificador con espacios se rechaza', () => {
  assert.equal(esValido('abc def'), false);
  assert.equal(esValido(' abc'), false);
});

/** Las etiquetas rompen los visores de logs que interpretan HTML. */
test('un identificador con etiquetas se rechaza', () => {
  assert.equal(esValido('<script>'), false);
  assert.equal(esValido('a>b'), false);
});

/** Cualquier tipo que no sea texto queda fuera, sin lanzar excepción. */
test('un valor que no es texto se rechaza', () => {
  assert.equal(esValido(null), false);
  assert.equal(esValido(undefined), false);
  assert.equal(esValido(12345), false);
  assert.equal(esValido({}), false);
  assert.equal(esValido(['abc']), false);
});

/** El límite de longitud se respeta en el borde. */
test('un identificador demasiado largo se rechaza', () => {
  assert.equal(esValido('a'.repeat(65)), false);
  assert.equal(esValido('a'.repeat(64)), true);
});

/** Un valor guardado corrupto se descarta y se genera uno válido. */
test('un identificador guardado corrupto se reemplaza', () => {
  globalThis.localStorage.setItem('saludweb:correlation-id', 'no valido con espacios');

  const id = inicializar();

  assert.match(id, /^cid_[a-f0-9]{16}$/, 'no debe adoptarse un valor corrupto');
});

/**
 * Sin localStorage (modo privado, o este mismo runner), la aplicación tiene
 * que funcionar igual: se pierde la persistencia, no la trazabilidad.
 */
test('sin almacenamiento disponible igual hay identificador', () => {
  delete globalThis.localStorage;

  assert.match(inicializar(), /^cid_[a-f0-9]{16}$/);
});

/** Un almacenamiento que lanza excepción no puede romper la aplicación. */
test('un almacenamiento que falla no rompe la inicialización', () => {
  globalThis.localStorage = {
    getItem: () => {
      throw new Error('almacenamiento deshabilitado');
    },
    setItem: () => {
      throw new Error('almacenamiento deshabilitado');
    },
    removeItem: () => {
      throw new Error('almacenamiento deshabilitado');
    },
  };

  assert.match(inicializar(), /^cid_/);
  assert.doesNotThrow(() => olvidar());
});
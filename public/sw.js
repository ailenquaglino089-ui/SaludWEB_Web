// ============================================================
// sw.js - Service Worker de SaludWEB
// ============================================================
// Da a la SPA un arranque offline: el "caparazón" (HTML + assets
// compilados) queda en caché para que la app se abra sin red, mientras que
// los datos de /api se piden SIEMPRE a la red (con encabezados de auth) y
// jamás se sirven de caché: un turno o una prescripción servidos viejos
// serían un error clínico.
//
// Estrategias por tipo de request:
//   - Navegación (modo "navigate")  → red primero; si falla, HTML en caché.
//   - Assets del caparazón (mismo origen, GET) → caché primero; la primera
//     vez se guarda lo que se pide. Los archivos compilados por Vite llevan
//     hash en el nombre, así que una versión nueva genera un archivo nuevo y
//     no choca con el viejo.
//   - /api/* → solo red. Nunca se cachea una respuesta de la API.
//
// El service worker se registra SOLO en la versión compilada (npm run build,
// import.meta.env.PROD). En desarrollo Vite sirve de otra manera y un SW que
// intervenga complica el hot reload sin aportar nada.
"use strict";

var CACHE_COPA = "saludweb-capa-v1";
var ARCHIVOS_INICIALES = ["./", "./index.html"];

self.addEventListener("install", function (evento) {
  // Precargar las dos rutas del caparazón. Si esto falla (p.ej. primera
  // instalación sin red) la instalación igual termina: luego se cachea al
  // vuelo con lo que se pide mientras la app funciona.
  evento.waitUntil(
    (async function () {
      var cache = await caches.open(CACHE_COPA);
      await cache.addAll(ARCHIVOS_INICIALES);
    })()
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (evento) {
  // Al activarse se borran versiónes viejas de la caché del caparazón, para
  // no acumular archivos de builds anteriores.
  evento.waitUntil(
    (async function () {
      var claves = await caches.keys();
      await Promise.all(
        claves
          .filter(function (c) {
            return c !== CACHE_COPA;
          })
          .map(function (c) {
            return caches.delete(c);
          })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", function (evento) {
  var request = evento.request;

  // Solo interesa GET; los POST/PUT/PATCH de la API pasan de largo.
  if (request.method !== "GET") {
    return;
  }

  var url = new URL(request.url);

  // La API nunca se cachea: datos clínicos siempre frescos y con autorización.
  if (url.pathname.indexOf("/api") !== -1) {
    return;
  }

  // Navegación: red primero, HTML cacheado de respaldo para abrir sin red.
  if (request.mode === "navigate") {
    evento.respondWith(
      (async function () {
        try {
          var respuestaRed = await fetch(request);
          // Guardar el HTML visto para la próxima vez sin red.
          var cache = await caches.open(CACHE_COPA);
          cache.put(request, respuestaRed.clone());
          return respuestaRed;
        } catch (errorRed) {
          var cache = await caches.open(CACHE_COPA);
          var respuestaRecuerdo = await cache.match(request);
          return (
            respuestaRecuerdo ||
            (await cache.match("./index.html"))
          );
        }
      })()
    );
    return;
  }

  // Assets del caparazón (JS/CSS/imágenes con hash): copia local si existe y
  // refresco en segundo plano; a cajón vacío se pide a la red y se guarda.
  if (url.origin === self.location.origin) {
    evento.respondWith(
      (async function () {
        var cache = await caches.open(CACHE_COPA);
        var copia = await cache.match(request);

        if (copia) {
          // Ya está en caché: se sirve sin esperar la red y se refresca la
          // copia por detrás. Si la red no está, la app ni se entera.
          fetch(request)
            .then(function (respuesta) {
              if (respuesta && respuesta.ok) {
                return cache.put(request, respuesta.clone());
              }
            })
            .catch(function () {
              /* offline: la copia local alcanza */
            });
          return copia;
        }

        // Primera vez: buscar en la red y guardar para las próximas.
        var respuesta = await fetch(request);
        if (respuesta && respuesta.ok) {
          cache.put(request, respuesta.clone());
        }
        return respuesta;
      })()
    );
    return;
  }

  // Cualquier otro origen: sin intervención del service worker.
});
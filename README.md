# Frontend SPA - SaludWEB

Frontend moderno construido con **React + Vite**.

Consume la API REST del backend y proporciona una interfaz profesional para el sistema de gestión de salud.

## 🚀 Inicio Rápido

### Requisitos
- Node.js 16+
- npm o yarn

### Instalación

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar servidor de desarrollo
npm run dev

# 3. Abrir en navegador
# http://localhost:5173
```

### Build para producción

```bash
npm run build
```

---

## 📁 Estructura del Proyecto

```
repositorio_web_spa/
├── src/
│   ├── api/
│   │   └── client.js          # Cliente API HTTP
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── Dashboard/
│   │   │   └── Dashboard.jsx
│   │   ├── Medicos/
│   │   │   ├── ListaMedicos.jsx
│   │   │   ├── FormularioMedico.jsx
│   │   │   └── DetallesMedico.jsx
│   │   ├── Pacientes/
│   │   │   ├── ListaPacientes.jsx
│   │   │   └── FormularioPaciente.jsx
│   │   ├── Prescripciones/
│   │   │   ├── ListaPrescripciones.jsx
│   │   │   └── FormularioPrescripcion.jsx
│   │   └── Navbar.jsx
│   ├── hooks/
│   │   └── useAuth.js         # Hook de autenticación
│   ├── context/
│   │   └── AuthContext.js     # Context de autenticación
│   ├── App.jsx                # Componente raíz
│   ├── App.css
│   └── main.jsx
├── index.html
├── package.json
└── vite.config.js
```

---

## 🔧 Configuración API

En `src/api/client.js`, configura la URL de tu backend:

```javascript
const API_URL = 'http://localhost/Workspace_SaludWEB/SaludWEB_Backend';
```

---

## 🎨 Características

- ✅ Autenticación con JWT (login/registro)
- ✅ CRUD de Médicos
- ✅ CRUD de Pacientes
- ✅ CRUD de Prescripciones
- ✅ Dashboard interactivo
- ✅ Validaciones de formularios
- ✅ Manejo de errores
- ✅ Responsive design

---

## 📦 Dependencias Principales

- **React** - Librería UI
- **React Router** - Enrutamiento
- **Axios** - Cliente HTTP
- **Vite** - Build tool
- **React Context** - Gestión de estado (autenticación)

---

## 🔐 Autenticación

La autenticación se maneja a través de `AuthContext`:

```javascript
// Hook para usar autenticación
const { usuario, login, logout, registro } = useAuth();

// El token se almacena en localStorage
// Se envía en cada request como Authorization header
```

---

## 📚 Más información

- [API Documentation](../API_DOCUMENTATION.md)
- [Backend README](../SaludWEB_Backend/README.md)


---

## PWA y arranque offline

La SPA es instalable y abre sin red cuando ya se visito una vez:

- `public/manifest.webmanifest` describe la app (nombre, iconos, tema, display).
- `public/sw.js` cachea el caparazon (HTML + assets compilados con hash) y
  sirve la navegacion con red primero / copia local de respaldo. Los datos de
  `/api` **nunca** se cachean: turnos y prescripciones siempre se piden a la
  red con autorizacion.
- El service worker se registra solo en el build de produccion (`npm run
  build`), en `src/main.jsx`.
- Para probarlo: servir `dist/` en un contexto local (p.ej. XAMPP) y abrir
  la app; la segunda visita con la red cortada muestra la app igual.
- Requiere HTTPS (o `localhost`) para que el navegador active el service worker.

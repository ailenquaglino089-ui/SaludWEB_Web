# Guía de código — Web · Turnera y Usuarios

> Recorrido línea por línea de la turnera y la gestión de usuarios.  
> Índice general en ../GUIA_DE_CODIGO.md

---

## `src/components/Turnera/AgendaMedico.jsx` (763 líneas)

- **Rol:** Pantalla pública de agenda de un profesional. Muestra días con atención, horarios disponibles/ocupados, permite desplegar un día y navegar a la reserva. Construye la grilla de días a mano (sin librería), maneja fechas en hora local, usa `usePolling` para refrescar la disponibilidad y abre automáticamente el primer día con un `useRef` para evitar el bucle de reapertura.
- **Se conecta con:** `../../api/turnera` (`listarMedicos`, `listarDisponibilidades`, `consultarDisponibilidad`, `mensajeDeError`), `../../hooks/usePolling` (`usePolling`, `useSegundosDesde`), `./PiezasTurnera` (`Cargando`, `Aviso`, `Vacio`, `IndicadorActualizacion`), `react-router-dom` (`useParams`, `useNavigate`, `Link`), `Turnera.css`.
- **Recorrido línea por línea:**

  - L1–L29: Encabezado documental (módulo, motivos: grilla manual, "próximos días" vs semana, fechas en hora local). 
  - L31–L41: Imports React (`useState`, `useEffect`, `useRef`) y router (`useParams`, `useNavigate`, `Link`). 
  - L42–L67: Imports API, hooks de polling, piezas compartidas y CSS. 
  - L69–L83: Constantes `NOMBRES_DIAS` y `NOMBRES_DIAS_CORTOS` (orden lunes–domingo). 
  - L84–L118: Componente `AgendaMedico`. Lee `idMedico` desde URL, estados de filtros (`especialidad`, `q`), datos profesional (`medico`, `diaAbierto`, `diasAtencion`), mensajes/carga (`error`, `cargandoMedico`). 
  - L119–L200: Efecto de búsqueda del profesional. `Promise.all([listarMedicos({activo:1}), listarDisponibilidades(idMedico)])`, busca por `id`, extrae días únicos de bloques (`dia_semana` 1–7), ordena lunes–domingo, setea `diasAtencion` (`[]` si no atiende). `cancelado` para evitar setState tras desmontar. 
  - L201–L232: Polling de disponibilidad con `usePolling(() => consultarDisponibilidad(idMedico,diaAbierto), {clave, activo: Boolean(diaAbierto)})`. Expone `datos`, `cargando`, `error`, `refreshing`, `ultimaActualizacion`, `recargar`. `segundos = useSegundosDesde(ultimaActualizacion)`. 
  - L233–L288: Derivados de `disponibilidad`: `slots`, `haySlots`, `hayLibres`, `bloques`, `totalSlots` (forzado a Number). `atiendeEseDia` se deriva de datos reales (`haySlots || bloques.length>0 || totalSlots>0 || disponibilidad?.atenie_ese_dia===true`) evitando confiar solo en booleano ausente. 
  - L289–L297: `dias = construirDias(diasAtencion, 7)`. 
  - L298–L308: Handler `alternarDia(iso)` con setState funcional. 
  - L309–L368: Apertura automática del primer día con `aperturasHechasRef`. Solo abre si cambia `diasAtencion`; no depende de `diaAbierto` para evitar reapertura al cerrar. Usa `[primero]=construirDias(diasAtencion,1)`. 
  - L369–L386: `reservar(hora)` navega a `/turnera/agenda/${idMedico}/reservar?fecha=...&hora=...` con `encodeURIComponent` (SPA). 
  - L387–L397: Render: si `cargandoMedico` → `Cargando("Buscando el profesional...")`. 
  - L398–L431: Si no `medico` → muestra error/Vacio, link a `/turnera`. Sin reintento (id inválido). 
  - L432–L457: Header con nombre/especialidad y `IndicadorActualizacion` (`ultimaActualizacion`, `alActualizar=recargar`, `segundos`, `refreshing`). 
  - L458–L476: Filtros visibles solo si `q||especialidad` (muestran activos y link para quitarlos). `error` global. 
  - L477–L506: Tira de días `dias-selector`. Si `dias.length===0` muestra "Este profesional no tiene días de atención cargados.". Else mapea botones con `key=dia.fecha`, clase elegida según `diaAbierto`, `aria-pressed`, muestra `dia.nombre` y `dia.diaDelMes`. 
  - L507–L596: Sección día desplegado (`diaAbierto`). Muestra `formatearDiaLargo(diaAbierto)`. Mientras carga sin datos → `Cargando("Buscando horarios...")`. Si `errorDisponibilidad` → `Aviso error`. Si hay datos: si no `atiendeEseDia` → "Este profesional no atiende ese día."; si atiende pero `!haySlots` → `Vacio` con botón "Actualizar" (`alReintentar=recargar`); si atiende y `haySlots` → subtítulo con libres/total, lista `<ul class="slots-grid">` con `<li key=slot.hora>`: slot libre → botón `slot` que llama `reservar(slot.hora)` con `sr-only`; slot ocupado → botón `slot slot-ocupado` disabled con `title` y `.slot-ocupado-marca`. 
  - L597–L607: Footer con link "Volver al catálogo" a `/turnera`. 
  - L608–L611: Separador. 
  - L612–L620: Comentario sobre helpers fuera del componente (puras, no recreadas). 
  - L621–L640: Bloque fechas: explicación UTC vs local (usar constructor con año/mes/día). 
  - L641–L650: `aFechaISO(fecha)` → `YYYY-MM-DD` local (`getMonth()+1`, `padStart`). 
  - L652–L656: `aDiaDeSemana(dia)` → 1=lunes..7=domingo (Date 0=domingo). 
  - L658–L665: `unicos(lista)` → `Set` (evita O(n²)). 
  - L667–L733: `construirDias(diasAtencion, cantidad)`. Retorna `[]` si `!diasAtencion` o vacío. `hoy` a medianoche. `tope = cantidad*7` (peor caso 1 día/semana). Bucle `i<tope && resultado.length<cantidad`: copia `hoy`, `setDate(i)`, `diaSemana=aDiaDeSemana(getDay())`, si incluido → push `{fecha:aFechaISO(dia), nombre:NOMBRES_DIAS[diaSemana-1], diaDelMes:dia.getDate()}`. 
  - L735–L746: `formatearDiaLargo(iso)` parte `YYYY-MM-DD` (evita UTC), `new Date(anio,mes-1,dia)`, retorna `"lunes 29 de septiembre"` (minúscula) usando `NOMBRES_DIAS[...]` y `NOMBRE_MES`. 
  - L748–L762: `NOMBRE_MES` array enero–diciembre.

---

## `src/components/Turnera/CatalogoTurnera.jsx` (295 líneas)

- **Rol:** Catálogo público de profesionales. Permite filtrar por especialidad y buscar por nombre/matrícula, muestra tarjetas con botón "Ver horarios" que navega a la agenda. Usa debounce (300ms) al buscar, pide `activo:1`. Muestra aviso si paciente autenticado sin ficha vinculada.
- **Se conecta con:** `../../api/turnera` (`listarEspecialidades`, `listarMedicos`, `mensajeDeError`), `../../hooks/useAuth` (`useAuth`), `./PiezasTurnera` (`Cargando`, `Aviso`, `Vacio`), `react-router-dom` (`useNavigate`), `Turnera.css`.
- **Recorrido línea por línea:**

  - L1–L21: Encabezado (flujo público, separación especialidades vs médicos, filtrado server-side). 
  - L23–L31: Imports React (`useState`, `useEffect`, `useCallback`) y `useNavigate`. 
  - L32–L44: Imports API, `useAuth`, piezas y CSS. 
  - L45–L51: `NOMBRES_DIAS` (lunes–domingo) con explicación de convención. 
  - L52–L74: Componente. `navigate`, `autenticado/usuario` desde auth. Estados: `especialidad` (nombre), `busqueda`, `especialidades`, `medicos`, `cargando`, `error`. 
  - L75–L104: Efecto carga especialidades al montar (`cancelado`), `listarEspecialidades()` → `setEspecialidades(datos)`, catch → `setError(mensajeDeError(...))`. 
  - L105–L133: `cargarMedicos = useCallback(async () => {...}, [especialidad,busqueda])`. `setCargando(true)`, llama `listarMedicos({especialidad, q: busqueda.trim(), activo:1})`, setea `medicos`, limpia `error`; catch → `setError`, `setMedicos([])`. finally `setCargando(false)`. 
  - L134–L146: Debounce 300ms sobre `cargarMedicos` con `setTimeout` + cleanup. 
  - L147–L159: `verAgenda(medico)` → `navigate('/turnera/agenda/' + medico.id, { state: { medico } })` (state no persiste al recargar). 
  - L160–L172: Render header + descripción. 
  - L173–L183: Aviso si autenticado y paciente sin `id_paciente`. 
  - L184–L222: Filtros: select especialidad (opción vacía "Todas") con `esp.nombre` y `esp.cantidad_medicos`; input búsqueda por nombre/matrícula con debounce implícito. 
  - L223–L231: Errores primero. 
  - L229–L251: Si `cargando` → `Cargando("Buscando profesionales...")`. Else si `medicos.length===0` → `Vacio` con texto según filtros, botón "Quitar filtros" que limpia `especialidad` y `busqueda`. 
  - L251–L282: Si hay médicos → contador (`medicos.length` singular/plural), grilla `.turnera-grid` con `.medico-card` por médico: h3 nombre, `.medico-especialidad`, lista `.medico-meta` con matrícula, botón "Ver horarios" llama `verAgenda(medico)`. 
  - L283–L294: Aviso pie si no autenticado ("Para reservar un turno necesitás una cuenta...").

---

## `src/components/Turnera/MisTurnos.jsx` (323 líneas)

- **Rol:** Lista turnos del usuario, permite confirmar o cancelar. Usa `usePolling` (sin WebSocket), deriva estado calculado por backend; muestra "Actualizado hace N s" y botón "Actualizar ahora". 
- **Se conecta con:** `../../api/turnera` (`listarMisTurnos`, `confirmarTurno`, `cancelarTurno`, `mensajeDeError`), `../../hooks/useAuth` (`useAuth`), `../../hooks/usePolling` (`usePolling`, `useSegundosDesde`), `./PiezasTurnera` (`Cargando`, `Aviso`, `Vacio`, `IndicadorActualizacion`), `react-router-dom` (`Link`), `Turnera.css`.
- **Recorrido línea por línea:**

  - L1–L31: Encabezado (polling vs suscripción, estado derivado, confirmar vs cancelar explícitos). 
  - L32–L37: Imports React (`useState`, `useCallback`). 
  - L38–L41: `Link`. 
  - L40–L47: API imports. 
  - L48–L55: Auth + polling hooks. 
  - L56–L61: Piezas + CSS. 
  - L62–L74: Componente. `usuario` desde auth. Estados `error`, `accionEnCurso` (id turno). 
  - L75–L87: `cargarTurnos = useCallback(async ()=> listarMisTurnos(), [])` — sin try/catch para propagar error a `usePolling`. 
  - L87–L104: `usePolling(cargarTurnos, {clave: \`turnos-${usuario?.id_usuario}\`, activo:true})` → `datos,cargando,error: errorDeCarga,refreshing,ultimaActualizacion,recargar`. `segundos = useSegundosDesde(ultimaActualizacion)`. `turnos = datos?.turnos??[]`. 
  - L105–L110: Derivados. 
  - L111–L135: `confirmar(turno)` valida `accionEnCurso`, setea `accionEnCurso=turno.id`, limpia `error`, `await confirmarTurno(turno.id)`, `await recargar()` (no parche local), catch `setError(mensajeDeError)`, finally limpia. 
  - L136–L169: `cancelar(turno)` valida, `window.confirm` con texto explicando liberación de horario, si cancela → setea flag, limpia, `await cancelarTurno(turno.id)`, `await recargar()`, catch, finally. 
  - L170–L183: Carga inicial: si `cargando && !datos` → `Cargando("Cargando tus turnos...")` (evita parpadeo en refrescos). 
  - L184–L206: Header con `IndicadorActualizacion`. Muestra `error` y `errorDeCarga`. 
  - L206–L222: Si `turnos.length===0` → `Vacio` "Todavía no tenés turnos reservados.", botón "Reservar un turno" link a `/turnera`. 
  - L222–L321: Else → contador, `<ul class="turnos-lista">` mapeando `turnos`. Cada `<li class="turno-item">` con: `.turno-info` (fecha/hora, profesional + especialidad, paciente_nombre opcional, motivo opcional); `.turno-estado` con `<span class={\`estado-badge estado-${turno.estado}\`}>${turno.estado}</span>`; acciones por estado: `pendiente` → botones "Confirmar" (disabled si accionEnCurso===id) y "Cancelar"; `confirmada` → "Cancelar"; `cancelada` → link "Reservar de nuevo" a `/turnera/agenda/${turno.id_medico}`. 
  - L321–L323: Cierre.

---

## `src/components/Turnera/PiezasTurnera.jsx` (138 líneas)

- **Rol:** Componentes compartidos del módulo (Cargando, Aviso, Vacio, IndicadorActualizacion). Centralizan estilos/import CSS. 
- **Se conecta con:** `./Turnera.css`.
- **Recorrido línea por línea:**

  - L1–L15: Encabezado (reutilización para evitar inconsistencia, import CSS una vez). 
  - L16–L35: `Cargando({ texto='Cargando...', discreto=false })` → retorna `.actualizacion-info` si discreto else `.turnera-cargando`. Si no discreto muestra spinner con `aria-hidden="true"`. Texto en `<p>`. 
  - L37–L67: `Aviso({ tipo='info', texto })` → retorna `null` si sin texto. Usa `className=\`aviso aviso-${tipo}\`` y `role={tipo==='error'?'alert':'status'}`. 
  - L68–L90: `Vacio({ texto, textoBoton, alReintentar, icono='📭' })` → `.vacio`. Icono con `aria-hidden="true"`. Botón secundario solo si `textoBoton && alReintentar`. 
  - L92–L138: `IndicadorActualizacion({ ultimaActualizacion, alActualizar, segundos, refrescando })` → `null` si sin `ultimaActualizacion`. Muestra `.actualizacion-info` con `.punto-vivo` (añade `animando` si `refrescando`) `aria-hidden="true"`, texto "Actualizado" con `<time dateTime={ultimaActualizacion.toISOString()}>` (`hace instantes` si `segundos===0` else `hace ${segundos} s`), botón `.btn-chico` ("Actualizar ahora" o "Actualizando...") disabled si `refrescando`.

---

## `src/components/Turnera/ReservarTurno.jsx` (471 líneas)

- **Rol:** Última pantalla pública (exige sesión). Muestra resumen del horario (fecha/hora desde query). Tres estados: sin sesión (invitar login/registro), con sesión pero sin ficha vinculada (formulario de vinculación por DNI/matrícula), con sesión y vinculado (confirmar reserva). Para médico/admin permite elegir paciente (reserva en nombre de otro). Nunca envía `idPaciente` cuando reserva paciente (se impone desde token). 
- **Se conecta con:** `../../api/turnera` (`reservarTurno`, `vincularFicha`, `listarPacientes`, `mensajeDeError`), `../../hooks/useAuth` (`useAuth`), `./PiezasTurnera` (`Cargando`, `Aviso`), `react-router-dom` (`useParams`, `useSearchParams`, `useNavigate`, `Link`), `Turnera.css`.
- **Recorrido línea por línea:**

  - L1–L39: Encabezado (reglas de negocio: vínculo requerido, dos modos por rol, seguridad). 
  - L40–L44: Imports React (`useState`, `useEffect`). 
  - L44–L50: Router imports. 
  - L50–L57: API imports. 
  - L58–L62: Auth + piezas. 
  - L63–L66: CSS. 
  - L67–L83: Componente. `idMedico` desde params, `[parametros]=useSearchParams()`, `navigate`, `autenticado,usuario,cargandoSesion,recargarSesion`. Extrae `fecha = parametros.get('fecha')`, `hora = parametros.get('hora')`. 
  - L84–L112: Estados form: `motivo`, `notas`, `documento`, `pacienteElegido`, `pacientes`, `error`, `exito`, `enviando`, `vinculando`. 
  - L113–L130: `vinculado` derivado por rol (`admin` true, `medico` → `Boolean(id_medico)`, else `Boolean(id_paciente)`). `reservaEnNombreDeOtro = medico||admin`. 
  - L131–L144: useEffect valida `fecha&&hora`; si faltan setea `error` ("Falta elegir el horario..."). 
  - L145–L172: useEffect carga pacientes si autenticado y `reservaEnNombreDeOtro` → `listarPacientes()`, setea `pacientes`, catch setea `error`. `cancelado` guard. 
  - L173–L176: Handlers inicio. 
  - L177–L242: `confirmarReserva(evento)`. `preventDefault()`, `if(enviando) return` (doble clic), valida `reservaEnNombreDeOtro && !pacienteElegido`, set `enviando=true`, limpia error. Llama `reservarTurno({idMedico:Number(idMedico), fecha, hora, motivo:trim(), notas:trim(), idPaciente: reservaEnNombreDeOtro?pacienteElegido:undefined})`. Éxito → `navigate('/turnera/mis-turnos')`. Catch: detecta `status===409` (conflicto) → mensaje específico + `setTimeout(()=>navigate(\`/turnera/agenda/${idMedico}\`), 2200)`. Otros → `mensajeDeError`. finally `setEnviando(false)`. 
  - L243–L273: `confirmarVinculacion(evento)`. preventDefault, valida `vinculando`, set flags, `await vincularFicha(usuario.tipo_usuario, documento.trim())`, set `exito`, `await recargarSesion()`, catch error, finally. 
  - L274–L307: `resumen` JSX: `dl` con filas Fecha, Hora; si autenticado+vinculado agrega "A nombre de" (si reservaEnNombreDeOtro busca en `pacientes` por id, else `usuario?.nombre`). 
  - L308–L318: Estado A: si `cargandoSesion` → `Cargando("Verificando tu sesión...")`. 
  - L319–L350: Si no autenticado → muestra `resumen`, `Aviso info`, links `Crear mi cuenta` y `Ya tengo cuenta` (`Link` a `/register`, `/login`). 
  - L351–L398: Estado B: sin vinculado → header + descripción, `error`, form `onSubmit=confirmarVinculacion`. Campo documento: label según rol (matrícula/DNI), input `autoComplete="off"`, `inputMode="numeric"`, `required`. Submit `Vinculando...` o `Vincular mi ficha`. 
  - L399–L471: Estado C: vinculado → header, `error`, `exito`, `resumen`, form `onSubmit=confirmarReserva`. Si `reservaEnNombreDeOtro` agrega select pacientes (required) mapeando `p.nombre (DNI: p.dni)`. Campos motivo (textarea, rows=3, `maxLength="255"`) y notas (rows=2). Submit `Reservando...` o `Confirmar turno`.

---

## `src/components/Turnera/Turnera.css` (857 líneas)

- **Rol:** Estilos del módulo Turnera (catálogo, agenda, reserva, mis turnos). Mobile-first con único breakpoint `max-width:640px`. Usa variables `var(--token)` donde corresponde; mantiene selectores de tipo dentro del módulo. Reutiliza clases existentes (slots-grid, dia-btn, turno-item, estado-badge). 
- **Recorrido línea por línea (agrupado por secciones):**

  - L1–L34: Encabezado CSS: convenciones (comentarios explicativos, tokens, único breakpoint, estructura móvil). 
  - L35–L69: Contenedor y cabecera `.turnera`, `.turnera-header`, `.turnera-header h1`, `.turnera-header p`. 
  - L70–L130: Filtros catálogo `.turnera-filtros` (flex wrap, gap, align-items flex-end), `.filtro-grupo` (flex grow/shrink, min-width:0), labels, inputs/selects, focus-visible. 
  - L131–L206: Botones `.btn-turnera`, `.btn-turnera:active`, focus-visible, `:disabled`. Variantes `.btn-primario`, `.btn-secundario`, `.btn-peligro`, `.btn-chico`. Hover condicionado a `:not(:disabled)`. 
  - L207–L269: Tarjetas profesionales `.turnera-grid`, `.medico-card` (flex columna, hover), `.medico-card h3`, `.medico-especialidad`, `.medico-meta` (lista), `.medico-card .btn-turnera {margin-top:auto}`. 
  - L270–L337: Grilla horarios `.slots-grid` (auto-fill minmax(110px,1fr), `list-style:none`, reset padding/margin), `.slots-grid > li`, `.slots-grid > li > .slot` (width:100%). Botón `.slot`, hover/focus-visible, `.slot.slot-elegido` (border-width:2), `.slot:disabled` (tachado, color tenue). 
  - L338–L385: Avisos `.aviso` (borde izquierdo), `.aviso-info`, `.aviso-exito`, `.aviso-error`, `.aviso-texto`. 
  - L386–L436: Formularios `.turnera-form`, `.form-campo`, labels, inputs/selects/textareas (font-family inherit), textarea `resize: vertical`, focus-visible. 
  - L437–L480: Resumen turno `.resumen-turno` (borde izquierdo primario), `dl`, `.resumen-fila` (space-between, border-bottom), última sin borde, `dt`, `dd` (text-align right). 
  - L481–L536: Lista mis turnos. `.turno-item` (flex, wrap, gap, justify space-between, align-items center), `.turno-info` (flex grow/shrink, min-width:0), `.turno-fecha`, `.turno-profesional`, `.turno-motivo` (word-break), `.turno-acciones` (flex wrap). 
  - L537–L573: Badges estado `.estado-badge` (estilos base), `.estado-pendiente`, `.estado-confirmada`, `.estado-completada`, `.estado-cancelada`, `.estado-ausente`. 
  - L574–L636: Estados carga `.turnera-cargando`, `.vacio`, `.vacio-icono`. Indicador actualización `.actualizacion-info` (flex wrap), `.punto-vivo` (base), `.punto-vivo.parado`, `@keyframes latir`, `.punto-vivo.animando`. 
  - L637–L690: Selector días `.dias-selector` (flex wrap), `.dia-btn`, hover/focus-visible, `.dia-btn.elegido`, `:disabled`. `.dia-numero` (block, chico, opacity 0.7). 
  - L691–L720: Responsive `@media (max-width:640px)`: reduce padding header, `.turnera` padding, `.btn-turnera` width 100%, `.turno-item` columna/strech, acciones botones full width. 
  - L721–L733: Encabezado secciones nuevas reutilizando clases existentes. 
  - L734–L749: Lista turnos `.turnos-lista` (`list-style:none`, margin/padding 0, flex columna, gap). 
  - L750–L770: Fila paciente `.turno-paciente` (color medio, chico), `.turno-estado` (flex align-items flex-start). 
  - L771–L810: Subtítulos/rótulos `.turnera-subtitulo`, `.agenda-dia` (borde top tenue), `.agenda-dia-titulo`, `.sin-dias`, `.sin-horarios` (tonal suave, centrados). 
  - L811–L857: Horarios ocupados `.slot-ocupado` (tachado, opacity 0.55), `.slot-ocupado-marca` (block chico, opacity 0.75). Configuración `.config-seccion` (margen/borde top), `.config-seccion h2`, `.config-seccion > p`.

---

## `src/components/Usuarios/MenuAcciones.jsx` (230 líneas)

- **Rol:** Desplegable de acciones por usuario en columna Acción. Muestra opciones "Convertir en ..." por rol, deshabilita rol actual con nota, evita cambiar propio rol. Cierra al hacer clic fuera (mousedown) y con Escape (devuelve foco). Ejecuta callback `alCambiar(id, rolNuevo)` y cierra menú.
- **Se conecta con:** ninguno externo (solo React). Usa clases CSS del módulo Usuarios (`menu-acciones`, `menu-acciones-lista`, etc.).
- **Recorrido línea por línea:**

  - L1–L43: Encabezado (motivación: menú vs select, acciones reales solo cambio de rol). 
  - L44–L57: Props: `usuario`, `roles`, `esPropio`, `guardando`, `alCambiar`. Estado `abierto` (boolean). Refs `contenedor`, `boton`. 
  - L58–L73: Comentarios sobre refs. 
  - L74–L94: useEffect clic fuera: agrega `mousedown` listener solo si `abierto`, usa `contenedor.current.contains(evento.target)`, cleanup. 
  - L95–L118: useEffect Escape: `keydown`, si `Escape` → `setAbierto(false)`, `boton.current?.focus()`, cleanup. 
  - L119–L138: `ejecutar = useCallback((rolNuevo)=>{ setAbierto(false); alCambiar(usuario.id,rolNuevo); }, [alCambiar,usuario.id])`. `textoAccion(rol)=\`Convertir en ${rol.etiqueta}\``. 
  - L139–L158: Caso sin acciones: si `esPropio` → retorna `<span class="texto-ayuda">No podés cambiar tu propio rol</span>`. 
  - L159–L168: Si `guardando` → `<span class="texto-guardando">Guardando...</span>`. 
  - L169–L189: Render botón toggle: clase `btn btn-sm btn-info`, `aria-haspopup="menu"`, `aria-expanded={abierto}`, `aria-controls={\`menu-acciones-${usuario.id}\`}`. 
  - L190–L227: Si abierto → `<ul class="menu-acciones-lista" id={...} role="menu">`. Mapea `roles`: `esElActual = rol.valor===usuario.rol`. Cada `<li role="none">` con `<button role="menuitem" class="menu-acciones-item" disabled={esElActual} onClick={()=>ejecutar(rol.valor)}>`. Si actual muestra texto + `<span class="menu-acciones-actual">(ya es su rol)</span>`, else solo texto. 
  - L228–L230: Cierre.

---

## `src/components/Usuarios/Usuarios.jsx` (530 líneas)

- **Rol:** Gestión de roles (solo admin). Lista cuentas con paginación, búsqueda por nombre/email con debounce (400ms), filtro por rol. Permite cambiar `tipo_usuario` vía menú de acciones. Muestra `nota_vinculacion` del backend. Protege UI si no es admin. Normaliza roles (string u objeto), usa fallback. Actualiza solo fila afectada al cambiar rol.
- **Se conecta con:** `../../api/client` (`client.get`, `client.patch`), `../../hooks/useAuth` (`useAuth`), `./MenuAcciones`, `./Usuarios.css`.
- **Recorrido línea por línea:**

  - L1–L35: Encabezado (alcance: cambiar rol únicamente; permisos decididos backend; defensa real backend). Imports React (`useState`, `useEffect`, `useCallback`), client, `useAuth`, `MenuAcciones`, CSS. 
  - L36–L59: `ROLES_FALLBACK` (paciente/medico/admin). `ETIQUETAS_ROL` map. Constante `ESPERA_BUSQUEDA_MS = 400`. 
  - L60–L94: `normalizarRol(rol)` → retorna `{valor, etiqueta}` aceptando string u objeto; etiqueta cae a `ETIQUETAS_ROL[valor]||valor`. 
  - L95–L103: Comentario debounce. 
  - L104–L144: Componente. `usuario` auth. Estados tabla: `datos={items,total,total_paginas}`, `pagina`, `busqueda`, `busquedaAplicada`, `filtroRol`. Estados UI: `cargando`, `guardandoId`, `error`, `aviso`. `roles` inicial con fallback. 
  - L145–L175: useEffect carga roles `/api/usuarios/roles` al montar: lee `data.data`, valida array no vacío, normaliza y filtra con `valor`, catch silencioso. `cancelado`. 
  - L176–L193: Debounce búsqueda → tras 400ms setea `busquedaAplicada=busqueda`, `pagina=1`, cleanup timer. 
  - L194–L227: `cargarUsuarios = useCallback(async ()=>{...}, [pagina,busquedaAplicada,filtroRol])`. `setCargando(true)`, limpia error, `client.get('/api/usuarios', {params:{pagina,por_pagina:10,q:busquedaAplicada,rol:filtroRol}})`, setea `datos=data.data`, catch `setError(mensajeDeError(err))`, finally `setCargando(false)`. 
  - L229–L233: useEffect dispara `cargarUsuarios` al cambiar dependencias. 
  - L234–L241: useEffect auto-limpia `aviso` a los 3000ms. 
  - L242–L276: `cambiarRol = async (idUsuario,rolNuevo)=>{ setGuardandoId(idUsuario), limpia error/aviso, try { const {data}=await client.patch(\`/api/usuarios/${idUsuario}/rol\`,{rol:rolNuevo}); setDatos(anterior=>({...anterior, items: anterior.items.map(u=>u.id===idUsuario?data.data:u)})); setAviso('Rol actualizado correctamente'); } catch(err){ setError(mensajeDeError(err)); } finally { setGuardandoId(null); } }`. 
  - L277–L291: `etiquetaDeRol = useCallback(valor => roles.find(r=>r.valor===valor)?.etiqueta??valor, [roles])`. 
  - L292–L304: Guard UI: si `usuario?.tipo_usuario!=='admin'` → muestra alerta "Esta pantalla es solo para administradores.". 
  - L305–L318: Header. 
  - L319–L323: Errores/avisos. 
  - L324–L362: Filtros: input búsqueda (value `busqueda`, onChange actualiza → dispara debounce), select filtro rol (value `filtroRol`, onChange setea + `pagina=1`), opciones "Todos" + mapeo roles con `key=r.valor`, `value=r.valor`, texto `r.etiqueta`. 
  - L363–L373: Si `cargando` → spinner + "Cargando usuarios...". 
  - L373–L377: Si sin items → alerta "No se encontraron usuarios con esos filtros.". 
  - L377–L471: Tabla: encabezados Nombre, Email, Rol, Estado, Acción. Cuerpo mapea `datos.items`: calcula `esPropio = Number(u.id)===Number(usuario?.id)`. Fila: nombre + `(vos)` si propio, email, columna Rol con `<span class="rol-pildora">{etiquetaDeRol(u.rol)}</span>` (solo dato), columna Estado con badge `badge-activo`/`badge-inactivo`, columna Acción con `<MenuAcciones usuario={u} roles={roles} esPropio={esPropio} guardando={guardandoId===u.id} alCambiar={cambiarRol}/>`, debajo muestra `u.nota_vinculacion||'—'` en `.texto-ayuda`. 
  - L472–L494: Paginación si `datos.total_paginas>1`: botones Anterior/Siguiente disabled según límites, muestra "Página X de Y (Z usuarios)". 
  - L495–L498: Cierre componente. 
  - L500–L530: `mensajeDeError(err)` helper: sin `response` → "No se pudo conectar..."; `ECONNABORTED` → timeout; else toma `err.response.data?.mensaje || data?.error || 'Ocurrió un error inesperado'`.

---

## `src/components/Usuarios/Usuarios.css` (307 líneas)

- **Rol:** Estilos pantalla Usuarios y menú de acciones. Repite algunas reglas de tabla/badges con tokens (copia intencional para evitar acoplamiento silencioso). 
- **Recorrido línea por línea (agrupado):**

  - L1–L27: Encabezado CSS (dos familias: estructura + menú; explicación copia intencional vs Medicos.css). 
  - L28–L36: `.usuarios-container` (max-width 1200px, centrado, padding, min-height). 
  - L37–L57: Cabecera `.usuarios-container .lista-header`, h1 con `var(--texto-xl)`, `.lista-subtitulo` con `var(--texto-sm)`, `var(--texto-suave)`. 
  - L58–L95: Filtros `.usuarios-filtros` (flex wrap, gap), `.usuarios-filtros .form-grupo` (flex grow), inputs/selects con tokens, focus-visible con `var(--info)`. 
  - L96–L132: Tabla `.tabla`, thead fondo `var(--fondo)`, borde, `th` (padding, weight, `var(--texto-sm)`, `var(--texto-medio)`), `tbody tr` borde, hover `var(--fondo)`, `td` padding, `var(--texto-sm)`, `var(--texto-medio)`. 
  - L133–L174: Badges `.badge` (inline-block, pill, `var(--texto-xs)`, blanco), `.badge-activo` `var(--exito)`, `.badge-inactivo` `var(--error)`. `.badge-propio` `var(--primario-fuerte)`, `var(--texto-xs)`. `.rol-pildora` (pill azul) con `var(--info-texto)`, `var(--info-fondo)`, `var(--radio-full)`, `white-space:nowrap`, `var(--texto-xs)`, `var(--peso-fuerte)`. 
  - L175–L195: Texto ayuda/guardado `.texto-ayuda` (block, margin-top, `var(--texto-xs)`, `var(--texto-suave)`), `.texto-guardando` (`var(--texto-suave)`, `var(--texto-xs)`). 
  - L196–L214: Paginación `.paginacion` (flex space-between, gap, margin-top), `button:disabled` `cursor:not-allowed`. 
  - L215–L233: Encabezado menú: explicación `position:relative` por fila, botón+ul vs select nativo. 
  - L234–L238: `.menu-acciones` (relative, inline-block). 
  - L239–L264: Lista `.menu-acciones-lista` (absolute, top+4px, left, min-width 230px, z-index 100, padding 4px, `list-style:none`, fondo `var(--superficie)`, borde `var(--borde-fuerte)`, `var(--radio-sm)`, sombra `var(--sombra)`). 
  - L265–L291: Items `.menu-acciones-item` (block width 100%, padding, `var(--texto-sm)`, left align, sin fondo/borde, pill radius, pointer). Hover/focus-visible → `var(--primario-suave)`, `var(--primario-fuerte)`. `:disabled` → `var(--texto-tenue)`, `cursor:not-allowed`. 
  - L292–L307: `.menu-acciones-actual` (`var(--texto-xs)`, `var(--texto-tenue)`).
# Guion de presentación de SaludWEB

Este guion está pensado para una demo en vivo o un video de presentación. La idea
es contar primero el problema y las bondades del sistema, y después demostrar el
circuito completo con los tres roles: paciente, médico y administrador.

## 1. Introducción: por qué existe SaludWEB

SaludWEB es un sistema de gestión de salud y turnos online. Su objetivo no es
solo "digitalizar una agenda": es eliminar el ida y vuelta que hoy hace perder
tiempo a pacientes y consultorios.

Las turneras tradicionales suelen tener los mismos problemas:

- Hay que llamar en un horario limitado, muchas veces mientras la persona trabaja.
- La agenda vive en papel, en Excel o en la cabeza de quien atiende.
- Dos personas pueden terminar reservando el mismo horario.
- El paciente no sabe si el turno quedó confirmado hasta que vuelve a llamar.
- Los datos del paciente, su turno y su receta quedan separados.

SaludWEB propone otra cosa: una sola agenda, visible para el paciente y para el
médico, con horarios reales y confirmación inmediata. El paciente elige
especialidad, profesional, día y hora desde el celular o la computadora. Cuando
confirma, el turno aparece en la agenda del médico en el mismo horario. No hay
dos versiones de la verdad.

La HOME del sistema replica el flyer de presentación: fondo azul con patrón
tecnológico, logo blanco, mujer de cabello largo y claro con flequillo recto,
anteojos con bordes violeta oscuro, remera roja de mangas largas y collar gris en
forma de luna, las cuatro funciones principales, un robot
con laptop y el nombre de la integrante. Desde ahí se accede a la turnera pública.

## 2. Demo como paciente

1. Abrir la HOME (`/`) y mostrar la propuesta: turnos online, horarios
   actualizados, acceso desde cualquier pantalla.
2. Entrar a **Turnera** y mostrar el catálogo público de especialidades y
   profesionales. La turnera se puede mirar sin iniciar sesión.
3. Iniciar sesión con la cuenta de paciente de demostración.
4. Elegir una especialidad y un profesional.
5. **Elegir el día y el horario.** Este es el momento más importante de la demo:
   el sistema muestra los horarios realmente disponibles y el paciente decide
   cuál le sirve.
6. Confirmar la reserva.
7. Abrir **Mis turnos** y mostrar que el turno quedó registrado con fecha, hora,
   profesional y estado.

Frase para acompañar:

> "El paciente no llama, no espera y no adivina: elige el horario que ve
> disponible y recibe la confirmación en el momento."

## 3. Demo como médico

1. Cerrar sesión y entrar con la cuenta de médico de demostración.
2. En el **Dashboard**, mostrar la sección **Pacientes que reservaron** con fecha,
   hora, paciente y estado.
3. Abrir **Mi agenda** desde el menú y mostrar que el turno reservado por el
   paciente aparece con la misma fecha, la misma hora y el nombre del paciente.
4. Señalar que el médico no ve la agenda de otro profesional: el backend limita
   la consulta a su propio vínculo.

Frase para acompañar:

> "No hay que avisarle al médico por otro canal: lo que reservó el paciente ya
> está en su agenda. Las dos pantallas muestran el mismo turno."

## 4. Demo como administrador

1. Cerrar sesión y entrar con la cuenta de administrador.
2. Abrir el **Dashboard** y hacer un paneo general: cantidad de turnos, estado
   del consultorio y accesos a los módulos.
3. Mostrar la gestión de **Médicos**, **Pacientes** y **Usuarios**.
4. Explicar que cada rol ve solo lo que le corresponde: el paciente no administra
   profesionales, el médico no gestiona usuarios y el administrador tiene la
   vista general.

Frase para acompañar:

> "El administrador no necesita pedir un reporte aparte: el panel le muestra el
> estado general y los módulos desde donde puede intervenir."

## 5. Cierre: las bondades del sistema

SaludWEB ya funciona de punta a punta:

- El paciente reserva solo, elige el horario y consulta sus turnos.
- El médico ve su agenda actualizada y trabaja con sus pacientes y recetas.
- El administrador controla profesionales, pacientes, usuarios y estadísticas.
- La misma aplicación se usa desde celulares, tablets y computadoras.
- Los datos están centralizados y protegidos por autenticación y permisos por rol.
- La web puede instalarse como aplicación (PWA) y la app móvil acompaña el uso
  desde el celular.

Cierre personal:

> "Este proyecto también es el resultado de toda la Tecnicatura. Acá se juntan
> las bases de programación, bases de datos, análisis de sistemas, organización
> y metodología, con las herramientas más actuales de desarrollo y el uso de
> inteligencia artificial como apoyo para aprender, revisar y mejorar el código.
> SaludWEB no es solo una práctica: es un sistema que ya viene funcionando y que
> puede seguir creciendo."

## 6. Orden sugerido para grabar

1. HOME e introducción: 30 a 45 segundos.
2. Problema de las turneras: 30 segundos.
3. Paciente: reserva y elección de horario: 1 a 2 minutos.
4. Médico: el mismo turno en su agenda: 30 a 45 segundos.
5. Administrador: paneo del dashboard: 30 a 45 segundos.
6. Cierre y aprendizaje: 30 segundos.

Duración total estimada: 4 a 5 minutos.

## 7. Credenciales y datos de demo

Usar las cuentas de demostración documentadas en el README principal. Antes de
grabar, verificar que el backend esté levantado y que la turnera tenga al menos
un profesional con disponibilidad publicada para el día de la demo.

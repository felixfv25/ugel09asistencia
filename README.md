# Sistema de registro de asistencia — UGEL 09

Proyecto en construcción, avanzando por fases. Este README se irá
actualizando en cada fase.

## Pulido visual ✅

Lo nuevo en esta fase:

- **Layout de dos columnas en pantallas grandes** (PC): formulario a la
  izquierda, tabla de visitas y exportar a la derecha. En celular sigue
  viéndose en una sola columna, como antes.
- Sombras suaves, mejor tipografía, transiciones en botones y estados
  de foco más claros en los campos.
- Panel de administración con mejor distribución: áreas y asuntos lado
  a lado en PC.
- Detalles: mensajes de confirmación con animación sutil, filas de
  tabla alternadas para facilitar la lectura, encabezados de tabla más
  claros.
- El círculo "09" se mantiene como marcador temporal del logo; cuando
  se tenga el logo oficial de la UGEL 09, se reemplaza en un solo lugar
  (la clase `.logo` en `estilos.css` y el `<div class="logo">` en cada
  página).

## Fase 6 — API lista para la app móvil ✅

Lo nuevo en esta fase:

- El servidor ahora escucha en toda la red local (no solo en
  `localhost`), y al correr `npm start` te muestra en la terminal la
  dirección IP para conectarte desde un celular en el mismo WiFi.
- Nuevo archivo **`API.md`** en la raíz del proyecto: documentación
  completa de todos los endpoints (formulario, exportar, login,
  administración), con ejemplos de cada petición y respuesta. Este es
  el documento que se usará como referencia al construir la app móvil,
  ya que no habrá que tocar el backend para eso.

## Fase 5 — Panel de administración ✅

Lo nuevo en esta fase:

- Nueva página **`frontend/admin.html`**, separada del formulario público
  (los visitantes no la ven). Hay un enlace discreto abajo del todo en
  la página principal.
- **Inicio de sesión** obligatorio para entrar al panel.
- Gestión de **áreas** y **asuntos**: agregarlos o quitarlos desde el
  panel, sin tocar ningún archivo de código. Los cambios se reflejan de
  inmediato en el formulario de registro.
- **Reporte** de visitas por área, en el rango de fechas que elijas.
- Posibilidad de **crear más usuarios administradores** desde el propio
  panel (para dar acceso a otro miembro del personal).

### Crear el primer usuario administrador

Antes de poder entrar al panel por primera vez, hay que crear un usuario
desde la terminal (por seguridad, no viene ninguno "de fábrica"):

```bash
cd backend
node src/crear-admin.js admin TuClaveSegura123
```

Cambia `admin` y `TuClaveSegura123` por el usuario y contraseña que
prefieras (mínimo 6 caracteres). Puedes correr este comando de nuevo
más adelante para cambiar la contraseña de ese mismo usuario.

## Fase 4 — Exportar a Excel ✅

Lo nuevo en esta fase:

- Nueva sección **"Exportar a Excel"** debajo de la tabla, con selector
  de fecha "Desde", "Hasta" y un desplegable opcional de área.
- Botón **"Descargar Excel"**: genera y descarga un archivo `.xlsx` con
  las 9 columnas solicitadas (Fecha, Nombres, Apellidos, Celular, Hora
  de ingreso, Hora de salida, Área/oficina, Asunto, DNI).
- Si no se elige un área, exporta todas. Si se elige, filtra solo esa
  área.
- El nombre del archivo se genera automáticamente según el rango de
  fechas elegido (ej: `asistencia_2026-08-23.xlsx`).

## Fase 3 — Salida y listado del día ✅

Lo nuevo en esta fase:

- Tabla **"Visitas de hoy"** debajo del formulario, que muestra DNI,
  nombre, hora de ingreso, hora de salida, área y asunto de cada visita
  registrada en el día.
- Botón **"Marcar salida"** por cada fila: al presionarlo, guarda la
  hora de salida actual y la fila se actualiza sola.
- Una vez marcada la salida, ya no se puede volver a marcar (el sistema
  lo bloquea).
- Botón **"Actualizar"** para refrescar la tabla manualmente.
- La tabla se refresca sola automáticamente después de registrar un
  nuevo ingreso.

## Fase 2 — Formulario de registro ✅

Lo nuevo en esta fase:

- Formulario real en `frontend/index.html`: DNI, nombres, apellidos,
  celular, área y asunto.
- Al escribir un DNI de 8 dígitos, se busca automáticamente:
  - Si la persona ya existe, se autocompletan nombres y apellidos
    (quedan bloqueados para evitar errores) y el celular se puede
    actualizar.
  - Si no existe, se habilitan los campos para registrarla por primera
    vez.
- Al enviar el formulario, se guarda el ingreso con la fecha y hora
  actuales del servidor.
- Validaciones: DNI de 8 dígitos, nombres/apellidos/área/asunto
  obligatorios. Los errores se muestran en pantalla.
- Mensaje de confirmación al registrar el ingreso correctamente.

## Fase 1 — Proyecto base ✅

Lo que ya funciona en esta fase:

- Servidor backend (Node.js + Express) levantado.
- Base de datos SQLite creada automáticamente (`backend/asistencia.db`),
  con sus tablas `personas` y `registros`. Usa el módulo `node:sqlite`
  incluido en Node.js (no requiere instalar Visual Studio ni compiladores
  de C++, solo Node.js).
- Endpoint de prueba `GET /api/salud`.
- Endpoint `GET /api/opciones` que devuelve la lista de áreas y asuntos
  (editable en `backend/src/config.js`).
- Endpoint `GET /api/personas/:dni` para buscar si una persona ya está
  registrada.
- Página web mínima (`frontend/index.html`) que confirma la conexión
  con el backend.

## Cómo probarlo

1. Abre esta carpeta en Visual Studio Code.
2. Abre una terminal dentro de VS Code (`Terminal > Nueva terminal`).
3. Instala las dependencias del backend:

   ```bash
   cd backend
   npm install
   ```

4. Levanta el servidor:

   ```bash
   npm start
   ```

   Deberías ver: `Servidor UGEL 09 escuchando en http://localhost:3000`

5. Abre el archivo `frontend/index.html` con "Live Server" (extensión de
   VS Code) o simplemente haciendo doble clic para abrirlo en el
   navegador. Debería decir **"Conectado: Servidor UGEL 09 funcionando"**.

## Editar las áreas u oficinas

Abre `backend/src/config.js` y edita la lista `AREAS`. No hace falta
tocar ningún otro archivo.

## Próxima fase

Con esto se completó todo el plan original. Los siguientes pasos
posibles, cuando quieras:

- Reemplazar el círculo "09" por el logo oficial de la UGEL 09.
- Confirmar la lista definitiva de áreas/oficinas (se puede editar
  directamente desde el panel de administración, sin tocar código).
- Empezar la app móvil, usando `API.md` como referencia.
- Migrar de SQLite a un servidor de base de datos si en algún momento
  varias computadoras necesitan compartir la misma información al
  mismo tiempo.

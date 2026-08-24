# API — Sistema de asistencia UGEL 09

Esta es la documentación de todos los endpoints del backend. La futura
app móvil va a consumir exactamente esta misma API, sin necesidad de
duplicar ninguna lógica: todo (base de datos, reglas de negocio,
validaciones) vive en un solo lugar, aquí en el backend.

## Base URL

- Desde la misma computadora: `http://localhost:3000/api`
- Desde un celular u otro dispositivo en la misma red WiFi:
  `http://<IP-de-la-PC>:3000/api` (la IP se muestra en la terminal al
  correr `npm start`, en la línea que dice "También accesible desde...").

Todas las rutas de abajo asumen que ya se les antepuso la base URL.

## Autenticación

Los endpoints bajo `/admin/...` requieren haber iniciado sesión. Hay que
enviar el token que devuelve `/auth/login` en cada petición, así:

```
Authorization: Bearer <token>
```

Los demás endpoints (los que usa el formulario de visitantes) son
públicos, no requieren token.

---

## Endpoints públicos (formulario de visitantes)

### GET /salud
Verifica que el servidor esté funcionando.

**Respuesta 200:**
```json
{ "estado": "ok", "mensaje": "Servidor UGEL 09 funcionando" }
```

### GET /opciones
Devuelve la lista actual de áreas y asuntos (para llenar los
desplegables del formulario).

**Respuesta 200:**
```json
{ "areas": ["Trámite documentario", "..."], "asuntos": ["Consulta", "..."] }
```

### GET /personas/:dni
Busca si una persona ya está registrada, por su DNI.

**Respuesta 200 (existe):**
```json
{ "encontrada": true, "persona": { "dni": "71234567", "nombres": "Juan", "apellidos": "Perez", "celular": "987654321" } }
```

**Respuesta 404 (no existe):**
```json
{ "encontrada": false }
```

### POST /registros
Registra el ingreso de una visita. Crea la persona si no existía, o
actualiza sus datos si ya existía.

**Body:**
```json
{
  "dni": "71234567",
  "nombres": "Juan Carlos",
  "apellidos": "Perez Diaz",
  "celular": "987654321",
  "area": "Trámite documentario",
  "asunto": "Consulta"
}
```

**Respuesta 201:**
```json
{
  "ok": true,
  "registro": { "id": 1, "dni": "71234567", "fecha": "2026-08-23", "hora_ingreso": "14:29", "area": "...", "asunto": "..." }
}
```

**Respuesta 400** (algún campo obligatorio falta o el DNI no tiene 8
dígitos): `{ "error": "mensaje explicando qué falta" }`

### GET /registros/hoy
Lista todas las visitas del día actual (las más recientes primero).

**Respuesta 200:**
```json
{
  "fecha": "2026-08-23",
  "registros": [
    { "id": 2, "dni": "70000001", "fecha": "2026-08-23", "hora_ingreso": "14:29", "hora_salida": null, "area": "Legal", "asunto": "Firma", "nombres": "Maria", "apellidos": "Lopez", "celular": "999888777" }
  ]
}
```

### PATCH /registros/:id/salida
Marca la hora de salida de una visita puntual (usa el `id` del
registro, no el DNI).

**Respuesta 200:**
```json
{ "ok": true, "id": 1, "hora_salida": "16:45" }
```

**Respuesta 400** si esa visita ya tenía salida marcada.
**Respuesta 404** si el `id` no existe.

### GET /exportar?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&area=Opcional
Descarga un archivo Excel (.xlsx) con las visitas del rango de fechas
indicado. El parámetro `area` es opcional (si no se envía, exporta
todas las áreas). Responde con el archivo binario directamente, no con
JSON.

---

## Autenticación (personal administrativo)

### POST /auth/login
**Body:** `{ "usuario": "admin", "password": "..." }`

**Respuesta 200:**
```json
{ "ok": true, "token": "abc123...", "usuario": "admin" }
```

**Respuesta 401** si el usuario o contraseña son incorrectos.

### POST /auth/logout
Requiere el header `Authorization: Bearer <token>`. Invalida la sesión.

**Respuesta 200:** `{ "ok": true }`

---

## Endpoints de administración (requieren sesión)

Todos estos requieren el header `Authorization: Bearer <token>`.

### GET /admin/areas
`{ "areas": [ { "id": 1, "nombre": "Trámite documentario" }, ... ] }`

### POST /admin/areas
**Body:** `{ "nombre": "Mesa de partes" }` → crea una nueva área.

### DELETE /admin/areas/:id
Elimina un área por su `id`.

### GET /admin/asuntos
Igual que `/admin/areas`, pero para la lista de asuntos.

### POST /admin/asuntos
**Body:** `{ "nombre": "Reclamo" }`

### DELETE /admin/asuntos/:id

### POST /admin/usuarios
Crea un nuevo usuario administrador.
**Body:** `{ "usuario": "recepcion2", "password": "ClaveSegura123" }`
(la contraseña debe tener al menos 6 caracteres)

### GET /admin/reporte?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
Total de visitas agrupado por área, en el rango de fechas indicado.

**Respuesta 200:**
```json
{
  "desde": "2026-08-23",
  "hasta": "2026-08-23",
  "totalGeneral": 5,
  "porArea": [ { "area": "Legal", "total": 3 }, { "area": "RRHH", "total": 2 } ]
}
```

---

## Notas para cuando se construya la app móvil

- La app móvil puede reutilizar el 100% de estos endpoints tal como
  están; no hace falta tocar el backend para eso.
- Si la app se va a probar en el celular del desarrollador (mismo WiFi
  que la PC), usar la IP local en vez de `localhost` (ver "Base URL"
  arriba).
- Si más adelante se necesita usar la app fuera de la red local (por
  ejemplo, personal de la UGEL entrando desde su celular con datos
  móviles, no WiFi), habría que publicar el backend en un servidor con
  IP pública o un servicio en la nube — eso es un paso aparte que
  podemos planear cuando llegue el momento.

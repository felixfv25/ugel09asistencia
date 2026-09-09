// db.js
// Se encarga UNICAMENTE de conectar con la base de datos y crear las tablas
// si todavia no existen. Ningun otro archivo deberia tocar la base de datos
// directamente: todos pasan por aqui.
//
// A partir de ahora la base de datos vive en Turso (nube), no en un
// archivo local dentro de Render. Asi, aunque se suba codigo nuevo y
// Render reconstruya el servidor desde cero, los datos (visitantes,
// registros, areas, asuntos, usuarios) NO se pierden: viven aparte.
//
// Turso exige 2 datos, guardados como variables de entorno en Render
// (pestaña "Environment"), nunca escritos aqui en el codigo:
//   TURSO_DATABASE_URL
//   TURSO_AUTH_TOKEN

const { createClient } = require("@libsql/client");
const { hashPassword } = require("./auth");

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  console.error(
    "Faltan las variables de entorno TURSO_DATABASE_URL y/o TURSO_AUTH_TOKEN. " +
      "Configuralas en Render, pestaña 'Environment'."
  );
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const AREAS_INICIALES = [
  "Convivencia escolar",
  "CPPA-Docente",
  "Secretaría Técnica",
  "Dirección",
  "Actas y Certificados",
  "Notificación",
  "Tesorería",
  "Constancia de Pago",
  "Informática",
  "PGA",
  "DGP - Área de Gestión Pedagógica",
  "Almacén",
  "Abastecimiento",
  "Pronoei",
  "Personal",
  "OCI",
  "B.S - Bienestar Social",
  "Escalafón",
  "Médico / Enfermería",
  "Contabilidad",
  "Supervisor de Colegio Privado",
  "Archivo",
  "PIID",
  "AGI - Área de Gestión Institucional",
  "Asesoría Legal",
  "Imagen",
  "PREVAED",
  "Otro",
];

const ASUNTOS_INICIALES = [
  "Revisar Expediente",
  "Realizar Denuncia",
  "Seguimiento de Expediente",
  "Quejas",
  "Recojo de Documento",
  "Otro",
];

// Crea las tablas (si no existen) y siembra los datos iniciales.
// Hay que esperar a que esto termine (await) ANTES de aceptar pedidos,
// por eso server.js lo llama al arrancar, antes de app.listen().
async function inicializar() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS personas (
      dni        TEXT PRIMARY KEY,
      nombres    TEXT NOT NULL,
      apellidos  TEXT NOT NULL,
      celular    TEXT,
      creado_en  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS registros (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      dni           TEXT NOT NULL REFERENCES personas(dni),
      fecha         TEXT NOT NULL,
      hora_ingreso  TEXT NOT NULL,
      hora_salida   TEXT,
      area          TEXT NOT NULL,
      asunto        TEXT NOT NULL,
      creado_en     TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS areas (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS asuntos (
      id     INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL UNIQUE
    );
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      usuario        TEXT NOT NULL UNIQUE,
      password_hash  TEXT NOT NULL,
      creado_en      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
    );
  `);

  // Usuario de porteria por defecto (solo se crea si no existe).
  await db.execute({
    sql: "INSERT OR IGNORE INTO usuarios (usuario, password_hash) VALUES (?, ?)",
    args: ["porteria", hashPassword("porteria09")],
  });

  // Usuario de admin por defecto (solo se crea si no existe).
  // Usuario:    admin09
  // Contraseña: admin09   <-- cambiala cuando puedas desde el panel de admin.
  await db.execute({
    sql: "INSERT OR IGNORE INTO usuarios (usuario, password_hash) VALUES (?, ?)",
    args: ["admin09", hashPassword("admin09")],
  });

  // Corregir/renombrar/eliminar areas antiguas (para bases de datos que
  // ya estaban en uso). Si el nombre viejo no existe, no hace nada.
  await db.execute("UPDATE areas SET nombre = 'CPPA-Docente' WHERE nombre = 'EPPD-D'");
  await db.execute("DELETE FROM areas WHERE nombre = 'T.D.'");
  await db.execute(
    "UPDATE areas SET nombre = 'DGP - Área de Gestión Pedagógica' WHERE nombre = 'DGP'"
  );
  await db.execute("UPDATE areas SET nombre = 'B.S - Bienestar Social' WHERE nombre = 'B.S.'");
  await db.execute(
    "UPDATE areas SET nombre = 'AGI - Área de Gestión Institucional' WHERE nombre = 'AGI'"
  );
  await db.execute("UPDATE areas SET nombre = 'Asesoría Legal' WHERE nombre = 'A.L.'");

  // INSERT OR IGNORE: agrega solo lo que falte, sin duplicar ni borrar
  // nada de lo que ya tenias guardado.
  for (const nombre of AREAS_INICIALES) {
    await db.execute({ sql: "INSERT OR IGNORE INTO areas (nombre) VALUES (?)", args: [nombre] });
  }
  for (const nombre of ASUNTOS_INICIALES) {
    await db.execute({ sql: "INSERT OR IGNORE INTO asuntos (nombre) VALUES (?)", args: [nombre] });
  }
}

module.exports = { db, inicializar };

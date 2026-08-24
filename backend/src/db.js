// db.js
// Se encarga UNICAMENTE de conectar con la base de datos y crear las tablas
// si todavia no existen. Ningun otro archivo deberia tocar la base de datos
// directamente: todos pasan por aqui.

const path = require("path");
const { DatabaseSync } = require("node:sqlite");

// El archivo .db se crea solo, en la carpeta backend/. No requiere instalar
// ningun servidor de base de datos aparte, ni ningun paquete adicional:
// node:sqlite viene incluido dentro de Node.js desde la version 22.
const DB_PATH = path.join(__dirname, "..", "asistencia.db");

const db = new DatabaseSync(DB_PATH);

// Tabla de personas externas (visitantes).
// El DNI es la clave: la primera vez que alguien viene se crea su fila aqui,
// las siguientes veces solo se busca por DNI y se reutiliza.
db.exec(`
  CREATE TABLE IF NOT EXISTS personas (
    dni        TEXT PRIMARY KEY,
    nombres    TEXT NOT NULL,
    apellidos  TEXT NOT NULL,
    celular    TEXT,
    creado_en  TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

// Tabla de registros: cada fila es UNA visita (un ingreso, con su salida).
// Una misma persona (mismo DNI) puede tener muchos registros, uno por cada
// vez que entra a la UGEL.
db.exec(`
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

// Tabla de areas: antes vivian en un archivo de configuracion fijo
// (config.js). Ahora viven aqui para que el panel de administracion las
// pueda editar sin tocar codigo.
db.exec(`
  CREATE TABLE IF NOT EXISTS areas (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
  );
`);

// Tabla de asuntos/motivos de visita, mismo criterio que las areas.
db.exec(`
  CREATE TABLE IF NOT EXISTS asuntos (
    id     INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL UNIQUE
  );
`);

// Tabla de usuarios del sistema (el personal de la UGEL que administra la
// aplicacion, NO los visitantes externos). La contrasena nunca se guarda
// en texto plano, solo su hash (ver src/auth.js).
db.exec(`
  CREATE TABLE IF NOT EXISTS usuarios (
    id             INTEGER PRIMARY KEY AUTOINCREMENT,
    usuario        TEXT NOT NULL UNIQUE,
    password_hash  TEXT NOT NULL,
    creado_en      TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
  );
`);

// --- Datos iniciales (solo se insertan la primera vez que se crea la BD) ---

const AREAS_INICIALES = [
  "Trámite documentario",
  "Recursos humanos (RRHH)",
  "Asesoría legal",
  "Gestión pedagógica",
  "Gestión institucional",
  "Gestión administrativa",
  "Escalafón",
  "Otro",
];

const ASUNTOS_INICIALES = [
  "Consulta",
  "Entrega de documento",
  "Firma",
  "Recojo de documento",
  "Reclamo",
  "Otro",
];

const yaHayAreas = db.prepare("SELECT COUNT(*) AS total FROM areas").get().total > 0;
if (!yaHayAreas) {
  const insertar = db.prepare("INSERT INTO areas (nombre) VALUES (?)");
  AREAS_INICIALES.forEach((nombre) => insertar.run(nombre));
}

const yaHayAsuntos = db.prepare("SELECT COUNT(*) AS total FROM asuntos").get().total > 0;
if (!yaHayAsuntos) {
  const insertar = db.prepare("INSERT INTO asuntos (nombre) VALUES (?)");
  ASUNTOS_INICIALES.forEach((nombre) => insertar.run(nombre));
}

module.exports = db;

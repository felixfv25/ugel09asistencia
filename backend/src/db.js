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

// --- Usuario de porteria por defecto ---
// Se crea solo si no existe (INSERT OR IGNORE), asi que si luego cambias
// la contrasena desde el codigo o con el truco del reset temporal, esto
// no la vuelve a sobreescribir en cada reinicio del servidor.
// Usuario:    porteria
// Contraseña: porteria09   <-- cambiala cuando puedas, mismo metodo que usamos para el admin.
const { hashPassword } = require("./auth");
db.prepare(
  "INSERT OR IGNORE INTO usuarios (usuario, password_hash) VALUES (?, ?)"
).run("porteria", hashPassword("porteria09"));

// --- Datos iniciales (solo se insertan la primera vez que se crea la BD) ---

const AREAS_INICIALES = [
  "Convivencia escolar",
  "EPPD-D",
  "Secretaría Técnica",
  "Dirección",
  "Actas y Certificados",
  "Notificación",
  "T.D.",
  "Tesorería",
  "Constancia de Pago",
  "Informática",
  "PGA",
  "DGP",
  "Almacén",
  "Abastecimiento",
  "Pronoei",
  "Personal",
  "OCI",
  "B.S.",
  "Escalafón",
  "Médico / Enfermería",
  "Contabilidad",
  "Supervisor de Colegio Privado",
  "Archivo",
  "PIID",
  "AGI",
  "A.L.",
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

// INSERT OR IGNORE (en vez de solo insertar si la tabla esta vacia): asi, si
// ya tenias areas/asuntos guardados desde antes, esto SOLO agrega los que
// falten de esta lista, sin duplicar ni borrar nada de lo que ya tenias.
const insertarArea = db.prepare("INSERT OR IGNORE INTO areas (nombre) VALUES (?)");
AREAS_INICIALES.forEach((nombre) => insertarArea.run(nombre));

const insertarAsunto = db.prepare("INSERT OR IGNORE INTO asuntos (nombre) VALUES (?)");
ASUNTOS_INICIALES.forEach((nombre) => insertarAsunto.run(nombre));

module.exports = db;

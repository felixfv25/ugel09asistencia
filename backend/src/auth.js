// auth.js
// Todo lo relacionado a contrasenas y sesiones de administrador.
// Usa solo el modulo "crypto" que ya viene con Node.js, para no depender
// de paquetes externos que puedan requerir compilacion (como nos paso con
// better-sqlite3).

const crypto = require("crypto");

// --- Contrasenas ---
// Nunca se guarda la contrasena en texto plano: se guarda "sal:hash".

function hashPassword(password) {
  const sal = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, sal, 64).toString("hex");
  return `${sal}:${hash}`;
}

function verificarPassword(password, guardado) {
  const [sal, hash] = guardado.split(":");
  const intento = crypto.scryptSync(password, sal, 64).toString("hex");
  // timingSafeEqual evita filtrar informacion por diferencias de tiempo.
  return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(intento, "hex"));
}

// --- Sesiones (tokens) ---
// Sesiones simples en memoria: se pierden si se reinicia el servidor,
// lo cual esta bien para este sistema (solo hay que volver a iniciar sesion).

const sesiones = new Map(); // token -> { usuario, expira }
const DURACION_SESION_MS = 8 * 60 * 60 * 1000; // 8 horas

function crearSesion(usuario) {
  const token = crypto.randomBytes(32).toString("hex");
  sesiones.set(token, { usuario, expira: Date.now() + DURACION_SESION_MS });
  return token;
}

function obtenerUsuarioPorToken(token) {
  const sesion = sesiones.get(token);
  if (!sesion) return null;
  if (Date.now() > sesion.expira) {
    sesiones.delete(token);
    return null;
  }
  return sesion.usuario;
}

function cerrarSesion(token) {
  sesiones.delete(token);
}

// Middleware de Express: protege rutas de administrador.
// Exige un header "Authorization: Bearer <token>" valido.
function requiereSesion(req, res, next) {
  const encabezado = req.headers.authorization || "";
  const token = encabezado.startsWith("Bearer ") ? encabezado.slice(7) : null;
  const usuario = token ? obtenerUsuarioPorToken(token) : null;

  if (!usuario) {
    return res.status(401).json({ error: "Sesión inválida o expirada. Inicia sesión de nuevo." });
  }

  req.usuario = usuario;
  next();
}

module.exports = {
  hashPassword,
  verificarPassword,
  crearSesion,
  obtenerUsuarioPorToken,
  cerrarSesion,
  requiereSesion,
};

// routes/admin.js
// Todo lo que solo el personal de la UGEL puede hacer, iniciando sesion:
// editar la lista de areas y asuntos, y ver un reporte resumido.
// Todas las rutas de este archivo exigen sesion valida (ver server.js).

const express = require("express");
const db = require("../db");

const router = express.Router();

// --- Áreas ---

router.get("/areas", (req, res) => {
  const filas = db.prepare("SELECT id, nombre FROM areas ORDER BY nombre").all();
  res.json({ areas: filas });
});

router.post("/areas", (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre del área es obligatorio." });
  }
  try {
    const resultado = db.prepare("INSERT INTO areas (nombre) VALUES (?)").run(nombre.trim());
    res.status(201).json({ id: resultado.lastInsertRowid, nombre: nombre.trim() });
  } catch (error) {
    res.status(400).json({ error: "Esa área ya existe." });
  }
});

router.delete("/areas/:id", (req, res) => {
  db.prepare("DELETE FROM areas WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// --- Asuntos ---

router.get("/asuntos", (req, res) => {
  const filas = db.prepare("SELECT id, nombre FROM asuntos ORDER BY nombre").all();
  res.json({ asuntos: filas });
});

router.post("/asuntos", (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre del asunto es obligatorio." });
  }
  try {
    const resultado = db.prepare("INSERT INTO asuntos (nombre) VALUES (?)").run(nombre.trim());
    res.status(201).json({ id: resultado.lastInsertRowid, nombre: nombre.trim() });
  } catch (error) {
    res.status(400).json({ error: "Ese asunto ya existe." });
  }
});

router.delete("/asuntos/:id", (req, res) => {
  db.prepare("DELETE FROM asuntos WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// --- Usuarios administradores ---
// Permite crear más usuarios desde el propio panel, sin usar la terminal.

router.post("/usuarios", (req, res) => {
  const { usuario, password } = req.body || {};
  if (!usuario || !password) {
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }

  const { hashPassword } = require("../auth");
  try {
    db.prepare("INSERT INTO usuarios (usuario, password_hash) VALUES (?, ?)").run(
      usuario.trim(),
      hashPassword(password)
    );
    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: "Ese nombre de usuario ya existe." });
  }
});

// --- Reporte resumido ---
// Total de visitas por área, dentro de un rango de fechas.

router.get("/reporte", (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const desde = req.query.desde || hoy;
  const hasta = req.query.hasta || hoy;

  const porArea = db
    .prepare(
      `SELECT area, COUNT(*) AS total
       FROM registros
       WHERE fecha BETWEEN ? AND ?
       GROUP BY area
       ORDER BY total DESC`
    )
    .all(desde, hasta);

  const totalGeneral = porArea.reduce((suma, fila) => suma + fila.total, 0);

  res.json({ desde, hasta, totalGeneral, porArea });
});

module.exports = router;

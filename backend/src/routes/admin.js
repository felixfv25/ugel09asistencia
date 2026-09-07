// routes/admin.js
// Todo lo que solo el personal de la UGEL puede hacer, iniciando sesion:
// editar la lista de areas y asuntos, y ver un reporte resumido.
// Todas las rutas de este archivo exigen sesion valida (ver server.js).

const express = require("express");
const { db } = require("../db");
const { hashPassword } = require("../auth");

const router = express.Router();

// --- Áreas ---

router.get("/areas", async (req, res) => {
  const resultado = await db.execute("SELECT id, nombre FROM areas ORDER BY nombre");
  res.json({ areas: resultado.rows });
});

router.post("/areas", async (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre del área es obligatorio." });
  }
  try {
    const resultado = await db.execute({
      sql: "INSERT INTO areas (nombre) VALUES (?)",
      args: [nombre.trim()],
    });
    res.status(201).json({ id: Number(resultado.lastInsertRowid), nombre: nombre.trim() });
  } catch (error) {
    res.status(400).json({ error: "Esa área ya existe." });
  }
});

router.delete("/areas/:id", async (req, res) => {
  await db.execute({ sql: "DELETE FROM areas WHERE id = ?", args: [req.params.id] });
  res.json({ ok: true });
});

// --- Asuntos ---

router.get("/asuntos", async (req, res) => {
  const resultado = await db.execute("SELECT id, nombre FROM asuntos ORDER BY nombre");
  res.json({ asuntos: resultado.rows });
});

router.post("/asuntos", async (req, res) => {
  const { nombre } = req.body || {};
  if (!nombre || !nombre.trim()) {
    return res.status(400).json({ error: "El nombre del asunto es obligatorio." });
  }
  try {
    const resultado = await db.execute({
      sql: "INSERT INTO asuntos (nombre) VALUES (?)",
      args: [nombre.trim()],
    });
    res.status(201).json({ id: Number(resultado.lastInsertRowid), nombre: nombre.trim() });
  } catch (error) {
    res.status(400).json({ error: "Ese asunto ya existe." });
  }
});

router.delete("/asuntos/:id", async (req, res) => {
  await db.execute({ sql: "DELETE FROM asuntos WHERE id = ?", args: [req.params.id] });
  res.json({ ok: true });
});

// --- Usuarios administradores ---
// Permite crear más usuarios desde el propio panel, sin usar la terminal.

router.post("/usuarios", async (req, res) => {
  const { usuario, password } = req.body || {};
  if (!usuario || !password) {
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios." });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "La contraseña debe tener al menos 6 caracteres." });
  }

  try {
    await db.execute({
      sql: "INSERT INTO usuarios (usuario, password_hash) VALUES (?, ?)",
      args: [usuario.trim(), hashPassword(password)],
    });
    res.status(201).json({ ok: true });
  } catch (error) {
    res.status(400).json({ error: "Ese nombre de usuario ya existe." });
  }
});

// --- Reporte resumido ---
// Total de visitas por área, dentro de un rango de fechas.

router.get("/reporte", async (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const desde = req.query.desde || hoy;
  const hasta = req.query.hasta || hoy;

  const resultado = await db.execute({
    sql: `SELECT area, COUNT(*) AS total
          FROM registros
          WHERE fecha BETWEEN ? AND ?
          GROUP BY area
          ORDER BY total DESC`,
    args: [desde, hasta],
  });
  const porArea = resultado.rows.map((f) => ({ area: f.area, total: Number(f.total) }));

  const totalGeneral = porArea.reduce((suma, fila) => suma + fila.total, 0);

  res.json({ desde, hasta, totalGeneral, porArea });
});

module.exports = router;

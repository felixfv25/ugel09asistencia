// routes/auth.js
// Login y logout del personal de la UGEL que administra el sistema.

const express = require("express");
const db = require("../db");
const { verificarPassword, crearSesion, cerrarSesion } = require("../auth");

const router = express.Router();

// POST /api/auth/login
// Body: { usuario, password }
router.post("/login", (req, res) => {
  const { usuario, password } = req.body || {};

  if (!usuario || !password) {
    return res.status(400).json({ error: "Usuario y contraseña son obligatorios." });
  }

  const fila = db.prepare("SELECT usuario, password_hash FROM usuarios WHERE usuario = ?").get(usuario);

  if (!fila || !verificarPassword(password, fila.password_hash)) {
    return res.status(401).json({ error: "Usuario o contraseña incorrectos." });
  }

  const token = crearSesion(fila.usuario);
  res.json({ ok: true, token, usuario: fila.usuario });
});

// POST /api/auth/logout
router.post("/logout", (req, res) => {
  const encabezado = req.headers.authorization || "";
  const token = encabezado.startsWith("Bearer ") ? encabezado.slice(7) : null;
  if (token) cerrarSesion(token);
  res.json({ ok: true });
});

module.exports = router;

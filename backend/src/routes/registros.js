// routes/registros.js
// Aqui se registra el ingreso de una visita, se marca la salida, y se
// consulta el listado de visitas del dia.

const express = require("express");
const db = require("../db");

const router = express.Router();

function horaActualPeru() {
  // Fecha y hora del servidor, en formato legible.
  const ahora = new Date();
  const fecha = ahora.toISOString().slice(0, 10); // YYYY-MM-DD
  const hora = ahora.toTimeString().slice(0, 5); // HH:MM
  return { fecha, hora };
}

// POST /api/registros
// Body esperado: { dni, nombres, apellidos, celular, area, asunto }
router.post("/", (req, res) => {
  const { dni, nombres, apellidos, celular, area, asunto } = req.body || {};

  // Validaciones basicas: campos obligatorios y formato del DNI.
  if (!dni || !/^\d{8}$/.test(dni)) {
    return res.status(400).json({ error: "El DNI debe tener 8 dígitos." });
  }
  if (!nombres || !nombres.trim()) {
    return res.status(400).json({ error: "Los nombres son obligatorios." });
  }
  if (!apellidos || !apellidos.trim()) {
    return res.status(400).json({ error: "Los apellidos son obligatorios." });
  }
  if (!area || !area.trim()) {
    return res.status(400).json({ error: "Selecciona un área de destino." });
  }
  if (!asunto || !asunto.trim()) {
    return res.status(400).json({ error: "Selecciona un asunto de la visita." });
  }

  // 1. Crear la persona si no existe, o actualizar sus datos si ya existia.
  db.prepare(
    `INSERT INTO personas (dni, nombres, apellidos, celular)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(dni) DO UPDATE SET
       nombres = excluded.nombres,
       apellidos = excluded.apellidos,
       celular = excluded.celular`
  ).run(dni, nombres.trim(), apellidos.trim(), celular ? celular.trim() : null);

  // 2. Crear el registro de esta visita puntual.
  const { fecha, hora } = horaActualPeru();
  const resultado = db
    .prepare(
      `INSERT INTO registros (dni, fecha, hora_ingreso, area, asunto)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(dni, fecha, hora, area.trim(), asunto.trim());

  res.status(201).json({
    ok: true,
    registro: {
      id: resultado.lastInsertRowid,
      dni,
      fecha,
      hora_ingreso: hora,
      area,
      asunto,
    },
  });
});

// GET /api/registros/hoy
// Lista todas las visitas del dia actual, las mas recientes primero.
// Se usa para la tabla de "visitas de hoy" en la pantalla principal.
router.get("/hoy", (req, res) => {
  const { fecha } = horaActualPeru();

  const filas = db
    .prepare(
      `SELECT
         r.id, r.dni, r.fecha, r.hora_ingreso, r.hora_salida, r.area, r.asunto,
         p.nombres, p.apellidos, p.celular
       FROM registros r
       JOIN personas p ON p.dni = r.dni
       WHERE r.fecha = ?
       ORDER BY r.id DESC`
    )
    .all(fecha);

  res.json({ fecha, registros: filas });
});

// PATCH /api/registros/:id/salida
// Marca la hora de salida de una visita puntual (por su id de registro,
// no por DNI, ya que una persona puede tener varias visitas el mismo dia).
router.patch("/:id/salida", (req, res) => {
  const { id } = req.params;

  const registro = db.prepare("SELECT id, hora_salida FROM registros WHERE id = ?").get(id);
  if (!registro) {
    return res.status(404).json({ error: "No se encontró ese registro." });
  }
  if (registro.hora_salida) {
    return res.status(400).json({ error: "Esta visita ya tiene una salida registrada." });
  }

  const { hora } = horaActualPeru();
  db.prepare("UPDATE registros SET hora_salida = ? WHERE id = ?").run(hora, id);

  res.json({ ok: true, id: Number(id), hora_salida: hora });
});

module.exports = router;

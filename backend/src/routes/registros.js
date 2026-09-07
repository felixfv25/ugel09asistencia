// routes/registros.js
// Aqui se registra el ingreso de una visita, se marca la salida, y se
// consulta el listado de visitas del dia.

const express = require("express");
const { db } = require("../db");

const router = express.Router();

function horaActualPeru() {
  // Fecha y hora real de Peru (America/Lima), sin importar en que zona
  // horaria este el servidor (Render corre en UTC por defecto, 5 horas
  // adelantado a Peru, asi que antes esto guardaba la hora mal).
  const ahora = new Date();

  const fecha = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(ahora); // "en-CA" da directo el formato YYYY-MM-DD

  const hora = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(ahora); // "HH:MM"

  return { fecha, hora };
}

// Horario de atencion: 8:30am a 3:30pm, hora de Peru (America/Lima).
const HORA_APERTURA = "08:30";
const HORA_CIERRE = "15:30";

function dentroDeHorarioAtencion() {
  const horaLima = new Intl.DateTimeFormat("es-PE", {
    timeZone: "America/Lima",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date()); // "HH:MM"

  return horaLima >= HORA_APERTURA && horaLima <= HORA_CIERRE;
}

// POST /api/registros
// Body esperado: { dni, nombres, apellidos, celular, area, asunto }
router.post("/", async (req, res) => {
  const { dni, nombres, apellidos, celular, area, asunto } = req.body || {};

  if (!dentroDeHorarioAtencion()) {
    return res.status(403).json({
      error: `El registro de visitas solo está disponible de ${HORA_APERTURA} am a 3:30 pm.`,
    });
  }

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
  await db.execute({
    sql: `INSERT INTO personas (dni, nombres, apellidos, celular)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(dni) DO UPDATE SET
            nombres = excluded.nombres,
            apellidos = excluded.apellidos,
            celular = excluded.celular`,
    args: [dni, nombres.trim(), apellidos.trim(), celular ? celular.trim() : null],
  });

  // 2. Crear el registro de esta visita puntual.
  const { fecha, hora } = horaActualPeru();
  const resultado = await db.execute({
    sql: `INSERT INTO registros (dni, fecha, hora_ingreso, area, asunto)
          VALUES (?, ?, ?, ?, ?)`,
    args: [dni, fecha, hora, area.trim(), asunto.trim()],
  });

  res.status(201).json({
    ok: true,
    registro: {
      id: Number(resultado.lastInsertRowid),
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
router.get("/hoy", async (req, res) => {
  const { fecha } = horaActualPeru();

  const resultado = await db.execute({
    sql: `SELECT
            r.id, r.dni, r.fecha, r.hora_ingreso, r.hora_salida, r.area, r.asunto,
            p.nombres, p.apellidos, p.celular
          FROM registros r
          JOIN personas p ON p.dni = r.dni
          WHERE r.fecha = ?
          ORDER BY r.id DESC`,
    args: [fecha],
  });

  res.json({ fecha, registros: resultado.rows });
});

// PATCH /api/registros/:id/salida
// Marca la hora de salida de una visita puntual (por su id de registro).
router.patch("/:id/salida", async (req, res) => {
  const { id } = req.params;

  const buscar = await db.execute({
    sql: "SELECT id, hora_salida FROM registros WHERE id = ?",
    args: [id],
  });
  const registro = buscar.rows[0];

  if (!registro) {
    return res.status(404).json({ error: "No se encontró ese registro." });
  }
  if (registro.hora_salida) {
    return res.status(400).json({ error: "Esta visita ya tiene una salida registrada." });
  }

  const { hora } = horaActualPeru();
  await db.execute({ sql: "UPDATE registros SET hora_salida = ? WHERE id = ?", args: [hora, id] });

  res.json({ ok: true, id: Number(id), hora_salida: hora });
});

module.exports = router;

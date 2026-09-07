// routes/personas.js
// Todo lo relacionado a "personas externas": por ahora solo buscarlas por DNI.

const express = require("express");
const { db } = require("../db");

const router = express.Router();

// GET /api/personas/:dni
// Busca si una persona ya esta registrada. El formulario usara esto para
// autocompletar nombres/apellidos/celular cuando el DNI ya existe.
router.get("/:dni", async (req, res) => {
  const { dni } = req.params;

  const resultado = await db.execute({
    sql: "SELECT dni, nombres, apellidos, celular FROM personas WHERE dni = ?",
    args: [dni],
  });
  const persona = resultado.rows[0];

  if (!persona) {
    return res.status(404).json({ encontrada: false });
  }

  res.json({ encontrada: true, persona });
});

module.exports = router;

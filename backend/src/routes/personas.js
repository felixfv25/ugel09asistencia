// routes/personas.js
// Todo lo relacionado a "personas externas": por ahora solo buscarlas por DNI.
// Crear personas nuevas y registrar su visita lo hacemos en la Fase 2,
// junto con el formulario.

const express = require("express");
const db = require("../db");

const router = express.Router();

// GET /api/personas/:dni
// Busca si una persona ya esta registrada. El formulario usara esto para
// autocompletar nombres/apellidos/celular cuando el DNI ya existe.
router.get("/:dni", (req, res) => {
  const { dni } = req.params;

  const persona = db
    .prepare("SELECT dni, nombres, apellidos, celular FROM personas WHERE dni = ?")
    .get(dni);

  if (!persona) {
    return res.status(404).json({ encontrada: false });
  }

  res.json({ encontrada: true, persona });
});

module.exports = router;

// routes/exportar.js
// Genera un archivo Excel (.xlsx) descargable con las visitas registradas,
// filtrando por rango de fechas y, opcionalmente, por área.

const express = require("express");
const ExcelJS = require("exceljs");
const db = require("../db");

const router = express.Router();

// GET /api/exportar?desde=YYYY-MM-DD&hasta=YYYY-MM-DD&area=Opcional
router.get("/", async (req, res) => {
  const hoy = new Date().toISOString().slice(0, 10);
  const desde = req.query.desde || hoy;
  const hasta = req.query.hasta || hoy;
  const area = req.query.area || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(desde) || !/^\d{4}-\d{2}-\d{2}$/.test(hasta)) {
    return res.status(400).json({ error: "Las fechas deben tener formato YYYY-MM-DD." });
  }

  let consulta = `
    SELECT r.fecha, p.nombres, p.apellidos, p.celular,
           r.hora_ingreso, r.hora_salida, r.area, r.asunto, r.dni
    FROM registros r
    JOIN personas p ON p.dni = r.dni
    WHERE r.fecha BETWEEN ? AND ?
  `;
  const parametros = [desde, hasta];

  if (area) {
    consulta += " AND r.area = ?";
    parametros.push(area);
  }

  consulta += " ORDER BY r.fecha ASC, r.hora_ingreso ASC";

  const filas = db.prepare(consulta).all(...parametros);

  // Armar el archivo Excel con los 9 campos solicitados.
  const workbook = new ExcelJS.Workbook();
  const hoja = workbook.addWorksheet("Asistencia");

  hoja.columns = [
    { header: "Fecha", key: "fecha", width: 12 },
    { header: "Nombres", key: "nombres", width: 20 },
    { header: "Apellidos", key: "apellidos", width: 20 },
    { header: "Celular", key: "celular", width: 14 },
    { header: "Hora de ingreso", key: "hora_ingreso", width: 15 },
    { header: "Hora de salida", key: "hora_salida", width: 15 },
    { header: "Área / oficina", key: "area", width: 24 },
    { header: "Asunto", key: "asunto", width: 20 },
    { header: "DNI", key: "dni", width: 12 },
  ];

  hoja.getRow(1).font = { bold: true };
  hoja.getRow(1).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF0C447C" },
  };
  hoja.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };

  filas.forEach((fila) => {
    hoja.addRow({
      fecha: fila.fecha,
      nombres: fila.nombres,
      apellidos: fila.apellidos,
      celular: fila.celular || "",
      hora_ingreso: fila.hora_ingreso,
      hora_salida: fila.hora_salida || "",
      area: fila.area,
      asunto: fila.asunto,
      dni: fila.dni,
    });
  });

  const nombreArchivo =
    desde === hasta
      ? `asistencia_${desde}.xlsx`
      : `asistencia_${desde}_a_${hasta}.xlsx`;

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", `attachment; filename="${nombreArchivo}"`);

  await workbook.xlsx.write(res);
  res.end();
});

module.exports = router;

// borrar-persona.js
// Script para borrar por completo a una persona (y TODAS sus visitas)
// de la base de datos. Util para quitar datos de prueba.
//
// Se corre desde la terminal, asi:
//
//   node src/borrar-persona.js 12345678
//
// OJO: esto borra tanto a la persona como TODOS sus registros de visita
// (no se puede deshacer). Si solo quieres borrar una visita puntual y
// no a la persona completa, avisa y hacemos un script aparte para eso.

const db = require("./db");

const [, , dni] = process.argv;

if (!dni) {
  console.log("Uso: node src/borrar-persona.js <dni>");
  console.log("Ejemplo: node src/borrar-persona.js 12345678");
  process.exit(1);
}

const persona = db.prepare("SELECT dni, nombres, apellidos FROM personas WHERE dni = ?").get(dni);

if (!persona) {
  console.log(`No se encontró ninguna persona con DNI ${dni}.`);
  process.exit(0);
}

const registros = db.prepare("DELETE FROM registros WHERE dni = ?").run(dni);
db.prepare("DELETE FROM personas WHERE dni = ?").run(dni);

console.log(
  `Listo. Se borró a ${persona.nombres} ${persona.apellidos} (DNI ${dni}) y sus ${registros.changes} visita(s) registrada(s).`
);

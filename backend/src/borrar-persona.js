// borrar-persona.js
// Script para borrar por completo a una persona (y TODAS sus visitas)
// de la base de datos. Util para quitar datos de prueba.
//
// Se corre desde la terminal, asi:
//
//   node src/borrar-persona.js 12345678
//
// OJO: esto borra tanto a la persona como TODOS sus registros de visita
// (no se puede deshacer).

const { db, inicializar } = require("./db");

const [, , dni] = process.argv;

async function main() {
  if (!dni) {
    console.log("Uso: node src/borrar-persona.js <dni>");
    console.log("Ejemplo: node src/borrar-persona.js 12345678");
    process.exit(1);
  }

  await inicializar();

  const buscar = await db.execute({
    sql: "SELECT dni, nombres, apellidos FROM personas WHERE dni = ?",
    args: [dni],
  });
  const persona = buscar.rows[0];

  if (!persona) {
    console.log(`No se encontró ninguna persona con DNI ${dni}.`);
    process.exit(0);
  }

  const registros = await db.execute({ sql: "DELETE FROM registros WHERE dni = ?", args: [dni] });
  await db.execute({ sql: "DELETE FROM personas WHERE dni = ?", args: [dni] });

  console.log(
    `Listo. Se borró a ${persona.nombres} ${persona.apellidos} (DNI ${dni}) y sus ${Number(
      registros.rowsAffected
    )} visita(s) registrada(s).`
  );
}

main();

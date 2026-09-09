// crear-admin.js
// Script para crear (o resetear la contraseña de) un usuario administrador.
// Se corre UNA SOLA VEZ desde la terminal, asi:
//
//   node src/crear-admin.js usuario contraseña
//
// Ejemplo:
//   node src/crear-admin.js admin MiClaveSegura123

const { db, inicializar } = require("./db");
const { hashPassword } = require("./auth");

const [, , usuario, password] = process.argv;

async function main() {
  if (!usuario || !password) {
    console.log("Uso: node src/crear-admin.js <usuario> <contraseña>");
    console.log("Ejemplo: node src/crear-admin.js admin MiClaveSegura123");
    process.exit(1);
  }

  if (password.length < 6) {
    console.log("La contraseña debe tener al menos 6 caracteres.");
    process.exit(1);
  }

  await inicializar();

  const hash = hashPassword(password);

  await db.execute({
    sql: `INSERT INTO usuarios (usuario, password_hash)
          VALUES (?, ?)
          ON CONFLICT(usuario) DO UPDATE SET password_hash = excluded.password_hash`,
    args: [usuario, hash],
  });

  console.log(`Listo. El usuario "${usuario}" ya puede iniciar sesión en el panel de administración.`);
}

main();

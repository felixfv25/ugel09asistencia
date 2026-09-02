// server.js
// Punto de arranque del backend. Junta todas las rutas y levanta el
// servidor. No tiene logica propia: solo conecta piezas.

const os = require("os");
const express = require("express");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const { requiereSesion } = require("./auth");
const personasRouter = require("./routes/personas");
const registrosRouter = require("./routes/registros");
const exportarRouter = require("./routes/exportar");
const authRouter = require("./routes/auth");
const adminRouter = require("./routes/admin");

const app = express();
const PUERTO = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Endpoint de salud: sirve para comprobar que el servidor y la base de
// datos estan funcionando.
app.get("/api/salud", (req, res) => {
  res.json({ estado: "ok", mensaje: "Servidor UGEL 09 funcionando" });
});

// Endpoint para que el formulario sepa que opciones mostrar en los
// desplegables de Area y Asunto. Ahora se leen de la base de datos, para
// que el panel de administracion las pueda editar sin tocar codigo.
// Exige sesion (login de porteria) igual que el resto del formulario.
app.get("/api/opciones", requiereSesion, (req, res) => {
  const areas = db.prepare("SELECT nombre FROM areas ORDER BY nombre").all().map((f) => f.nombre);
  const asuntos = db.prepare("SELECT nombre FROM asuntos ORDER BY nombre").all().map((f) => f.nombre);
  res.json({ areas, asuntos });
});

// Todo lo que usa la pantalla de registro (porteria) exige haber
// iniciado sesion primero, para que nadie que solo tenga el link pueda
// registrar visitas sin autorizacion.
app.use("/api/personas", requiereSesion, personasRouter);
app.use("/api/registros", requiereSesion, registrosRouter);
app.use("/api/exportar", requiereSesion, exportarRouter);
app.use("/api/auth", authRouter);

// Todo lo que empiece con /api/admin exige haber iniciado sesion primero.
app.use("/api/admin", requiereSesion, adminRouter);


// Sirve los archivos del frontend (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../../frontend")));

// Cualquier ruta que no sea /api/... devuelve el index.html
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "../../frontend/index.html"));
});

function obtenerIpLocal() {
  const interfaces = os.networkInterfaces();
  for (const nombre of Object.keys(interfaces)) {
    for (const dato of interfaces[nombre]) {
      // Buscamos una IP de red local (no la de "localhost" ni la de Docker/VPN).
      if (dato.family === "IPv4" && !dato.internal) {
        return dato.address;
      }
    }
  }
  return null;
}

// "0.0.0.0" hace que el servidor escuche en TODAS las redes de la
// computadora, no solo en localhost. Esto es necesario para que, mas
// adelante, un celular conectado al mismo WiFi (o la futura app movil)
// pueda conectarse usando la IP de esta PC en vez de "localhost".
app.listen(PUERTO, "0.0.0.0", () => {
  const ipLocal = obtenerIpLocal();
  console.log(`Servidor UGEL 09 escuchando en http://localhost:${PUERTO}`);
  if (ipLocal) {
    console.log(`También accesible desde otros dispositivos en la misma red WiFi en: http://${ipLocal}:${PUERTO}`);
  }
});

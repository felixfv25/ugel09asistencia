// admin.js
// Logica del panel de administracion. Guarda el token de sesion en
// localStorage (esto SI es un archivo normal que corre en el navegador del
// usuario, no un artifact de Claude, asi que localStorage funciona bien
// aqui y es lo apropiado para este caso).

const API_URL = "/api";
const CLAVE_TOKEN = "ugel09_admin_token";

const vistaLogin = document.getElementById("vista-login");
const vistaPanel = document.getElementById("vista-panel");
const formLogin = document.getElementById("form-login");
const mensajeLogin = document.getElementById("mensaje-login");
const mensajePanel = document.getElementById("mensaje-panel");
const btnSalir = document.getElementById("btn-salir");

function mostrarMensaje(el, texto, tipo) {
  el.textContent = texto;
  el.className = `estado ${tipo}`;
  el.style.display = "block";
  setTimeout(() => (el.style.display = "none"), 4000);
}

function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN);
}

// Todas las llamadas al panel pasan por aqui, para incluir el token
// automaticamente y manejar sesiones vencidas en un solo lugar.
async function llamarAdmin(ruta, opciones = {}) {
  const respuesta = await fetch(`${API_URL}/admin${ruta}`, {
    ...opciones,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${obtenerToken()}`,
      ...(opciones.headers || {}),
    },
  });

  if (respuesta.status === 401) {
    cerrarSesionLocal();
    throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
  }

  const datos = await respuesta.json();
  if (!respuesta.ok) throw new Error(datos.error || "Ocurrió un error.");
  return datos;
}

function mostrarPanel() {
  vistaLogin.style.display = "none";
  vistaPanel.style.display = "block";
  btnSalir.style.display = "inline-block";
  cargarAreas();
  cargarAsuntos();
}

function mostrarLogin() {
  vistaLogin.style.display = "block";
  vistaPanel.style.display = "none";
  btnSalir.style.display = "none";
}

function cerrarSesionLocal() {
  localStorage.removeItem(CLAVE_TOKEN);
  mostrarLogin();
}

// --- Login ---
formLogin.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const usuario = document.getElementById("usuario").value.trim();
  const password = document.getElementById("password").value;

  fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usuario, password }),
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar sesión.");
      return data;
    })
    .then((data) => {
      localStorage.setItem(CLAVE_TOKEN, data.token);
      formLogin.reset();
      mostrarPanel();
    })
    .catch((error) => mostrarMensaje(mensajeLogin, error.message, "error"));
});

btnSalir.addEventListener("click", () => {
  fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  }).finally(cerrarSesionLocal);
});

// --- Áreas ---
function cargarAreas() {
  llamarAdmin("/areas")
    .then((data) => {
      const lista = document.getElementById("lista-areas");
      lista.innerHTML = data.areas
        .map(
          (a) => `<li>${a.nombre} <button class="boton-quitar" data-tipo="areas" data-id="${a.id}">Quitar</button></li>`
        )
        .join("") || `<li>No hay áreas registradas.</li>`;
    })
    .catch((error) => mostrarMensaje(mensajePanel, error.message, "error"));
}

document.getElementById("btn-agregar-area").addEventListener("click", () => {
  const input = document.getElementById("nueva-area");
  const nombre = input.value.trim();
  if (!nombre) return;

  llamarAdmin("/areas", { method: "POST", body: JSON.stringify({ nombre }) })
    .then(() => {
      input.value = "";
      cargarAreas();
    })
    .catch((error) => mostrarMensaje(mensajePanel, error.message, "error"));
});

// --- Asuntos ---
function cargarAsuntos() {
  llamarAdmin("/asuntos")
    .then((data) => {
      const lista = document.getElementById("lista-asuntos");
      lista.innerHTML = data.asuntos
        .map(
          (a) => `<li>${a.nombre} <button class="boton-quitar" data-tipo="asuntos" data-id="${a.id}">Quitar</button></li>`
        )
        .join("") || `<li>No hay asuntos registrados.</li>`;
    })
    .catch((error) => mostrarMensaje(mensajePanel, error.message, "error"));
}

document.getElementById("btn-agregar-asunto").addEventListener("click", () => {
  const input = document.getElementById("nuevo-asunto");
  const nombre = input.value.trim();
  if (!nombre) return;

  llamarAdmin("/asuntos", { method: "POST", body: JSON.stringify({ nombre }) })
    .then(() => {
      input.value = "";
      cargarAsuntos();
    })
    .catch((error) => mostrarMensaje(mensajePanel, error.message, "error"));
});

// Un solo listener para los botones "Quitar" de ambas listas (delegacion).
document.getElementById("vista-panel").addEventListener("click", (evento) => {
  const boton = evento.target.closest(".boton-quitar");
  if (!boton) return;

  const { tipo, id } = boton.dataset;
  if (!confirm("¿Seguro que quieres quitar esta opción?")) return;

  llamarAdmin(`/${tipo}/${id}`, { method: "DELETE" })
    .then(() => (tipo === "areas" ? cargarAreas() : cargarAsuntos()))
    .catch((error) => mostrarMensaje(mensajePanel, error.message, "error"));
});

// --- Reporte ---
const hoyISO = new Date().toISOString().slice(0, 10);
document.getElementById("reporte-desde").value = hoyISO;
document.getElementById("reporte-hasta").value = hoyISO;

document.getElementById("btn-generar-reporte").addEventListener("click", () => {
  const desde = document.getElementById("reporte-desde").value;
  const hasta = document.getElementById("reporte-hasta").value;
  const cuerpo = document.getElementById("cuerpo-reporte");

  llamarAdmin(`/reporte?desde=${desde}&hasta=${hasta}`)
    .then((data) => {
      if (data.porArea.length === 0) {
        cuerpo.innerHTML = `<tr><td colspan="2" class="celda-vacia">No hay visitas en ese rango de fechas.</td></tr>`;
        return;
      }
      cuerpo.innerHTML =
        data.porArea.map((f) => `<tr><td>${f.area}</td><td>${f.total}</td></tr>`).join("") +
        `<tr><td><strong>Total</strong></td><td><strong>${data.totalGeneral}</strong></td></tr>`;
    })
    .catch((error) => mostrarMensaje(mensajePanel, error.message, "error"));
});

// --- Crear usuario administrador ---
document.getElementById("btn-crear-usuario").addEventListener("click", () => {
  const usuario = document.getElementById("nuevo-usuario").value.trim();
  const password = document.getElementById("nueva-password").value;

  llamarAdmin("/usuarios", { method: "POST", body: JSON.stringify({ usuario, password }) })
    .then(() => {
      document.getElementById("nuevo-usuario").value = "";
      document.getElementById("nueva-password").value = "";
      mostrarMensaje(mensajePanel, `Usuario "${usuario}" creado correctamente.`, "ok");
    })
    .catch((error) => mostrarMensaje(mensajePanel, error.message, "error"));
});

// --- Descargar base de datos (copia de solo lectura) ---
document.getElementById("btn-descargar-db").addEventListener("click", () => {
  const boton = document.getElementById("btn-descargar-db");
  boton.disabled = true;
  boton.textContent = "Descargando...";

  fetch(`${API_URL}/admin/descargar-base-de-datos`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  })
    .then(async (res) => {
      if (res.status === 401) {
        cerrarSesionLocal();
        throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
      }
      if (!res.ok) throw new Error("No se pudo descargar la base de datos.");
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `asistencia_${hoyISO}.db`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    })
    .catch((error) => mostrarMensaje(mensajePanel, error.message, "error"))
    .finally(() => {
      boton.disabled = false;
      boton.textContent = "Descargar base de datos";
    });
});

// --- Al cargar la página: ¿ya hay una sesión guardada? ---
if (obtenerToken()) {
  mostrarPanel();
} else {
  mostrarLogin();
}

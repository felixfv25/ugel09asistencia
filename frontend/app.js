// app.js
// Logica de la pantalla de registro de ingreso:
//  0. Exigir login de porteria antes de mostrar el formulario.
//  1. Cargar las opciones de area y asunto desde el backend.
//  2. Buscar el DNI y autocompletar si la persona ya existe.
//  3. Enviar el formulario para guardar el ingreso.

const API_URL = "/api";
const CLAVE_TOKEN = "ugel09_porteria_token";

const vistaLogin = document.getElementById("vista-login");
const vistaFormulario = document.getElementById("vista-formulario");
const formLogin = document.getElementById("form-login");
const mensajeLogin = document.getElementById("mensaje-login");
const btnSalir = document.getElementById("btn-salir");

const mensajeEl = document.getElementById("mensaje");
const form = document.getElementById("form-registro");
const dniInput = document.getElementById("dni");
const btnBuscar = document.getElementById("btn-buscar");
const ayudaDni = document.getElementById("ayuda-dni");
const nombresInput = document.getElementById("nombres");
const apellidosInput = document.getElementById("apellidos");
const celularInput = document.getElementById("celular");
const areaSelect = document.getElementById("area");
const asuntoSelect = document.getElementById("asunto");
const areaOtroCampo = document.getElementById("campo-area-otro");
const areaOtroInput = document.getElementById("area-otro");
const asuntoOtroCampo = document.getElementById("campo-asunto-otro");
const asuntoOtroInput = document.getElementById("asunto-otro");
const cuerpoTabla = document.getElementById("cuerpo-tabla");
const btnActualizar = document.getElementById("btn-actualizar");
const fechaDesde = document.getElementById("fecha-desde");
const fechaHasta = document.getElementById("fecha-hasta");
const areaExportar = document.getElementById("area-exportar");
const btnExportar = document.getElementById("btn-exportar");

function mostrarMensaje(texto, tipo) {
  mensajeEl.textContent = texto;
  mensajeEl.className = `estado ${tipo}`;
  mensajeEl.style.display = "block";
}

function ocultarMensaje() {
  mensajeEl.style.display = "none";
}

function mostrarMensajeLogin(texto, tipo) {
  mensajeLogin.textContent = texto;
  mensajeLogin.className = `estado ${tipo}`;
  mensajeLogin.style.display = "block";
}

// --- 0. Login de porteria ---
// El token se guarda en localStorage (esto SI es un archivo normal que
// corre en el navegador del usuario, no un artifact de Claude, asi que
// localStorage funciona bien aqui).

function obtenerToken() {
  return localStorage.getItem(CLAVE_TOKEN);
}

function guardarToken(token) {
  localStorage.setItem(CLAVE_TOKEN, token);
}

function borrarToken() {
  localStorage.removeItem(CLAVE_TOKEN);
}

const DURACION_SESION_MS = 20 * 60 * 1000; // 20 minutos, igual que en el backend
let temporizadorSesion = null;

function iniciarTemporizadorSesion() {
  if (temporizadorSesion) clearTimeout(temporizadorSesion);
  temporizadorSesion = setTimeout(() => {
    borrarToken();
    mostrarLogin();
    mostrarMensajeLogin("Tu sesión expiró por inactividad. Inicia sesión de nuevo.", "error");
  }, DURACION_SESION_MS);
}

function mostrarFormulario() {
  vistaLogin.style.display = "none";
  vistaFormulario.style.display = "block";
  btnSalir.style.display = "inline-block";
  cargarOpciones();
  cargarVisitasHoy();
  iniciarTemporizadorSesion();
}

function mostrarLogin() {
  vistaLogin.style.display = "block";
  vistaFormulario.style.display = "none";
  btnSalir.style.display = "none";
  if (temporizadorSesion) clearTimeout(temporizadorSesion);
}

formLogin.addEventListener("submit", (evento) => {
  evento.preventDefault();
  const usuario = document.getElementById("login-usuario").value.trim();
  const password = document.getElementById("login-password").value;

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
      guardarToken(data.token);
      formLogin.reset();
      mostrarFormulario();
    })
    .catch((error) => mostrarMensajeLogin(error.message, "error"));
});

btnSalir.addEventListener("click", () => {
  const token = obtenerToken();
  if (token) {
    fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  }
  borrarToken();
  mostrarLogin();
});

// Todas las llamadas protegidas pasan por aqui, para incluir el token
// automaticamente y manejar sesiones vencidas en un solo lugar.
async function llamarConSesion(url, opciones = {}) {
  const respuesta = await fetch(url, {
    ...opciones,
    headers: {
      ...(opciones.headers || {}),
      Authorization: `Bearer ${obtenerToken()}`,
    },
  });

  if (respuesta.status === 401) {
    borrarToken();
    mostrarLogin();
    throw new Error("Tu sesión expiró. Inicia sesión de nuevo.");
  }

  return respuesta;
}

// --- 1. Cargar areas y asuntos en los desplegables ---
function llenarSelect(select, opciones) {
  opciones.forEach((op) => {
    const option = document.createElement("option");
    option.value = op;
    option.textContent = op;
    select.appendChild(option);
  });
}

function cargarOpciones() {
  llamarConSesion(`${API_URL}/opciones`)
    .then((res) => res.json())
    .then((data) => {
      llenarSelect(areaSelect, data.areas);
      llenarSelect(asuntoSelect, data.asuntos);
      llenarSelect(areaExportar, data.areas);
    })
    .catch((error) => {
      mostrarMensaje(error.message || "No se pudo conectar con el servidor.", "error");
    });
}

// Mostrar/ocultar el cajon de texto cuando eligen "Otro".
areaSelect.addEventListener("change", () => {
  const esOtro = areaSelect.value === "Otro";
  areaOtroCampo.style.display = esOtro ? "block" : "none";
  areaOtroInput.required = esOtro;
  if (!esOtro) areaOtroInput.value = "";
});

asuntoSelect.addEventListener("change", () => {
  const esOtro = asuntoSelect.value === "Otro";
  asuntoOtroCampo.style.display = esOtro ? "block" : "none";
  asuntoOtroInput.required = esOtro;
  if (!esOtro) asuntoOtroInput.value = "";
});

// Si ya habia una sesion guardada (de una visita anterior a esta pagina),
// entramos directo al formulario sin pedir login de nuevo.
if (obtenerToken()) {
  mostrarFormulario();
} else {
  mostrarLogin();
}

// Fechas por defecto del panel de exportar: hoy.
const hoyISO = new Date().toISOString().slice(0, 10);
fechaDesde.value = hoyISO;
fechaHasta.value = hoyISO;

// --- 2. Buscar persona por DNI ---
function buscarPersona() {
  const dni = dniInput.value.trim();
  ayudaDni.textContent = "";

  if (!/^\d{8}$/.test(dni)) {
    ayudaDni.textContent = "El DNI debe tener 8 dígitos.";
    return;
  }

  ayudaDni.textContent = "Buscando...";

  fetch(`${API_URL}/personas/${dni}`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.encontrada) {
        nombresInput.value = data.persona.nombres;
        apellidosInput.value = data.persona.apellidos;
        celularInput.value = data.persona.celular || "";
        nombresInput.disabled = true;
        apellidosInput.disabled = true;
        ayudaDni.textContent = "Persona reconocida. Ya puedes elegir el área y el asunto.";
      } else {
        nombresInput.value = "";
        apellidosInput.value = "";
        celularInput.value = "";
        nombresInput.disabled = false;
        apellidosInput.disabled = false;
        ayudaDni.textContent = "DNI nuevo: completa nombres y apellidos.";
        nombresInput.focus();
      }
    })
    .catch(() => {
      ayudaDni.textContent = "No se pudo buscar el DNI. Verifica el servidor.";
    });
}

btnBuscar.addEventListener("click", buscarPersona);

// Tambien buscar automaticamente al completar los 8 digitos.
dniInput.addEventListener("input", () => {
  dniInput.value = dniInput.value.replace(/\D/g, "").slice(0, 8);
  if (dniInput.value.length === 8) {
    buscarPersona();
  }
});

// --- 3. Enviar el formulario (registrar ingreso) ---
form.addEventListener("submit", (evento) => {
  evento.preventDefault();
  ocultarMensaje();

  const datos = {
    dni: dniInput.value.trim(),
    nombres: nombresInput.value.trim(),
    apellidos: apellidosInput.value.trim(),
    celular: celularInput.value.trim(),
    area: areaSelect.value === "Otro" ? areaOtroInput.value.trim() : areaSelect.value,
    asunto: asuntoSelect.value === "Otro" ? asuntoOtroInput.value.trim() : asuntoSelect.value,
  };

  if (areaSelect.value === "Otro" && !datos.area) {
    mostrarMensaje("Escribe el área u oficina de destino.", "error");
    return;
  }
  if (asuntoSelect.value === "Otro" && !datos.asunto) {
    mostrarMensaje("Escribe el asunto de la visita.", "error");
    return;
  }

  const botonEnviar = form.querySelector('button[type="submit"]');
  botonEnviar.disabled = true;
  botonEnviar.textContent = "Registrando...";

  fetch(`${API_URL}/registros`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${obtenerToken()}`,
    },
    body: JSON.stringify(datos),
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "No se pudo registrar el ingreso.");
      }
      return data;
    })
    .then((data) => {
      mostrarMensaje(
        `Ingreso registrado: ${datos.nombres} ${datos.apellidos} — ${data.registro.hora_ingreso} hrs.`,
        "ok"
      );
      form.reset();
      areaOtroCampo.style.display = "none";
      areaOtroInput.required = false;
      asuntoOtroCampo.style.display = "none";
      asuntoOtroInput.required = false;
      nombresInput.disabled = false;
      apellidosInput.disabled = false;
      ayudaDni.textContent = "";
      dniInput.focus();
      cargarVisitasHoy();
    })
    .catch((error) => {
      mostrarMensaje(error.message, "error");
    })
    .finally(() => {
      botonEnviar.disabled = false;
      botonEnviar.textContent = "Registrar ingreso";
    });
});

// --- 4. Tabla de visitas de hoy ---
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function cargarVisitasHoy() {
  fetch(`${API_URL}/registros/hoy`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  })
    .then((res) => res.json())
    .then((data) => {
      if (!data.registros || data.registros.length === 0) {
        cuerpoTabla.innerHTML = `<tr><td colspan="7" class="celda-vacia">Todavía no hay visitas registradas hoy.</td></tr>`;
        return;
      }

      cuerpoTabla.innerHTML = data.registros
        .map((r) => {
          const salidaHtml = r.hora_salida
            ? `<span class="etiqueta-salida">${escaparHtml(r.hora_salida)}</span>`
            : `<button class="boton-salida" data-id="${r.id}">Marcar salida</button>`;

          return `
            <tr>
              <td>${escaparHtml(r.dni)}</td>
              <td>${escaparHtml(r.nombres)} ${escaparHtml(r.apellidos)}</td>
              <td>${escaparHtml(r.hora_ingreso)}</td>
              <td>${salidaHtml}</td>
              <td>${escaparHtml(r.area)}</td>
              <td>${escaparHtml(r.asunto)}</td>
              <td></td>
            </tr>
          `;
        })
        .join("");
    })
    .catch(() => {
      cuerpoTabla.innerHTML = `<tr><td colspan="7" class="celda-vacia">No se pudo cargar la lista.</td></tr>`;
    });
}

// Delegacion de eventos: un solo listener para todos los botones "Marcar salida",
// incluso los que se crean despues de cargar la tabla.
cuerpoTabla.addEventListener("click", (evento) => {
  const boton = evento.target.closest(".boton-salida");
  if (!boton) return;

  const id = boton.dataset.id;
  boton.disabled = true;
  boton.textContent = "Guardando...";

  fetch(`${API_URL}/registros/${id}/salida`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  })
    .then(async (res) => {
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo marcar la salida.");
      return data;
    })
    .then(() => cargarVisitasHoy())
    .catch((error) => {
      alert(error.message);
      boton.disabled = false;
      boton.textContent = "Marcar salida";
    });
});

btnActualizar.addEventListener("click", cargarVisitasHoy);

// --- 5. Exportar a Excel ---
btnExportar.addEventListener("click", () => {
  const desde = fechaDesde.value;
  const hasta = fechaHasta.value;

  if (!desde || !hasta) {
    alert("Selecciona la fecha 'Desde' y 'Hasta' para exportar.");
    return;
  }
  if (desde > hasta) {
    alert("La fecha 'Desde' no puede ser posterior a la fecha 'Hasta'.");
    return;
  }

  const params = new URLSearchParams({ desde, hasta });
  if (areaExportar.value) {
    params.set("area", areaExportar.value);
  }

  // Ya no se puede navegar directo a la URL (ahora exige sesion, y un link
  // normal no manda el token). En su lugar, se descarga el archivo con
  // fetch y se dispara la descarga manualmente.
  btnExportar.disabled = true;
  btnExportar.textContent = "Generando...";

  fetch(`${API_URL}/exportar?${params.toString()}`, {
    headers: { Authorization: `Bearer ${obtenerToken()}` },
  })
    .then(async (res) => {
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "No se pudo generar el Excel.");
      }
      return res.blob();
    })
    .then((blob) => {
      const url = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = url;
      enlace.download = `asistencia_${desde}_a_${hasta}.xlsx`;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      URL.revokeObjectURL(url);
    })
    .catch((error) => alert(error.message))
    .finally(() => {
      btnExportar.disabled = false;
      btnExportar.textContent = "Descargar Excel";
    });
});

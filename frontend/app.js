// app.js
// Logica del formulario de registro de ingreso:
//  1. Cargar las opciones de area y asunto desde el backend.
//  2. Buscar el DNI y autocompletar si la persona ya existe.
//  3. Enviar el formulario para guardar el ingreso.

const API_URL = "/api";

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

// --- 1. Cargar areas y asuntos en los desplegables ---
function llenarSelect(select, opciones) {
  opciones.forEach((op) => {
    const option = document.createElement("option");
    option.value = op;
    option.textContent = op;
    select.appendChild(option);
  });
}

fetch(`${API_URL}/opciones`)
  .then((res) => res.json())
  .then((data) => {
    llenarSelect(areaSelect, data.areas);
    llenarSelect(asuntoSelect, data.asuntos);
    llenarSelect(areaExportar, data.areas);
  })
  .catch(() => {
    mostrarMensaje(
      "No se pudo conectar con el servidor. Verifica que 'npm start' esté corriendo en la carpeta backend.",
      "error"
    );
  });

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

  fetch(`${API_URL}/personas/${dni}`)
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
    area: areaSelect.value,
    asunto: asuntoSelect.value,
  };

  const botonEnviar = form.querySelector('button[type="submit"]');
  botonEnviar.disabled = true;
  botonEnviar.textContent = "Registrando...";

  fetch(`${API_URL}/registros`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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
  fetch(`${API_URL}/registros/hoy`)
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

  fetch(`${API_URL}/registros/${id}/salida`, { method: "PATCH" })
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

// Cargar la tabla apenas se abre la pagina.
cargarVisitasHoy();

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

  // Se navega directo a la URL: el navegador se encarga de descargar el
  // archivo porque el backend responde con las cabeceras de descarga.
  window.location.href = `${API_URL}/exportar?${params.toString()}`;
});

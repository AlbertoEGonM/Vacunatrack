// ============================================================
// VacunaTrack — app.js
// Lógica del frontend: autenticación, historial y mapa Leaflet.
// Vanilla JS, sin frameworks. Comunicación con la API en /api/*.
// ============================================================

// ------------------------------------------------------------
// CONSTANTES Y ESTADO GLOBAL
// ------------------------------------------------------------

/** URL base de la API. Vacío = mismo origen que el frontend. */
const API_BASE = "";

/**
 * Estado simple de la sesión.
 * El JWT se guarda en sessionStorage (se borra al cerrar pestaña).
 * En producción considera usar httpOnly cookies para mayor seguridad.
 */
const sesion = {
  /** Recupera el token guardado en sessionStorage */
  get token() {
    return sessionStorage.getItem("vt_token");
  },
  /** Guarda el token y el correo del usuario */
  iniciar(token, correo) {
    sessionStorage.setItem("vt_token", token);
    sessionStorage.setItem("vt_correo", correo);
  },
  /** Elimina todos los datos de sesión */
  cerrar() {
    sessionStorage.removeItem("vt_token");
    sessionStorage.removeItem("vt_correo");
  },
  /** Devuelve el correo guardado */
  get correo() {
    return sessionStorage.getItem("vt_correo") || "";
  },
};

/** Instancia del mapa Leaflet. Se inicializa una sola vez. */
let mapaLeaflet = null;

// ------------------------------------------------------------
// INICIALIZACIÓN
// Al cargar la página, decidimos qué pantalla mostrar.
// ------------------------------------------------------------
document.addEventListener("DOMContentLoaded", () => {
  if (sesion.token) {
    // Si ya hay token guardado, ir directo al dashboard
    mostrarDashboard();
    cargarHistorial();
    inicializarMapa();
    
    // ¡Agrega estas dos líneas!
    cargarNoticias();
    cargarAlertas();
  }
  // Si no hay token, la pantalla de login ya es visible por defecto (HTML)
});

// ============================================================
// UTILIDADES DE UI
// ============================================================

/**
 * Muestra u oculta la pantalla de auth vs dashboard.
 * Usa las clases CSS .activo / .oculto definidas en styles.css.
 */
function mostrarDashboard() {
  document.getElementById("pantalla-auth").classList.add("oculto");
  document.getElementById("pantalla-auth").classList.remove("activa");
  document.getElementById("pantalla-dashboard").classList.remove("oculto");

  // Mostrar el correo del usuario en la topbar
  const correoCorto = sesion.correo.split("@")[0];
  document.getElementById("saludo-usuario").textContent = `Hola, ${correoCorto}`;

  // Cargar datos del dashboard
  cargarHistorial();
  inicializarMapa();
}

/** Alterna entre los tabs Login / Registro */
function cambiarTab(cual) {
  const tabs = document.querySelectorAll(".tab");
  const paneles = document.querySelectorAll(".form-panel");

  tabs.forEach((t) => {
    t.classList.toggle("activo", t.id === `tab-${cual}`);
    t.setAttribute("aria-selected", t.id === `tab-${cual}`);
  });

  paneles.forEach((p) => {
    const visible = p.id === `form-${cual}`;
    p.classList.toggle("activo", visible);
    p.classList.toggle("oculto", !visible);
  });
}

/** Muestra/oculta un mensaje de error en un elemento dado */
function mostrarError(idElemento, mensaje) {
  const el = document.getElementById(idElemento);
  el.textContent = mensaje;
  el.classList.remove("oculto");
}

function ocultarError(idElemento) {
  document.getElementById(idElemento).classList.add("oculto");
}

function mostrarExito(idElemento, mensaje) {
  const el = document.getElementById(idElemento);
  el.textContent = mensaje;
  el.classList.remove("oculto");
}

// ============================================================
// AUTENTICACIÓN
// ============================================================

/**
 * handleLogin()
 * Recoge los datos del formulario, llama al endpoint POST /api/login
 * y, si el servidor devuelve un JWT, inicia la sesión.
 */
async function handleLogin() {
  ocultarError("error-login");

  const correo = document.getElementById("login-correo").value.trim();
  const contrasena = document.getElementById("login-pass").value;

  if (!correo || !contrasena) {
    mostrarError("error-login", "Ingresa tu correo y contraseña.");
    return;
  }

  try {
    // ── Llamada a la API ──────────────────────────────────────
    const res = await fetch(`${API_BASE}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // Enviamos JSON con las credenciales
      body: JSON.stringify({ correo, contrasena }),
    });

    const data = await res.json();
    // ─────────────────────────────────────────────────────────

    if (!res.ok) {
      // El servidor devolvió un error (401, 400, etc.)
      mostrarError("error-login", data.error || "Error al iniciar sesión.");
      return;
    }

    // Éxito: guardamos el JWT y mostramos el dashboard
    sesion.iniciar(data.token, data.correo);
    mostrarDashboard();
  } catch (err) {
    // Error de red (servidor caído, sin internet, etc.)
    mostrarError("error-login", "No se pudo conectar con el servidor.");
    console.error("Error en login:", err);
  }
}

/**
 * handleRegistro()
 * Llama al endpoint POST /api/registro con los datos del formulario.
 */
async function handleRegistro() {
  ocultarError("error-registro");
  ocultarError("exito-registro"); // ojo: ocultarError reutiliza la lógica

  const correo = document.getElementById("reg-correo").value.trim();
  const contrasena = document.getElementById("reg-pass").value;
  const fecha_nacimiento = document.getElementById("reg-fecha").value;

  if (!correo || !contrasena || !fecha_nacimiento) {
    mostrarError("error-registro", "Todos los campos son obligatorios.");
    return;
  }

  if (contrasena.length < 8) {
    mostrarError("error-registro", "La contraseña debe tener al menos 8 caracteres.");
    return;
  }

  try {
    // ── Llamada a la API ──────────────────────────────────────
    const res = await fetch(`${API_BASE}/api/registro`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ correo, contrasena, fecha_nacimiento }),
    });

    const data = await res.json();
    // ─────────────────────────────────────────────────────────

    if (!res.ok) {
      mostrarError("error-registro", data.error || "Error al registrar.");
      return;
    }

    // Éxito: mostramos confirmación y cambiamos al tab de login
    mostrarExito("exito-registro", "✅ Cuenta creada. Ahora inicia sesión.");
    setTimeout(() => cambiarTab("login"), 1800);
  } catch (err) {
    mostrarError("error-registro", "No se pudo conectar con el servidor.");
    console.error("Error en registro:", err);
  }
}

/** Limpia la sesión y vuelve a la pantalla de login */
function cerrarSesion() {
  sesion.cerrar();
  mapaLeaflet = null; // resetear instancia del mapa
  document.getElementById("pantalla-dashboard").classList.add("oculto");
  document.getElementById("pantalla-auth").classList.remove("oculto");
  document.getElementById("pantalla-auth").classList.add("activa");
  document.getElementById("lista-historial").innerHTML =
    '<p class="estado-vacio">Cargando tu historial…</p>';
}

// ============================================================
// HISTORIAL DE VACUNAS
// ============================================================

/**
 * cargarHistorial()
 * Llama al endpoint GET /api/historial (protegido con JWT).
 * Recibe el arreglo de vacunas registradas y renderiza las tarjetas.
 */
async function cargarHistorial() {
  const contenedor = document.getElementById("lista-historial");
  contenedor.innerHTML = '<p class="estado-vacio">Cargando…</p>';

  try {
    // ── Llamada a la API (con Authorization header) ──────────
    const res = await fetch(`${API_BASE}/api/historial`, {
      headers: {
        // El JWT viaja en el header Authorization como Bearer token
        Authorization: `Bearer ${sesion.token}`,
      },
    });

    const data = await res.json();
    // ─────────────────────────────────────────────────────────

    if (!res.ok) {
      contenedor.innerHTML = `<p class="estado-vacio">Error al cargar el historial.</p>`;
      return;
    }

    if (data.length === 0) {
      contenedor.innerHTML = `
        <p class="estado-vacio">
          Aún no has registrado ninguna vacuna.<br>
          Presiona "Registrar vacuna aplicada" para comenzar.
        </p>`;
      return;
    }

    // Renderizar una tarjeta por cada entrada del historial
    contenedor.innerHTML = data.map((v) => crearTarjetaVacuna(v)).join("");
  } catch (err) {
    contenedor.innerHTML = '<p class="estado-vacio">Error de conexión.</p>';
    console.error("Error cargando historial:", err);
  }
}

/**
 * crearTarjetaVacuna(vacuna)
 * Genera el HTML de una tarjeta para el historial.
 * @param {Object} vacuna - Objeto con nombre_vacuna, fecha_aplicacion, notas.
 * @returns {string} HTML de la tarjeta.
 */
  function crearTarjetaVacuna(vacuna) {
    // Simplemente pasamos la fecha que llega de la base de datos
    const fecha = new Date(vacuna.fecha_aplicacion);
    
    // Le sumamos el timezone offset para evitar que se atrase un día por el uso horario
    fecha.setMinutes(fecha.getMinutes() + fecha.getTimezoneOffset());

    const fechaFormateada = fecha.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    return `
      <div class="vacuna-card">
        <div class="vacuna-icono">💉</div>
        <div class="vacuna-info">
          <p class="vacuna-nombre">${vacuna.nombre_vacuna}</p>
          <p class="vacuna-fecha">${fechaFormateada}</p>
          ${vacuna.notas ? `<p class="vacuna-notas">${vacuna.notas}</p>` : ""}
        </div>
      </div>
    `;
  }

// ============================================================
// MODAL: REGISTRAR NUEVA VACUNA
// ============================================================

/**
 * abrirModalVacuna()
 * Muestra el modal y carga el catálogo de vacunas desde la API
 * para poblar el <select> con las opciones disponibles.
 */
async function abrirModalVacuna() {
  document.getElementById("modal-vacuna").classList.remove("oculto");
  ocultarError("error-vacuna");
  document.getElementById("exito-vacuna").classList.add("oculto");

  // Cargar catálogo solo si el select está vacío (evita llamadas repetidas)
  const select = document.getElementById("sel-vacuna");
  if (select.options.length <= 1) {
    await cargarCatalogoEnSelect(select);
  }
}

/** Cierra el modal y limpia el formulario */
function cerrarModalVacuna() {
  document.getElementById("modal-vacuna").classList.add("oculto");
  document.getElementById("sel-vacuna").value = "";
  document.getElementById("fecha-aplicacion").value = "";
  document.getElementById("notas-vacuna").value = "";
}

/**
 * cargarCatalogoEnSelect(selectEl)
 * Puebla el elemento <select> con las vacunas oficiales de México.
 * @param {HTMLSelectElement} selectEl
 */
async function cargarCatalogoEnSelect(selectEl) {
  // Lista oficial basada en la Cartilla Nacional de Vacunación en México
  const vacunasMexico = [
    { id_vacuna: 1, nombre_vacuna: "BCG (Tuberculosis)", edad_recomendada: "Al nacer" },
    { id_vacuna: 2, nombre_vacuna: "Hepatitis B", edad_recomendada: "Al nacer, 2 y 6 meses" },
    { id_vacuna: 3, nombre_vacuna: "Hexavalente Acelular (DPaT+VAI+Hib+HB)", edad_recomendada: "2, 4, 6 y 18 meses" },
    { id_vacuna: 4, nombre_vacuna: "Rotavirus", edad_recomendada: "2 y 4 meses" },
    { id_vacuna: 5, nombre_vacuna: "Neumocócica Conjugada", edad_recomendada: "2, 4 y 12 meses" },
    { id_vacuna: 6, nombre_vacuna: "Influenza Estacional", edad_recomendada: "6 meses en adelante (Anual)" },
    { id_vacuna: 7, nombre_vacuna: "SRP (Sarampión, Rubéola, Parotiditis)", edad_recomendada: "1 y 6 años" },
    { id_vacuna: 8, nombre_vacuna: "DPT (Difteria, Tos Ferina, Tétanos)", edad_recomendada: "4 años (Refuerzo)" },
    { id_vacuna: 9, nombre_vacuna: "VPH (Virus del Papiloma Humano)", edad_recomendada: "Escolares / 11-14 años" },
    { id_vacuna: 10, nombre_vacuna: "Td (Tétanos y Difteria)", edad_recomendada: "A partir de los 15 años" },
    { id_vacuna: 11, nombre_vacuna: "Tdpa (Tétanos, Difteria, Tos Ferina acelular)", edad_recomendada: "Embarazadas / Refuerzo" },
    { id_vacuna: 12, nombre_vacuna: "COVID-19 (Refuerzo)", edad_recomendada: "Población de riesgo / Estacional" }
  ];

  try {
    // Intentamos cargar desde la API por si acaso
    const res = await fetch(`${API_BASE}/api/catalogo`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
    
    let vacunas = [];
    if (res.ok) {
      vacunas = await res.json();
    } else {
      // Si la API falla o está vacía, usamos la lista local de México
      vacunas = vacunasMexico;
    }

    // Si por alguna razón la API regresó un arreglo vacío, usamos el respaldo local
    if (vacunas.length === 0) {
      vacunas = vacunasMexico;
    }

    // Agregar una opción por cada vacuna al select
    vacunas.forEach((v) => {
      const option = document.createElement("option");
      option.value = v.id_vacuna;
      option.textContent = `${v.nombre_vacuna} — ${v.edad_recomendada}`;
      selectEl.appendChild(option);
    });
  } catch (err) {
    console.warn("Error con la API, usando catálogo local de México.");
    
    // Respaldo inmediato en caso de que no haya conexión con el backend
    vacunasMexico.forEach((v) => {
      const option = document.createElement("option");
      option.value = v.id_vacuna;
      option.textContent = `${v.nombre_vacuna} — ${v.edad_recomendada}`;
      selectEl.appendChild(option);
    });
  }
}
/**
 * guardarVacuna()
 * Toma los datos del modal y llama a POST /api/vacunas para
 * guardar la vacuna en el historial personal del usuario.
 */
async function guardarVacuna() {
  ocultarError("error-vacuna");
  document.getElementById("exito-vacuna").classList.add("oculto");

  const id_vacuna = document.getElementById("sel-vacuna").value;
  const fecha_aplicacion = document.getElementById("fecha-aplicacion").value;
  const notas = document.getElementById("notas-vacuna").value.trim();

  if (!id_vacuna || !fecha_aplicacion) {
    mostrarError("error-vacuna", "Selecciona una vacuna y la fecha de aplicación.");
    return;
  }

  try {
    // ── Llamada a la API ──────────────────────────────────────
    const res = await fetch(`${API_BASE}/api/vacunas`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sesion.token}`,
      },
      body: JSON.stringify({ id_vacuna, fecha_aplicacion, notas }),
    });

    const data = await res.json();
    // ─────────────────────────────────────────────────────────

    if (!res.ok) {
      mostrarError("error-vacuna", data.error || "Error al guardar.");
      return;
    }

    // Éxito: mostrar confirmación, cerrar modal y recargar historial
    mostrarExito("exito-vacuna", "✅ Vacuna guardada en tu historial.");
    setTimeout(() => {
      cerrarModalVacuna();
      cargarHistorial(); // Refrescar la lista en el dashboard
    }, 1200);
  } catch (err) {
    mostrarError("error-vacuna", "Error de conexión.");
    console.error("Error guardando vacuna:", err);
  }
}

// ============================================================
// MAPA LEAFLET + OPENSTREETMAP
// ============================================================

/**
 * inicializarMapa()
 * Crea el mapa Leaflet y llama a /api/mapa para obtener las
 * coordenadas de las clínicas. Coloca un marcador por cada una.
 *
 * Flujo:
 *  1. Se crea el mapa centrado en CDMX con tiles de OpenStreetMap.
 *  2. Se hace fetch a /api/mapa (GET, requiere JWT).
 *  3. Por cada clínica en el JSON se agrega un marcador (pin) al mapa.
 *  4. El popup del pin muestra nombre, dirección y servicios.
 */
async function inicializarMapa() {
  // Evitar reinicializar si el mapa ya existe
  if (mapaLeaflet !== null) return;

  // Coordenadas del centro de CDMX
  const CDMX = [19.4326, -99.1332];

  // Crear instancia del mapa en el div#mapa
  mapaLeaflet = L.map("mapa").setView(CDMX, 13);

  // ── Capa de tiles de OpenStreetMap (gratuito, sin API key) ──
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(mapaLeaflet);

  // ── Llamada a la API para obtener las clínicas ──────────────
  try {
    const res = await fetch(`${API_BASE}/api/mapa`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });

    if (!res.ok) {
      console.warn("No se pudo cargar el mapa de clínicas.");
      return;
    }

    // data: arreglo de { id, nombre, direccion, lat, lng, servicios }
    const clinicas = await res.json();
    // ───────────────────────────────────────────────────────────

    // Iterar el arreglo y colocar un marcador por cada clínica
    clinicas.forEach((clinica) => {
      // L.marker([ latitud, longitud ]) crea el pin en el mapa
      const marcador = L.marker([clinica.lat, clinica.lng]);

      // .bindPopup() agrega el tooltip que aparece al hacer clic
      marcador.bindPopup(`
        <strong>${clinica.nombre}</strong><br>
        <small>${clinica.direccion}</small><br>
        <em>Servicios: ${clinica.servicios.join(", ")}</em>
      `);

      // .addTo(mapa) coloca el marcador en el mapa
      marcador.addTo(mapaLeaflet);
    });

    // Ajustar el zoom para que todos los marcadores sean visibles
    if (clinicas.length > 0) {
      const coords = clinicas.map((c) => [c.lat, c.lng]);
      mapaLeaflet.fitBounds(coords, { padding: [40, 40] });
    }
  } catch (err) {
    console.error("Error cargando mapa:", err);
  }
}

// ============================================================
// CIERRE DEL MODAL AL HACER CLIC FUERA DE LA CAJA
// ============================================================
document.addEventListener("click", (e) => {
  const overlay = document.getElementById("modal-vacuna");
  // Si el clic fue directamente en el overlay (fondo oscuro) y no en la caja
  if (e.target === overlay) {
    cerrarModalVacuna();
  }
});

// ============================================================
// ENTER en formularios para submittear sin botón
// ============================================================
document.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const loginPanel = document.getElementById("form-login");
  const regPanel = document.getElementById("form-registro");

  if (loginPanel.classList.contains("activo")) {
    handleLogin();
  } else if (regPanel.classList.contains("activo")) {
    handleRegistro();
  }
});

// ============================================================
// NOTICIAS OFICIALES Y ALERTAS
// ============================================================

/** Carga las noticias desde la API y las renderiza */
async function cargarNoticias() {
  const contenedor = document.getElementById("lista-noticias");
  
  try {
    const res = await fetch(`${API_BASE}/api/noticias`, {
      headers: { Authorization: `Bearer ${sesion.token}` },
    });
    
    if (!res.ok) throw new Error("Error al cargar noticias");
    const noticias = await res.json();
    
    contenedor.innerHTML = noticias.map(n => `
      <div class="noticia-card">
        <span class="noticia-fecha">${n.fecha}</span>
        <h4 class="noticia-titulo">${n.titulo}</h4>
        <p class="noticia-desc">${n.resumen}</p>
        <a href="${n.enlace}" class="noticia-enlace">Leer el boletín →</a>
      </div>
    `).join("");
    
  } catch (err) {
    contenedor.innerHTML = '<p class="estado-vacio">No hay noticias disponibles en este momento.</p>';
    console.error(err);
  }
}

/** Genera las alertas de vacunación (Estáticas por ahora) */
function cargarAlertas() {
  const contenedor = document.getElementById("lista-alertas");
  
  // Como base, mostramos una recomendación estacional general.
  contenedor.innerHTML = `
    <div class="alerta-card">
      <div class="alerta-titulo">🔔 Temporada de Influenza y COVID-19</div>
      <div class="alerta-desc">
        Recuerda que se recomienda un refuerzo anual si perteneces a grupos de riesgo o si ha pasado más de 1 año de tu última dosis. Revisa tu historial.
      </div>
    </div>
  `;
}
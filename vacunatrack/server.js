// ============================================================
// VacunaTrack - server.js
// Servidor principal Express (Node.js)
// ============================================================

require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2/promise");

const app = express();
const PORT = process.env.PORT || 3000;

// ------------------------------------------------------------
// Middlewares globales
// ------------------------------------------------------------
app.use(cors());
app.use(express.json());
// Sirve los archivos estáticos del frontend desde /public
app.use(express.static(path.join(__dirname, "public")));

// ------------------------------------------------------------
// Pool de conexiones a MySQL
// El pool reutiliza conexiones en lugar de abrir una nueva
// en cada request, lo cual mejora el rendimiento.
// ------------------------------------------------------------
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "vacunatrack",
  waitForConnections: true,
  connectionLimit: 10,
});

// Verificar conexión al iniciar
(async () => {
  try {
    const conn = await pool.getConnection();
    console.log("✅  Conexión a MySQL establecida correctamente.");
    conn.release();
  } catch (err) {
    console.error("❌  No se pudo conectar a MySQL:", err.message);
    process.exit(1);
  }
})();

// ------------------------------------------------------------
// Middleware: verificar JWT
// Se usa en rutas que requieren sesión activa.
// El token llega en el header: Authorization: Bearer <token>
// ------------------------------------------------------------
function verificarToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // "Bearer TOKEN"

  if (!token) {
    return res.status(401).json({ error: "Token no proporcionado." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // { id_usuario, correo }
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token inválido o expirado." });
  }
}

// ============================================================
// RUTAS DE LA API
// ============================================================

// ------------------------------------------------------------
// POST /api/registro
// Registra un nuevo usuario.
// Body: { correo, contrasena, fecha_nacimiento }
// ------------------------------------------------------------
app.post("/api/registro", async (req, res) => {
  const { correo, contrasena, fecha_nacimiento } = req.body;

  // Validaciones básicas de entrada
  if (!correo || !contrasena || !fecha_nacimiento) {
    return res
      .status(400)
      .json({ error: "correo, contrasena y fecha_nacimiento son requeridos." });
  }
  if (contrasena.length < 8) {
    return res
      .status(400)
      .json({ error: "La contraseña debe tener al menos 8 caracteres." });
  }

  try {
    // Verificar que el correo no esté ya registrado
    const [existe] = await pool.query(
      "SELECT id_usuario FROM Usuarios WHERE correo = ?",
      [correo]
    );
    if (existe.length > 0) {
      return res.status(409).json({ error: "Ese correo ya está registrado." });
    }

    // Generar hash de la contraseña (salt rounds = 12)
    const hash = await bcrypt.hash(contrasena, 12);

    // Insertar usuario en la base de datos
    const [result] = await pool.query(
      "INSERT INTO Usuarios (correo, contrasena_hash, fecha_nacimiento) VALUES (?, ?, ?)",
      [correo, hash, fecha_nacimiento]
    );

    res.status(201).json({
      mensaje: "Usuario registrado exitosamente.",
      id_usuario: result.insertId,
    });
  } catch (err) {
    console.error("Error en /api/registro:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ------------------------------------------------------------
// POST /api/login
// Autentica un usuario y devuelve un JWT.
// Body: { correo, contrasena }
// ------------------------------------------------------------
app.post("/api/login", async (req, res) => {
  const { correo, contrasena } = req.body;

  if (!correo || !contrasena) {
    return res
      .status(400)
      .json({ error: "correo y contrasena son requeridos." });
  }

  try {
    // Buscar usuario por correo
    const [rows] = await pool.query(
      "SELECT id_usuario, correo, contrasena_hash FROM Usuarios WHERE correo = ?",
      [correo]
    );

    if (rows.length === 0) {
      // Mensaje genérico para no revelar si el correo existe
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    const usuario = rows[0];

    // Comparar contraseña ingresada con el hash almacenado
    const coincide = await bcrypt.compare(contrasena, usuario.contrasena_hash);
    if (!coincide) {
      return res.status(401).json({ error: "Credenciales incorrectas." });
    }

    // Generar JWT con datos no sensibles (sin hash, sin password)
    const token = jwt.sign(
      { id_usuario: usuario.id_usuario, correo: usuario.correo },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({ token, correo: usuario.correo });
  } catch (err) {
    console.error("Error en /api/login:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ------------------------------------------------------------
// GET /api/catalogo
// Devuelve el catálogo completo de vacunas disponibles.
// Requiere sesión activa (JWT).
// ------------------------------------------------------------
app.get("/api/catalogo", verificarToken, async (req, res) => {
  try {
    const [vacunas] = await pool.query(
      "SELECT id_vacuna, nombre_vacuna, descripcion, edad_recomendada FROM Catalogo_Vacunas ORDER BY nombre_vacuna"
    );
    res.json(vacunas);
  } catch (err) {
    console.error("Error en /api/catalogo:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ------------------------------------------------------------
// POST /api/vacunas
// Registra manualmente una vacuna aplicada al usuario.
// Requiere sesión activa (JWT).
// Body: { id_vacuna, fecha_aplicacion, notas? }
// ------------------------------------------------------------
app.post("/api/vacunas", verificarToken, async (req, res) => {
  const { id_vacuna, fecha_aplicacion, notas } = req.body;
  const id_usuario = req.usuario.id_usuario; // Extraído del JWT

  if (!id_vacuna || !fecha_aplicacion) {
    return res
      .status(400)
      .json({ error: "id_vacuna y fecha_aplicacion son requeridos." });
  }

  try {
    // Verificar que la vacuna exista en el catálogo
    const [vacuna] = await pool.query(
      "SELECT id_vacuna FROM Catalogo_Vacunas WHERE id_vacuna = ?",
      [id_vacuna]
    );
    if (vacuna.length === 0) {
      return res
        .status(404)
        .json({ error: "La vacuna especificada no existe en el catálogo." });
    }

    // Insertar registro en el historial personal del usuario
    const [result] = await pool.query(
      "INSERT INTO Historial_Personal (id_usuario, id_vacuna, fecha_aplicacion, notas) VALUES (?, ?, ?, ?)",
      [id_usuario, id_vacuna, fecha_aplicacion, notas || null]
    );

    res.status(201).json({
      mensaje: "Vacuna registrada en tu historial.",
      id_historial: result.insertId,
    });
  } catch (err) {
    console.error("Error en /api/vacunas:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ------------------------------------------------------------
// GET /api/historial
// Devuelve el historial de vacunas del usuario autenticado.
// Requiere sesión activa (JWT).
// ------------------------------------------------------------
app.get("/api/historial", verificarToken, async (req, res) => {
  const id_usuario = req.usuario.id_usuario;

  try {
    const [historial] = await pool.query(
      `SELECT
         hp.id_historial,
         cv.nombre_vacuna,
         cv.descripcion,
         hp.fecha_aplicacion,
         hp.notas,
         hp.registrado_en
       FROM Historial_Personal hp
       INNER JOIN Catalogo_Vacunas cv ON hp.id_vacuna = cv.id_vacuna
       WHERE hp.id_usuario = ?
       ORDER BY hp.fecha_aplicacion DESC`,
      [id_usuario]
    );
    res.json(historial);
  } catch (err) {
    console.error("Error en /api/historial:", err);
    res.status(500).json({ error: "Error interno del servidor." });
  }
});

// ------------------------------------------------------------
// GET /api/noticias
// Devuelve un JSON con las últimas noticias oficiales.
// ------------------------------------------------------------
app.get("/api/noticias", verificarToken, (req, res) => {
  const noticias = [
    {
      id: 1,
      titulo: "Campaña Nacional contra la Influenza",
      fecha: "14 de Junio, 2026",
      resumen: "Inicia la campaña de vacunación estacional. Protege a tu familia acudiendo a tu clínica más cercana.",
      enlace: "#"
    },
    {
      id: 2,
      titulo: "Actualización esquema Hexavalente",
      fecha: "10 de Junio, 2026",
      resumen: "Nuevos lineamientos de la Secretaría de Salud para la aplicación de la vacuna en menores de 2 años.",
      enlace: "#"
    }
  ];
  res.json(noticias);
});

// ------------------------------------------------------------
// GET /api/mapa
// Devuelve un JSON estático con coordenadas de 3 clínicas
// de ejemplo (Ciudad de México). No requiere autenticación
// para que el mapa sea accesible desde el dashboard.
//
// NOTA: En producción, estas coordenadas podrían venir de
// una tabla en BD para hacerlas editables sin tocar el código.
// ------------------------------------------------------------
app.get("/api/mapa", verificarToken, (req, res) => {
  const clinicas = [
    {
      id: 1,
      nombre: "Clínica Condesa",
      direccion: "Av. Ámsterdam 45, Hipódromo Condesa, CDMX",
      lat: 19.4118,
      lng: -99.1733,
      servicios: ["Influenza", "Hepatitis B", "dTpa"],
    },
    {
      id: 2,
      nombre: "Centro de Salud Roma Norte",
      direccion: "Orizaba 180, Roma Norte, CDMX",
      lat: 19.4178,
      lng: -99.1586,
      servicios: ["Influenza", "dTpa"],
    },
    {
      id: 3,
      nombre: "Farmacia Guadalajara Polanco",
      direccion: "Presidente Masaryk 360, Polanco, CDMX",
      lat: 19.4333,
      lng: -99.1891,
      servicios: ["Influenza", "Hepatitis B"],
    },
  ];

  res.json(clinicas);
});

// ------------------------------------------------------------
// Catch-all: para rutas no encontradas del frontend (SPA)
// Devuelve index.html para que el router del lado cliente
// maneje la navegación.
// ------------------------------------------------------------
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ------------------------------------------------------------
// Iniciar servidor
// ------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`🚀  VacunaTrack corriendo en http://localhost:${PORT}`);
});

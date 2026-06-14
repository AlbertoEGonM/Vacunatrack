# VacunaTrack 💉
Plataforma personal de autogestión de vacunación para adultos jóvenes (18–35 años).
Sistema 100% independiente — sin conexión con instituciones públicas ni identificadores gubernamentales.

---

## Estructura del proyecto

```
vacunatrack/
├── db/
│   └── schema.sql          # Script SQL: crea la BD y tablas, inserta vacunas de ejemplo
├── public/                 # Frontend estático servido por Express
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── .env.example            # Plantilla de variables de entorno
├── package.json
├── server.js               # Servidor Express (backend + API)
└── README.md
```

---

## Requisitos previos

| Herramienta | Versión mínima |
|-------------|---------------|
| Node.js     | 18.x LTS      |
| npm         | 9.x           |
| MySQL       | 8.0           |

---

## Instalación paso a paso

### 1. Clonar o copiar el proyecto
```bash
# Si tienes git:
git clone <url-del-repo>
cd vacunatrack

# O simplemente copia la carpeta y entra a ella
cd vacunatrack
```

### 2. Instalar dependencias de Node.js
```bash
npm install
```
Esto instala: `express`, `mysql2`, `bcryptjs`, `jsonwebtoken`, `dotenv`, `cors`.

### 3. Configurar variables de entorno
```bash
# Copia el archivo de ejemplo
cp .env.example .env

# Edita .env con tu editor favorito
nano .env        # o: code .env / vim .env
```

Ajusta estos valores en `.env`:
```
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=TU_PASSWORD_REAL
DB_NAME=vacunatrack
PORT=3000
JWT_SECRET=una_cadena_muy_larga_y_aleatoria_min_32_caracteres
```

### 4. Crear la base de datos MySQL
```bash
# Conectar a MySQL como root (o usuario con permisos de creación)
mysql -u root -p

# Dentro de MySQL, ejecutar el script:
source /ruta/completa/a/vacunatrack/db/schema.sql

# O desde la terminal directamente:
mysql -u root -p < db/schema.sql
```
El script crea la base de datos `vacunatrack`, las 3 tablas y 3 vacunas de ejemplo.

### 5. Iniciar el servidor
```bash
# Modo producción
npm start

# Modo desarrollo (reinicio automático con nodemon)
npm run dev
```

### 6. Abrir en el navegador
```
cd http://localhost:3000
```

---

## Endpoints de la API

| Método | Ruta            | Auth  | Descripción                          |
|--------|-----------------|-------|--------------------------------------|
| POST   | /api/registro   | ❌    | Registrar nuevo usuario              |
| POST   | /api/login      | ❌    | Iniciar sesión → devuelve JWT        |
| GET    | /api/catalogo   | ✅ JWT | Listar vacunas del catálogo          |
| POST   | /api/vacunas    | ✅ JWT | Guardar vacuna en historial personal |
| GET    | /api/historial  | ✅ JWT | Ver historial del usuario autenticado|
| GET    | /api/mapa       | ✅ JWT | Coordenadas de clínicas (JSON)       |

El JWT debe enviarse en el header:
```
Authorization: Bearer <token>
```

---

## Tecnologías utilizadas

- **Backend**: Node.js + Express 4
- **Base de datos**: MySQL 8 con pool de conexiones (mysql2)
- **Autenticación**: JWT (jsonwebtoken) + bcrypt (bcryptjs)
- **Frontend**: HTML5, CSS3 (mobile-first), JavaScript Vanilla
- **Mapa**: Leaflet.js 1.9.4 + OpenStreetMap (sin API key)

---

## Notas de seguridad (para producción)

1. Cambia `JWT_SECRET` por un string verdaderamente aleatorio: `openssl rand -base64 48`
2. Usa HTTPS (Let's Encrypt + nginx o Caddy).
3. Considera mover el JWT a cookies `httpOnly` para mayor protección contra XSS.
4. Agrega rate-limiting a `/api/login` para prevenir brute-force.
5. Valida y sanitiza todas las entradas del usuario.

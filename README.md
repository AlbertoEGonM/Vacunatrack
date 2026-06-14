# VacunaTrack 💉

VacunaTrack es una aplicación web *Full-Stack* diseñada para llevar un registro personal del historial de vacunación y localizar puntos de aplicación cercanos. 

El proyecto incluye un sistema de autenticación seguro, un catálogo precargado basado en la Cartilla Nacional de Salud de México y un mapa interactivo.

## Tecnologías y Stack

**Frontend:**
* HTML5 y CSS3 (Diseño Mobile-First, UI/UX moderno con paleta oscura).
* JavaScript (Vanilla JS, sin frameworks).
* [Leaflet.js](https://leafletjs.com/) con OpenStreetMap para el renderizado del mapa.

**Backend:**
* [Node.js](https://nodejs.org/) con [Express.js](https://expressjs.com/).
* Autenticación mediante **JWT** (JSON Web Tokens).
* Encriptación de contraseñas con **bcryptjs**.

**Base de Datos:**
* **MySQL 8.0+** (Uso del paquete `mysql2/promise` con pool de conexiones).

## Características Principales

* **Autenticación Segura:** Registro e inicio de sesión de usuarios protegiendo las contraseñas con hashes (bcrypt). Las sesiones se manejan mediante JWT almacenados en el `sessionStorage`.
* **Historial Personalizado:** Los usuarios pueden registrar manualmente las vacunas aplicadas, indicando fecha y notas adicionales.
* **Catálogo Oficial:** Incluye las principales vacunas aplicables en México (BCG, Hexavalente, Influenza, etc.) con sus respectivas edades recomendadas.
* **Mapa de Clínicas:** Integración de un mapa interactivo (Leaflet) que muestra marcadores de puntos de vacunación de ejemplo en la Ciudad de México.

## Instalación y Configuración Local

Sigue estos pasos para levantar el entorno de desarrollo en tu máquina local.

### 1. Requisitos Previos
* Tener instalado [Node.js](https://nodejs.org/) (v16 o superior).
* Tener instalado y corriendo un servidor **MySQL** (XAMPP, MAMP, Workbench, etc.).

### 2. Configurar la Base de Datos
1. Abre tu cliente de MySQL.
2. Ejecuta el archivo `schema.sql` (ubicado en tu carpeta de base de datos) para crear la base de datos `vacunatrack` y la estructura de tablas (`Usuarios`, `Catalogo_Vacunas`, `Historial_Personal`).
3. Asegúrate de insertar los registros del catálogo de vacunas. *Nota: Las tablas utilizan `INT UNSIGNED` en sus llaves primarias y foráneas para mantener una estricta integridad referencial.*

### 3. Instalar Dependencias
Clona el repositorio, abre una terminal en la carpeta raíz del proyecto y ejecuta:

```bash
npm install
"# Vacunatrack" 

-- ============================================================
-- VacunaTrack - Script de Base de Datos
-- Motor: MySQL 8.0+
-- Uso: Ejecutar con: mysql -u root -p < db/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS vacunatrack
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE vacunatrack;

-- ------------------------------------------------------------
-- Tabla: Usuarios
-- Almacena credenciales de acceso y fecha de nacimiento.
-- La contraseña se guarda como hash (bcrypt) NUNCA en texto plano.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Usuarios (
  id_usuario       INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  correo           VARCHAR(180)    NOT NULL UNIQUE,
  contrasena_hash  VARCHAR(255)    NOT NULL,
  fecha_nacimiento DATE            NOT NULL,
  creado_en        TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  INDEX idx_correo (correo)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- Tabla: Catalogo_Vacunas
-- Catálogo de vacunas recomendadas para adultos jóvenes (18-35).
-- edad_recomendada: texto libre para descripciones flexibles.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Catalogo_Vacunas (
  id_vacuna          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre_vacuna      VARCHAR(120)  NOT NULL,
  descripcion        TEXT,
  edad_recomendada   VARCHAR(80)   NOT NULL,
  PRIMARY KEY (id_vacuna)
) ENGINE=InnoDB;

-- Vacunas de ejemplo para el rango 18-35 años
INSERT INTO Catalogo_Vacunas (nombre_vacuna, descripcion, edad_recomendada) VALUES
  (
    'Tétanos / dTpa',
    'Refuerzo combinado contra tétanos, difteria y tosferina. Se recomienda una dosis cada 10 años.',
    '18-35 años (refuerzo cada 10 años)'
  ),
  (
    'Influenza',
    'Vacuna estacional contra la gripe. Se actualiza cada año y se aplica preferentemente en otoño.',
    '18-35 años (anual)'
  ),
  (
    'Hepatitis B',
    'Serie de 3 dosis (0, 1 y 6 meses) para adultos no vacunados previamente.',
    '18-35 años (serie de 3 dosis)'
  );

-- ------------------------------------------------------------
-- Tabla: Historial_Personal
-- Registro de cada vacuna que el usuario aplicó manualmente.
-- La relación ON DELETE CASCADE elimina el historial si se
-- elimina el usuario (privacidad y consistencia referencial).
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Historial_Personal (
  id_historial    INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  id_usuario      INT UNSIGNED  NOT NULL,
  id_vacuna       INT UNSIGNED  NOT NULL,
  fecha_aplicacion DATE         NOT NULL,
  notas           TEXT,
  registrado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_historial),
  FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario) ON DELETE CASCADE,
  FOREIGN KEY (id_vacuna)  REFERENCES Catalogo_Vacunas(id_vacuna) ON DELETE RESTRICT,
  INDEX idx_usuario (id_usuario)
) ENGINE=InnoDB;

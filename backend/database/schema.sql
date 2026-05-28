-- Crear base de datos (se asume que se creará o usará una existente)
CREATE DATABASE IF NOT EXISTS alerta_temprana_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE alerta_temprana_db;

-- 1. Tabla de Usuarios (Jefes de Carrera y Docentes)
CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    correo VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    rol ENUM('jefe_carrera', 'docente') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Tabla de Carreras
CREATE TABLE IF NOT EXISTS carreras (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(100) UNIQUE NOT NULL,
    jefe_id INT NULL,
    FOREIGN KEY (jefe_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Tabla de Grupos (Semestre + Nombre de Grupo)
CREATE TABLE IF NOT EXISTS grupos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    carrera_id INT NOT NULL,
    semestre VARCHAR(10) NOT NULL, -- ej. '1a', '3a', '5a', '7a'
    nombre VARCHAR(10) NOT NULL,   -- ej. 'A', 'B', 'C', 'D' (grupo completo ej. '1a A')
    tutor_id INT NULL,             -- Docente tutor designado para el grupo
    FOREIGN KEY (carrera_id) REFERENCES carreras(id) ON DELETE CASCADE,
    FOREIGN KEY (tutor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
    UNIQUE KEY uq_carrera_semestre_grupo (carrera_id, semestre, nombre),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_tutor (tutor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Tabla de Alumnos
CREATE TABLE IF NOT EXISTS alumnos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    grupo_id INT NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    matricula VARCHAR(20) UNIQUE NOT NULL,
    correo VARCHAR(100) NULL,
    telefono VARCHAR(20) NULL,
    estado ENUM('activo', 'riesgo', 'critico', 'baja') DEFAULT 'activo',
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_grupo (grupo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Tabla de Asignaciones (Docente - Grupo - Materia - Periodo)
CREATE TABLE IF NOT EXISTS asignaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    docente_id INT NOT NULL,
    grupo_id INT NOT NULL,
    materia VARCHAR(100) NOT NULL,
    periodo VARCHAR(20) NOT NULL, -- ej. '2026-1'
    FOREIGN KEY (docente_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (grupo_id) REFERENCES grupos(id) ON DELETE CASCADE,
    UNIQUE KEY uq_docente_grupo_materia_periodo (docente_id, grupo_id, materia, periodo),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_docente (docente_id),
    INDEX idx_grupo_asignado (grupo_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Tabla de Asistencias Diarias
CREATE TABLE IF NOT EXISTS asistencias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    asignacion_id INT NOT NULL,
    fecha DATE NOT NULL,
    estado ENUM('presente', 'falta', 'retardo', 'justificada') NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignacion_id) REFERENCES asignaciones(id) ON DELETE CASCADE,
    UNIQUE KEY uq_alumno_asignacion_fecha (alumno_id, asignacion_id, fecha),
    INDEX idx_alumno_fecha (alumno_id, fecha),
    INDEX idx_asignacion_fecha (asignacion_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Tabla de Participaciones Diarias
CREATE TABLE IF NOT EXISTS participaciones (
    id INT AUTO_INCREMENT PRIMARY KEY,
    alumno_id INT NOT NULL,
    asignacion_id INT NOT NULL,
    fecha DATE NOT NULL,
    puntos INT DEFAULT 1,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (alumno_id) REFERENCES alumnos(id) ON DELETE CASCADE,
    FOREIGN KEY (asignacion_id) REFERENCES asignaciones(id) ON DELETE CASCADE,
    INDEX idx_alumno_part (alumno_id),
    INDEX idx_asignacion_part (asignacion_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

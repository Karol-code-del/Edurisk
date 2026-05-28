USE alerta_temprana_db;

-- Limpiar tablas si existen registros (en orden inverso de dependencias)
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE participaciones;
TRUNCATE TABLE asistencias;
TRUNCATE TABLE asignaciones;
TRUNCATE TABLE alumnos;
TRUNCATE TABLE grupos;
TRUNCATE TABLE carreras;
TRUNCATE TABLE usuarios;
SET FOREIGN_KEY_CHECKS = 1;

-- 1. Insertar Usuarios
-- Contraseña encriptada para 'password123' usando bcrypt (sal de 10): $2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K
-- Rol: jefe_carrera (6 usuarios), docente (5 usuarios)
INSERT INTO usuarios (id, nombre, correo, password_hash, rol) VALUES
-- Jefes de Carrera
(1, 'Dr. Roberto Gómez (Sistemas)', 'roberto.sistemas@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'jefe_carrera'),
(2, 'Mtra. Elena Ruiz (Ciberseguridad)', 'elena.ciber@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'jefe_carrera'),
(3, 'Ing. Carlos Mendoza (Agronomía)', 'carlos.agro@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'jefe_carrera'),
(4, 'Dra. Patricia Silva (Biología)', 'patricia.bio@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'jefe_carrera'),
(5, 'Mtro. Fernando León (Gestión)', 'fernando.gestion@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'jefe_carrera'),
(6, 'Dr. Miguel Aguilar (Veterinaria)', 'miguel.vet@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'jefe_carrera'),
-- Docentes (Perfil Cruzado)
(7, 'Ing. Ana Martínez (Sistemas y Ciber)', 'ana.martinez@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'docente'),
(8, 'Dr. Jorge Valdés (Agronomía y Veterinaria)', 'jorge.valdes@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'docente'),
(9, 'Biól. Sofía Castro (Biología y Veterinaria)', 'sofia.castro@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'docente'),
(10, 'Mtra. Laura Ortiz (Gestión y Sistemas)', 'laura.ortiz@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'docente'),
(11, 'Ing. Raúl Peza (Ciber y Sistemas)', 'raul.peza@universidad.edu', '$2a$10$EmyxK3H6uXyS1Jb5ZlYvEev9NqC3C1MebtVzO/k4L6t5u.98W.z4K', 'docente');

-- 2. Insertar Carreras (Asociadas a sus Jefes)
INSERT INTO carreras (id, nombre, jefe_id) VALUES
(1, 'Ingeniería en Sistemas Computacionales', 1),
(2, 'Ciberseguridad', 2),
(3, 'Agronomía', 3),
(4, 'Lic. en Biología', 4),
(5, 'Ingeniería en Gestión Empresarial', 5),
(6, 'Ingeniería en Veterinaria', 6);

-- 3. Insertar Grupos
-- Agronomía tiene múltiples grupos por semestre para cumplir con la descripción del usuario.
INSERT INTO grupos (id, carrera_id, semestre, nombre) VALUES
-- Sistemas (Semestres 1a, 3a, 5a, 7a)
(1, 1, '1a', 'A'),
(2, 1, '3a', 'A'),
(3, 1, '5a', 'A'),
(4, 1, '7a', 'A'),
-- Ciberseguridad
(5, 2, '1a', 'A'),
(6, 2, '3a', 'A'),
-- Agronomía (Múltiples grupos por semestre)
(7, 3, '1a', 'A'),
(8, 3, '1a', 'B'),
(9, 3, '1a', 'C'),
(10, 3, '3a', 'A'),
(11, 3, '3a', 'B'),
(12, 3, '5a', 'A'),
-- Biología
(13, 4, '1a', 'A'),
(14, 4, '3a', 'A'),
-- Gestión Empresarial
(15, 5, '1a', 'A'),
(16, 5, '3a', 'A'),
-- Veterinaria
(17, 6, '1a', 'A'),
(18, 6, '3a', 'A'),
(19, 6, '1a', 'B');

-- 4. Insertar Alumnos
-- Sistemas Computacionales (1a A)
INSERT INTO alumnos (id, grupo_id, nombre, matricula, correo, estado) VALUES
(1, 1, 'Héctor Juárez Domínguez', '202601001', 'hector@alumnos.edu', 'activo'),
(2, 1, 'Mariana Flores Solano', '202601002', 'mariana@alumnos.edu', 'activo'),
(3, 1, 'José Alberto Ríos Cruz', '202601003', 'alberto@alumnos.edu', 'activo'),
(4, 1, 'Karla Mendoza Ortega', '202601004', 'karla@alumnos.edu', 'activo'),
(5, 1, 'Eduardo Torres Villanueva', '202601005', 'eduardo@alumnos.edu', 'activo');

-- Agronomía (1a A)
INSERT INTO alumnos (id, grupo_id, nombre, matricula, correo, estado) VALUES
(6, 7, 'Gabriel Cruz Rincón', '202603001', 'gabriel@alumnos.edu', 'activo'),
(7, 7, 'Jimena Sánchez Torres', '202603002', 'jimena@alumnos.edu', 'activo'),
(8, 7, 'Mauricio Ruiz Peña', '202603003', 'mauricio@alumnos.edu', 'activo'),
(9, 7, 'Sandra Luna Pérez', '202603004', 'sandra@alumnos.edu', 'activo'),
(10, 7, 'Pedro Morales Castro', '202603005', 'pedro@alumnos.edu', 'activo');

-- Agronomía (1a B)
INSERT INTO alumnos (id, grupo_id, nombre, matricula, correo, estado) VALUES
(11, 8, 'Víctor Hugo Robles', '202603006', 'victor@alumnos.edu', 'activo'),
(12, 8, 'Isabel Ramos Flores', '202603007', 'isabel@alumnos.edu', 'activo'),
(13, 8, 'Óscar Ortiz Méndez', '202603008', 'oscar@alumnos.edu', 'activo');

-- Ciberseguridad (1a A)
INSERT INTO alumnos (id, grupo_id, nombre, matricula, correo, estado) VALUES
(14, 5, 'Alejandro Vargas Díaz', '202602001', 'alejandro@alumnos.edu', 'activo'),
(15, 5, 'Beatriz Romero Juárez', '202602002', 'beatriz@alumnos.edu', 'activo'),
(16, 5, 'Daniel Solís Medina', '202602003', 'daniel@alumnos.edu', 'activo'),
(17, 5, 'Fernanda Pineda Reyes', '202602004', 'fernanda@alumnos.edu', 'activo');

-- Gestión Empresarial (1a A)
INSERT INTO alumnos (id, grupo_id, nombre, matricula, correo, estado) VALUES
(18, 15, 'Ricardo Moreno Gómez', '202605001', 'ricardo@alumnos.edu', 'activo'),
(19, 15, 'Pamela Aguilar López', '202605002', 'pamela@alumnos.edu', 'activo'),
(20, 15, 'Andrés Palacios Sosa', '202605003', 'andres@alumnos.edu', 'activo');

-- Veterinaria (1a A)
INSERT INTO alumnos (id, grupo_id, nombre, matricula, correo, estado) VALUES
(21, 17, 'Julio César Peralta', '202606001', 'julio@alumnos.edu', 'activo'),
(22, 17, 'Sofía Martínez Rivas', '202606002', 'sofiam@alumnos.edu', 'activo'),
(23, 17, 'Guillermo Orozco Beltrán', '202606003', 'guillermo@alumnos.edu', 'activo');

-- 5. Insertar Asignaciones (Materias del periodo 2026-1)
-- Notar perfil cruzado de algunos docentes:
-- Docente 7 (Sistemas y Ciber)
-- Docente 8 (Agronomía y Veterinaria)
-- Docente 9 (Biología y Veterinaria)
-- Docente 10 (Gestión y Sistemas)
-- Docente 11 (Ciber y Sistemas)
INSERT INTO asignaciones (id, docente_id, grupo_id, materia, periodo) VALUES
(1, 7, 1, 'Programación Orientada a Objetos', '2026-1'), -- Ana en Sistemas 1a A
(2, 7, 5, 'Introducción a la Ciberseguridad', '2026-1'), -- Ana en Ciber 1a A
(3, 8, 7, 'Edafología Aplicada', '2026-1'),             -- Jorge en Agronomía 1a A
(4, 8, 8, 'Edafología Aplicada', '2026-1'),             -- Jorge en Agronomía 1a B
(5, 8, 17, 'Zootecnia General', '2026-1'),              -- Jorge en Veterinaria 1a A
(6, 9, 17, 'Anatomía Veterinaria I', '2026-1'),         -- Sofía en Veterinaria 1a A
(7, 10, 15, 'Fundamentos de Administración', '2026-1'), -- Laura en Gestión 1a A
(8, 10, 1, 'Álgebra Lineal', '2026-1'),                  -- Laura en Sistemas 1a A
(9, 11, 5, 'Redes de Computadoras', '2026-1');           -- Raúl en Ciber 1a A

-- 6. Insertar Historial de Asistencias (Simulación de 10 sesiones anteriores para mostrar alertas dinámicas)
-- Fechas simuladas: Del 2026-05-10 al 2026-05-20 (excluyendo fin de semana 16 y 17)
-- Alumnos de Sistemas 1a A (Asignación 1 - Programación)
-- Alumno 1 (Héctor): 10 asistencias (100% - Activo)
-- Alumno 2 (Mariana): 8 asistencias, 2 retardos (90% - Activo)
-- Alumno 3 (José): 8 asistencias, 2 faltas (80% - Riesgo Leve)
-- Alumno 4 (Karla): 6 asistencias, 4 faltas (60% - Riesgo Crítico)
-- Alumno 5 (Eduardo): 10 asistencias (100% - Activo)
INSERT INTO asistencias (alumno_id, asignacion_id, fecha, estado) VALUES
-- Héctor (id 1): Todo presente
(1, 1, '2026-05-10', 'presente'), (1, 1, '2026-05-11', 'presente'), (1, 1, '2026-05-12', 'presente'), (1, 1, '2026-05-13', 'presente'), (1, 1, '2026-05-14', 'presente'),
(1, 1, '2026-05-15', 'presente'), (1, 1, '2026-05-18', 'presente'), (1, 1, '2026-05-19', 'presente'), (1, 1, '2026-05-20', 'presente'),

-- Mariana (id 2): Con retardos
(2, 1, '2026-05-10', 'presente'), (2, 1, '2026-05-11', 'retardo'),  (2, 1, '2026-05-12', 'presente'), (2, 1, '2026-05-13', 'presente'), (2, 1, '2026-05-14', 'presente'),
(2, 1, '2026-05-15', 'presente'), (2, 1, '2026-05-18', 'retardo'),  (2, 1, '2026-05-19', 'presente'), (2, 1, '2026-05-20', 'presente'),

-- José (id 3): 2 faltas
(3, 1, '2026-05-10', 'presente'), (3, 1, '2026-05-11', 'falta'),     (3, 1, '2026-05-12', 'presente'), (3, 1, '2026-05-13', 'presente'), (3, 1, '2026-05-14', 'falta'),
(3, 1, '2026-05-15', 'presente'), (3, 1, '2026-05-18', 'presente'), (3, 1, '2026-05-19', 'presente'), (3, 1, '2026-05-20', 'presente'),

-- Karla (id 4): 4 faltas (Riesgo Crítico)
(4, 1, '2026-05-10', 'presente'), (4, 1, '2026-05-11', 'falta'),     (4, 1, '2026-05-12', 'falta'),     (4, 1, '2026-05-13', 'presente'), (4, 1, '2026-05-14', 'falta'),
(4, 1, '2026-05-15', 'presente'), (4, 1, '2026-05-18', 'falta'),     (4, 1, '2026-05-19', 'presente'), (4, 1, '2026-05-20', 'presente'),

-- Eduardo (id 5): Todo presente
(5, 1, '2026-05-10', 'presente'), (5, 1, '2026-05-11', 'presente'), (5, 1, '2026-05-12', 'presente'), (5, 1, '2026-05-13', 'presente'), (5, 1, '2026-05-14', 'presente'),
(5, 1, '2026-05-15', 'presente'), (5, 1, '2026-05-18', 'presente'), (5, 1, '2026-05-19', 'presente'), (5, 1, '2026-05-20', 'presente');


-- Alumnos de Agronomía 1a A (Asignación 3 - Edafología)
-- Gabriel Cruz (id 6): 10 asistencias (100% - Activo)
-- Jimena Sánchez (id 7): 7 asistencias, 3 faltas (70% - Riesgo Crítico)
-- Mauricio Ruiz (id 8): 9 asistencias, 1 falta (90% - Activo)
-- Sandra Luna (id 9): 5 asistencias, 5 faltas (50% - Riesgo Crítico)
-- Pedro Morales (id 10): 10 asistencias (100% - Activo)
INSERT INTO asistencias (alumno_id, asignacion_id, fecha, estado) VALUES
-- Gabriel
(6, 3, '2026-05-10', 'presente'), (6, 3, '2026-05-12', 'presente'), (6, 3, '2026-05-14', 'presente'), (6, 3, '2026-05-16', 'presente'), (6, 3, '2026-05-18', 'presente'), (6, 3, '2026-05-20', 'presente'),
-- Jimena (3 faltas de 6 clases = 50% de asistencia)
(7, 3, '2026-05-10', 'presente'), (7, 3, '2026-05-12', 'falta'),    (7, 3, '2026-05-14', 'falta'),    (7, 3, '2026-05-16', 'presente'), (7, 3, '2026-05-18', 'falta'),    (7, 3, '2026-05-20', 'presente'),
-- Mauricio
(8, 3, '2026-05-10', 'presente'), (8, 3, '2026-05-12', 'presente'), (8, 3, '2026-05-14', 'presente'), (8, 3, '2026-05-16', 'falta'),    (8, 3, '2026-05-18', 'presente'), (8, 3, '2026-05-20', 'presente'),
-- Sandra (4 faltas de 6 clases = 33% de asistencia)
(9, 3, '2026-05-10', 'falta'),    (9, 3, '2026-05-12', 'presente'), (9, 3, '2026-05-14', 'falta'),    (9, 3, '2026-05-16', 'falta'),    (9, 3, '2026-05-18', 'presente'), (9, 3, '2026-05-20', 'falta'),
-- Pedro
(10, 3, '2026-05-10', 'presente'), (10, 3, '2026-05-12', 'presente'), (10, 3, '2026-05-14', 'presente'), (10, 3, '2026-05-16', 'presente'), (10, 3, '2026-05-18', 'presente'), (10, 3, '2026-05-20', 'presente');

-- Actualizar el estado inicial de riesgo en la tabla alumnos basado en los porcentajes calculados para la demo
UPDATE alumnos SET estado = 'activo' WHERE id IN (1, 2, 5, 6, 8, 10);
UPDATE alumnos SET estado = 'riesgo' WHERE id IN (3);
UPDATE alumnos SET estado = 'critico' WHERE id IN (4, 7, 9);

-- 7. Insertar Participaciones Iniciales para hacer el dashboard más vivo
INSERT INTO participaciones (alumno_id, asignacion_id, fecha, puntos) VALUES
(1, 1, '2026-05-10', 2), (1, 1, '2026-05-12', 1), (1, 1, '2026-05-15', 3), (1, 1, '2026-05-19', 1),
(2, 1, '2026-05-11', 1), (2, 1, '2026-05-14', 2),
(5, 1, '2026-05-12', 2), (5, 1, '2026-05-15', 1), (5, 1, '2026-05-20', 2),
(6, 3, '2026-05-10', 3), (6, 3, '2026-05-14', 2), (6, 3, '2026-05-18', 1),
(8, 3, '2026-05-12', 1), (8, 3, '2026-05-20', 2);

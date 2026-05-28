const db = require('../config/db');

// Obtener grupos y materias asignadas al docente
const getGruposAsignados = async (req, res) => {
  const docenteId = req.user.id;

  try {
    const query = `
      SELECT 
        a.id AS asignacion_id, 
        a.materia, 
        a.periodo, 
        g.id AS grupo_id, 
        g.semestre, 
        g.nombre AS grupo_nombre, 
        c.nombre AS carrera_nombre
      FROM asignaciones a
      JOIN grupos g ON a.grupo_id = g.id
      JOIN carreras c ON g.carrera_id = c.id
      WHERE a.docente_id = ?
      ORDER BY c.nombre, g.semestre, g.nombre
    `;
    const [rows] = await db.query(query, [docenteId]);
    res.json(rows);
  } catch (error) {
    console.error('Error al obtener grupos asignados:', error);
    res.status(500).json({ error: 'Error al obtener la lista de grupos.' });
  }
};

// Obtener lista de alumnos de un grupo con sus métricas en la materia actual
const getAlumnosGrupo = async (req, res) => {
  const { asignacionId } = req.params;
  const docenteId = req.user.id;

  try {
    // 1. Verificar primero que la asignación pertenezca al docente logueado (Seguridad)
    const [asigCheck] = await db.query(
      'SELECT id, grupo_id FROM asignaciones WHERE id = ? AND docente_id = ?', 
      [asignacionId, docenteId]
    );

    if (asigCheck.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a esta asignación o no existe.' });
    }

    const { grupo_id } = asigCheck[0];

    // 2. Obtener alumnos con sumatoria de asistencias y participaciones en esta materia
    const query = `
      SELECT 
        al.id, 
        al.nombre, 
        al.matricula, 
        al.correo,
        al.estado AS estado_general,
        (SELECT COUNT(*) FROM asistencias a WHERE a.alumno_id = al.id AND a.asignacion_id = ?) as total_sesiones,
        (SELECT COUNT(*) FROM asistencias a WHERE a.alumno_id = al.id AND a.asignacion_id = ? AND a.estado = 'presente') as presentes,
        (SELECT COUNT(*) FROM asistencias a WHERE a.alumno_id = al.id AND a.asignacion_id = ? AND a.estado = 'falta') as faltas,
        (SELECT COUNT(*) FROM asistencias a WHERE a.alumno_id = al.id AND a.asignacion_id = ? AND a.estado = 'retardo') as retardos,
        (SELECT COUNT(*) FROM asistencias a WHERE a.alumno_id = al.id AND a.asignacion_id = ? AND a.estado = 'justificada') as justificadas,
        (SELECT COALESCE(SUM(p.puntos), 0) FROM participaciones p WHERE p.alumno_id = al.id AND p.asignacion_id = ?) as total_participaciones
      FROM alumnos al
      WHERE al.grupo_id = ?
      ORDER BY al.nombre ASC
    `;
    
    const [alumnos] = await db.query(query, [
      asignacionId, asignacionId, asignacionId, asignacionId, asignacionId, asignacionId, grupo_id
    ]);

    // Calcular el porcentaje de asistencia de cada alumno en esta clase
    const alumnosProcesados = alumnos.map(al => {
      const { presentes, retardos, faltas, justificadas } = al;
      const totalActivas = presentes + retardos + faltas; // justificadas no penalizan
      let porcentajeAsistencia = 100.0;
      
      if (totalActivas > 0) {
        // Retardos cuentan como 0.5 de asistencia
        porcentajeAsistencia = ((presentes + (retardos * 0.5)) / totalActivas) * 100;
      }

      return {
        ...al,
        porcentaje_asistencia: Math.round(porcentajeAsistencia * 10) / 10 // Redondear a 1 decimal
      };
    });

    res.json({
      grupo_id,
      alumnos: alumnosProcesados
    });

  } catch (error) {
    console.error('Error al obtener alumnos del grupo:', error);
    res.status(500).json({ error: 'Error al cargar la lista de alumnos.' });
  }
};

const importarAlumnosGrupo = async (req, res) => {
  const { asignacionId } = req.params;
  const { alumnos: alumnosImportados } = req.body;
  const docenteId = req.user.id;

  if (!Array.isArray(alumnosImportados) || alumnosImportados.length === 0) {
    return res.status(400).json({ error: 'Se requiere un listado de alumnos para importar.' });
  }

  const normalize = (value) => String(value ?? '').trim();

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const [asigCheck] = await connection.query(
      'SELECT id, grupo_id FROM asignaciones WHERE id = ? AND docente_id = ?',
      [asignacionId, docenteId]
    );

    if (asigCheck.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ error: 'No tienes permiso para esta asignación o no existe.' });
    }

    const { grupo_id } = asigCheck[0];
    let inserted = 0;
    let updated = 0;
    let skipped = 0;
    const warnings = [];

    for (const item of alumnosImportados) {
      const nombre = normalize(item.nombre || item.name || item.alumno || item.estudiante);
      const matricula = normalize(item.matricula || item.matrícula);
      const correo = normalize(item.correo || item.email);
      const telefono = normalize(item.telefono || item.celular || item.phone);

      if (!nombre && !matricula) {
        skipped += 1;
        continue;
      }

      let alumno = null;
      if (matricula) {
        const [alumnoByMatricula] = await connection.query(
          'SELECT * FROM alumnos WHERE matricula = ?',
          [matricula]
        );

        if (alumnoByMatricula.length > 0) {
          alumno = alumnoByMatricula[0];
          if (alumno.grupo_id !== grupo_id) {
            warnings.push(`La matrícula ${matricula} ya existe en otro grupo y no se importó.`);
            skipped += 1;
            continue;
          }
        }
      }

      if (!alumno && nombre) {
        const [alumnoByName] = await connection.query(
          'SELECT * FROM alumnos WHERE grupo_id = ? AND LOWER(nombre) = LOWER(?)',
          [grupo_id, nombre]
        );
        if (alumnoByName.length > 0) {
          alumno = alumnoByName[0];
        }
      }

      if (alumno) {
        const updates = [];
        const params = [];

        if (nombre && nombre !== alumno.nombre) {
          updates.push('nombre = ?');
          params.push(nombre);
        }
        if (correo && correo !== alumno.correo) {
          updates.push('correo = ?');
          params.push(correo);
        }
        if (telefono && telefono !== alumno.telefono) {
          updates.push('telefono = ?');
          params.push(telefono);
        }

        if (updates.length > 0) {
          params.push(alumno.id);
          await connection.query(`UPDATE alumnos SET ${updates.join(', ')} WHERE id = ?`, params);
          updated += 1;
        } else {
          skipped += 1;
        }

        continue;
      }

      if (!matricula) {
        warnings.push(`No se puede crear alumno sin matrícula: ${nombre || 'sin nombre'}.`);
        skipped += 1;
        continue;
      }

      try {
        await connection.query(
          'INSERT INTO alumnos (grupo_id, nombre, matricula, correo, telefono) VALUES (?, ?, ?, ?, ?)',
          [grupo_id, nombre || matricula, matricula, correo || null, telefono || null]
        );
        inserted += 1;
      } catch (error) {
        if (error.code === 'ER_DUP_ENTRY') {
          warnings.push(`La matrícula ${matricula} ya existe y no se importó.`);
          skipped += 1;
        } else {
          throw error;
        }
      }
    }

    await connection.commit();
    connection.release();

    res.json({
      total: alumnosImportados.length,
      inserted,
      updated,
      skipped,
      warnings
    });
  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error al importar alumnos al grupo:', error);
    res.status(500).json({ error: 'Error al importar alumnos a la base de datos.' });
  }
};

const getAsistenciaDiaria = async (req, res) => {
  const { asignacionId } = req.params;
  const docenteId = req.user.id;

  try {
    const [asigCheck] = await db.query(
      'SELECT id FROM asignaciones WHERE id = ? AND docente_id = ?',
      [asignacionId, docenteId]
    );

    if (asigCheck.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a esta asignación o no existe.' });
    }

    const [asistenciaDiaria] = await db.query(
      `SELECT 
         fecha,
         SUM(CASE WHEN estado = 'presente' THEN 1 ELSE 0 END) AS presentes,
         SUM(CASE WHEN estado = 'falta' THEN 1 ELSE 0 END) AS faltas,
         SUM(CASE WHEN estado = 'retardo' THEN 1 ELSE 0 END) AS retardos,
         SUM(CASE WHEN estado = 'justificada' THEN 1 ELSE 0 END) AS justificadas,
         COUNT(*) AS total_registros
       FROM asistencias
       WHERE asignacion_id = ?
       GROUP BY fecha
       ORDER BY fecha DESC`,
      [asignacionId]
    );

    const resumenDiario = asistenciaDiaria.map(row => {
      const totalActivas = row.presentes + row.faltas + row.retardos;
      const porcentaje = totalActivas > 0
        ? Math.round(((row.presentes + (row.retardos * 0.5)) / totalActivas) * 1000) / 10
        : 100.0;

      return {
        fecha: row.fecha,
        presentes: row.presentes,
        faltas: row.faltas,
        retardos: row.retardos,
        justificadas: row.justificadas,
        total_registros: row.total_registros,
        porcentaje_asistencia: porcentaje
      };
    });

    res.json(resumenDiario);
  } catch (error) {
    console.error('Error al obtener asistencia diaria:', error);
    res.status(500).json({ error: 'Error al obtener la asistencia diaria.' });
  }
};

const escapeCsvField = (value) => {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
};

const descargarAsistenciaGrupo = async (req, res) => {
  const { asignacionId } = req.params;
  const docenteId = req.user.id;

  try {
    const [asigCheck] = await db.query(
      'SELECT id, grupo_id, materia FROM asignaciones WHERE id = ? AND docente_id = ?',
      [asignacionId, docenteId]
    );

    if (asigCheck.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a esta asignación o no existe.' });
    }

    const { grupo_id, materia } = asigCheck[0];

    const query = `
      SELECT
        al.nombre,
        al.matricula,
        al.correo,
        al.telefono,
        al.estado AS estado_general,
        COALESCE(SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END), 0) AS presentes,
        COALESCE(SUM(CASE WHEN a.estado = 'falta' THEN 1 ELSE 0 END), 0) AS faltas,
        COALESCE(SUM(CASE WHEN a.estado = 'retardo' THEN 1 ELSE 0 END), 0) AS retardos,
        COALESCE(SUM(CASE WHEN a.estado = 'justificada' THEN 1 ELSE 0 END), 0) AS justificadas,
        COALESCE(SUM(p.puntos), 0) AS total_participaciones,
        COUNT(a.id) AS total_sesiones
      FROM alumnos al
      LEFT JOIN asistencias a ON al.id = a.alumno_id AND a.asignacion_id = ?
      LEFT JOIN participaciones p ON al.id = p.alumno_id AND p.asignacion_id = ?
      WHERE al.grupo_id = ?
      GROUP BY al.id
      ORDER BY al.nombre ASC
    `;

    const [rows] = await db.query(query, [asignacionId, asignacionId, grupo_id]);

    const header = [
      'Nombre',
      'Matrícula',
      'Correo',
      'Teléfono',
      'Estado general',
      'Total sesiones',
      'Presentes',
      'Faltas',
      'Retardos',
      'Justificadas',
      'Porcentaje asistencia',
      'Puntos participación'
    ];

    const lines = [header.map(escapeCsvField).join(',')];

    rows.forEach(row => {
      const totalActivas = row.presentes + row.faltas + row.retardos;
      const porcentaje = totalActivas > 0
        ? Math.round(((row.presentes + (row.retardos * 0.5)) / totalActivas) * 1000) / 10
        : 100.0;

      const line = [
        row.nombre,
        row.matricula,
        row.correo,
        row.telefono,
        row.estado_general,
        row.total_sesiones,
        row.presentes,
        row.faltas,
        row.retardos,
        row.justificadas,
        `${porcentaje}%`,
        row.total_participaciones
      ].map(escapeCsvField).join(',');

      lines.push(line);
    });

    const fileName = `asistencia_asignacion_${asignacionId}.csv`;
    const csvContent = `\uFEFF${lines.join('\r\n')}`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Error al descargar la asistencia del grupo:', error);
    res.status(500).json({ error: 'Error al generar el archivo de asistencia.' });
  }
};

// Registrar asistencias y participaciones del día
const registrarAsistenciaClase = async (req, res) => {
  const { asignacionId, fecha, alumnosData } = req.body;
  const docenteId = req.user.id;

  if (!asignacionId || !fecha || !Array.isArray(alumnosData)) {
    return res.status(400).json({ error: 'Datos de entrada incompletos o incorrectos.' });
  }

  // Iniciar una transacción para asegurar consistencia
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verificar seguridad del docente
    const [asigCheck] = await connection.query(
      'SELECT id, grupo_id FROM asignaciones WHERE id = ? AND docente_id = ?', 
      [asignacionId, docenteId]
    );

    if (asigCheck.length === 0) {
      await connection.rollback();
      connection.release();
      return res.status(403).json({ error: 'No autorizado para esta asignación.' });
    }

    const { grupo_id } = asigCheck[0];

    // 2. Insertar/Actualizar Asistencias y Participaciones por cada alumno
    for (const data of alumnosData) {
      const { alumno_id, estado_asistencia, puntos_participacion } = data;

      // A) Registrar asistencia (UPSERT usando ON DUPLICATE KEY UPDATE)
      await connection.query(`
        INSERT INTO asistencias (alumno_id, asignacion_id, fecha, estado)
        VALUES (?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE estado = VALUES(estado)
      `, [alumno_id, asignacionId, fecha, estado_asistencia]);

      // B) Registrar participación (eliminar anteriores de ese día en la materia y volver a insertar si son > 0)
      await connection.query(
        'DELETE FROM participaciones WHERE alumno_id = ? AND asignacion_id = ? AND fecha = ?',
        [alumno_id, asignacionId, fecha]
      );

      if (puntos_participacion > 0) {
        await connection.query(`
          INSERT INTO participaciones (alumno_id, asignacion_id, fecha, puntos)
          VALUES (?, ?, ?, ?)
        `, [alumno_id, asignacionId, fecha, puntos_participacion]);
      }

      // C) Recalcular riesgo acumulado global del alumno para el periodo escolar actual
      // Tomamos todas las materias en las que está inscrito en el grupo para sacar su tasa general de asistencia
      const queryTasaGeneral = `
        SELECT 
          COALESCE(SUM(CASE WHEN a.estado = 'presente' THEN 1 ELSE 0 END), 0) as presentes,
          COALESCE(SUM(CASE WHEN a.estado = 'falta' THEN 1 ELSE 0 END), 0) as faltas,
          COALESCE(SUM(CASE WHEN a.estado = 'retardo' THEN 1 ELSE 0 END), 0) as retardos
        FROM asistencias a
        WHERE a.alumno_id = ?
      `;
      const [tasaResult] = await connection.query(queryTasaGeneral, [alumno_id]);
      const { presentes, faltas, retardos } = tasaResult[0];
      const totalActivas = presentes + faltas + retardos;

      let estadoRiesgo = 'activo'; // Seguro por defecto
      if (totalActivas > 0) {
        const pct = ((presentes + (retardos * 0.5)) / totalActivas) * 100;
        
        if (pct < 70.0) {
          estadoRiesgo = 'critico';
        } else if (pct < 85.0) {
          estadoRiesgo = 'riesgo';
        }
      }

      // Actualizar el estado en el alumno
      await connection.query(
        'UPDATE alumnos SET estado = ? WHERE id = ?',
        [estadoRiesgo, alumno_id]
      );
    }

    await connection.commit();
    connection.release();

    res.json({ message: 'Clase registrada con éxito y alertas recalculadas.' });

  } catch (error) {
    await connection.rollback();
    connection.release();
    console.error('Error al registrar pase de lista:', error);
    res.status(500).json({ error: 'Error al guardar la asistencia en la base de datos.' });
  }
};

module.exports = {
  getGruposAsignados,
  getAlumnosGrupo,
  getAsistenciaDiaria,
  descargarAsistenciaGrupo,
  importarAlumnosGrupo,
  registrarAsistenciaClase
};

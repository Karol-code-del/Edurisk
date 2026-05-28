const db = require('../config/db');
const { sendWhatsAppMessage } = require('../services/whatsappService');

// Obtener métricas generales y estado de la carrera administrada por el Jefe
const getDashboardMetrics = async (req, res) => {
  const jefeId = req.user.id;

  try {
    // 1. Obtener la carrera del jefe
    const [carreraRows] = await db.query(
      'SELECT id, nombre FROM carreras WHERE jefe_id = ?', 
      [jefeId]
    );

    if (carreraRows.length === 0) {
      return res.status(404).json({ error: 'No tienes una carrera asignada como Jefe de Carrera.' });
    }

    const carreraId = carreraRows[0].id;
    const carreraNombre = carreraRows[0].nombre;

    // 2. Obtener estadísticas generales de alumnos
    const queryStats = `
      SELECT 
        COUNT(*) as total_alumnos,
        SUM(CASE WHEN estado = 'critico' THEN 1 ELSE 0 END) as alumnos_criticos,
        SUM(CASE WHEN estado = 'riesgo' THEN 1 ELSE 0 END) as alumnos_riesgo,
        SUM(CASE WHEN estado = 'activo' THEN 1 ELSE 0 END) as alumnos_activos
      FROM alumnos 
      WHERE grupo_id IN (SELECT id FROM grupos WHERE carrera_id = ?)
    `;
    const [statsResult] = await db.query(queryStats, [carreraId]);
    const stats = statsResult[0];

    // 3. Obtener riesgo por grupo/semestre
    const queryGrupos = `
      SELECT 
        g.id, 
        g.semestre, 
        g.nombre as grupo_nombre,
        COUNT(al.id) as total_alumnos,
        SUM(CASE WHEN al.estado = 'critico' THEN 1 ELSE 0 END) as criticos,
        SUM(CASE WHEN al.estado = 'riesgo' THEN 1 ELSE 0 END) as en_riesgo
      FROM grupos g
      LEFT JOIN alumnos al ON g.id = al.grupo_id
      WHERE g.carrera_id = ?
      GROUP BY g.id
      ORDER BY g.semestre, g.nombre
    `;
    const [grupos] = await db.query(queryGrupos, [carreraId]);

    res.json({
      carreraId,
      carreraNombre,
      resumen: {
        total_alumnos: stats.total_alumnos || 0,
        alumnos_criticos: stats.alumnos_criticos || 0,
        alumnos_riesgo: stats.alumnos_riesgo || 0,
        alumnos_activos: stats.alumnos_activos || 0
      },
      grupos
    });

  } catch (error) {
    console.error('Error al obtener métricas del Jefe:', error);
    res.status(500).json({ error: 'Error interno al cargar métricas.' });
  }
};

// Obtener lista de docentes de la carrera con sus respectivas materias y grupos asignados
const getDocentesCarrera = async (req, res) => {
  const jefeId = req.user.id;

  try {
    // 1. Obtener la carrera del jefe
    const [carreraRows] = await db.query('SELECT id FROM carreras WHERE jefe_id = ?', [jefeId]);
    if (carreraRows.length === 0) {
      return res.status(404).json({ error: 'Carrera no encontrada para este Jefe.' });
    }
    const carreraId = carreraRows[0].id;

    // 2. Obtener docentes y sus materias asignadas en esta carrera
    const query = `
      SELECT 
        u.id as docente_id, 
        u.nombre as docente_nombre, 
        u.correo as docente_correo,
        a.id as asignacion_id, 
        a.materia, 
        a.periodo,
        g.semestre, 
        g.nombre as grupo_nombre
      FROM usuarios u
      JOIN asignaciones a ON u.id = a.docente_id
      JOIN grupos g ON a.grupo_id = g.id
      WHERE g.carrera_id = ?
      ORDER BY u.nombre, g.semestre, g.nombre
    `;
    const [rows] = await db.query(query, [carreraId]);

    // Formatear la lista de docentes para que contenga sus asignaciones anidadas
    const docentesMap = {};
    rows.forEach(row => {
      if (!docentesMap[row.docente_id]) {
        docentesMap[row.docente_id] = {
          id: row.docente_id,
          nombre: row.docente_nombre,
          correo: row.docente_correo,
          asignaciones: []
        };
      }
      docentesMap[row.docente_id].asignaciones.push({
        id: row.asignacion_id,
        materia: row.materia,
        periodo: row.periodo,
        semestre: row.semestre,
        grupo: row.grupo_nombre
      });
    });

    const docentes = Object.values(docentesMap);
    res.json(docentes);

  } catch (error) {
    console.error('Error al obtener docentes de la carrera:', error);
    res.status(500).json({ error: 'Error al cargar lista de docentes.' });
  }
};

// Obtener lista detallada de alumnos en riesgo crítico y alerta
const getAlumnosRiesgo = async (req, res) => {
  const jefeId = req.user.id;

  try {
    // 1. Obtener carrera
    const [carreraRows] = await db.query('SELECT id FROM carreras WHERE jefe_id = ?', [jefeId]);
    if (carreraRows.length === 0) {
      return res.status(404).json({ error: 'Carrera no encontrada para este Jefe.' });
    }
    const carreraId = carreraRows[0].id;

    // 2. Obtener alumnos en riesgo/crítico con sus estadísticas globales consolidadas
    const query = `
      SELECT 
        al.id, 
        al.nombre, 
        al.matricula, 
        al.correo, 
        al.telefono,
        al.estado,
        g.semestre, 
        g.nombre as grupo_nombre,
        (SELECT COUNT(*) FROM asistencias a WHERE a.alumno_id = al.id) as total_sesiones,
        (SELECT COUNT(*) FROM asistencias a WHERE a.alumno_id = al.id AND a.estado = 'presente') as presentes,
        (SELECT COUNT(*) FROM asistencias a WHERE a.alumno_id = al.id AND a.estado = 'retardo') as retardos,
        (SELECT COUNT(*) FROM asistencias a WHERE a.alumno_id = al.id AND a.estado = 'falta') as faltas,
        (SELECT COALESCE(SUM(p.puntos), 0) FROM participaciones p WHERE p.alumno_id = al.id) as total_participaciones
      FROM alumnos al
      JOIN grupos g ON al.grupo_id = g.id
      WHERE g.carrera_id = ? AND al.estado IN ('critico', 'riesgo')
      ORDER BY al.estado DESC, al.nombre ASC
    `;
    const [rows] = await db.query(query, [carreraId]);

    // Procesar porcentajes globales
    const alumnos = rows.map(al => {
      const { presentes, retardos, faltas } = al;
      const totalActivas = presentes + retardos + faltas;
      let porcentajeAsistencia = 100.0;
      
      if (totalActivas > 0) {
        porcentajeAsistencia = ((presentes + (retardos * 0.5)) / totalActivas) * 100;
      }

      return {
        ...al,
        porcentaje_asistencia: Math.round(porcentajeAsistencia * 10) / 10
      };
    });

    res.json(alumnos);

  } catch (error) {
    console.error('Error al obtener alumnos en riesgo:', error);
    res.status(500).json({ error: 'Error al obtener alumnos en alerta.' });
  }
};

const sendWhatsappMessage = async (req, res) => {
  const jefeId = req.user.id;
  const { alumnoId, mensaje } = req.body;

  if (!alumnoId || !mensaje) {
    return res.status(400).json({ error: 'Se requiere alumnoId y mensaje.' });
  }

  try {
    const [carreraRows] = await db.query('SELECT id FROM carreras WHERE jefe_id = ?', [jefeId]);
    if (carreraRows.length === 0) {
      return res.status(404).json({ error: 'Carrera no encontrada para este Jefe.' });
    }

    const carreraId = carreraRows[0].id;
    const [alumnoRows] = await db.query(
      `SELECT al.id, al.nombre, al.telefono
       FROM alumnos al
       JOIN grupos g ON al.grupo_id = g.id
       WHERE al.id = ? AND g.carrera_id = ?`,
      [alumnoId, carreraId]
    );

    if (alumnoRows.length === 0) {
      return res.status(404).json({ error: 'Alumno no encontrado dentro de tu carrera.' });
    }

    const alumno = alumnoRows[0];
    if (!alumno.telefono) {
      return res.status(400).json({ error: 'El alumno no tiene número de WhatsApp registrado.' });
    }

    const result = await sendWhatsAppMessage(alumno.telefono, mensaje);
    res.json({ success: true, message: 'Mensaje de WhatsApp enviado.', providerResult: result });
  } catch (error) {
    console.error('Error al enviar WhatsApp:', error);
    res.status(500).json({ error: 'Error al enviar el mensaje de WhatsApp.' });
  }
};

// Obtener lista de alumnos de un grupo específico (acceso del Jefe)
const getAlumnosDelGrupo = async (req, res) => {
  const { grupoId } = req.params;
  const jefeId = req.user.id;

  try {
    const [carreraRows] = await db.query('SELECT id FROM carreras WHERE jefe_id = ?', [jefeId]);
    if (carreraRows.length === 0) {
      return res.status(404).json({ error: 'Carrera no encontrada para este Jefe.' });
    }
    const carreraId = carreraRows[0].id;

    const [grupoCheck] = await db.query(
      'SELECT id FROM grupos WHERE id = ? AND carrera_id = ?',
      [grupoId, carreraId]
    );

    if (grupoCheck.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este grupo o no existe.' });
    }

    const [alumnos] = await db.query(
      `SELECT al.id, al.nombre, al.matricula, al.correo, al.telefono, al.estado
       FROM alumnos al
       WHERE al.grupo_id = ?
       ORDER BY al.nombre ASC`,
      [grupoId]
    );

    res.json(alumnos);
  } catch (error) {
    console.error('Error al obtener alumnos del grupo:', error);
    res.status(500).json({ error: 'Error al obtener alumnos del grupo.' });
  }
};

// Asignar un docente como tutor del grupo
const asignarTutorGrupo = async (req, res) => {
  const { grupoId } = req.params;
  const { docenteId } = req.body;
  const jefeId = req.user.id;

  try {
    // Validar que el jefe existe
    const [carreraRows] = await db.query('SELECT id FROM carreras WHERE jefe_id = ?', [jefeId]);
    if (carreraRows.length === 0) {
      return res.status(404).json({ error: 'Carrera no encontrada para este Jefe.' });
    }
    const carreraId = carreraRows[0].id;

    // Validar que el grupo existe y pertenece a la carrera
    const [grupoCheck] = await db.query(
      'SELECT id FROM grupos WHERE id = ? AND carrera_id = ?',
      [grupoId, carreraId]
    );
    if (grupoCheck.length === 0) {
      return res.status(403).json({ error: 'No tienes permiso para acceder a este grupo o no existe.' });
    }

    // Si docenteId es null, solo desvincular el tutor
    if (!docenteId) {
      await db.query('UPDATE grupos SET tutor_id = NULL WHERE id = ?', [grupoId]);
      return res.json({ success: true, message: 'Tutor desvinculado del grupo.' });
    }

    // Validar que el docente existe
    const [docenteCheck] = await db.query(
      'SELECT id, nombre FROM usuarios WHERE id = ? AND rol = "docente"',
      [docenteId]
    );
    if (docenteCheck.length === 0) {
      return res.status(404).json({ error: 'El docente no existe o no tiene rol de docente.' });
    }

    // Asignar el tutor
    await db.query('UPDATE grupos SET tutor_id = ? WHERE id = ?', [docenteId, grupoId]);
    
    res.json({ 
      success: true, 
      message: `${docenteCheck[0].nombre} asignado como tutor del grupo.`,
      tutorId: docenteId,
      tutorNombre: docenteCheck[0].nombre
    });
  } catch (error) {
    console.error('Error al asignar tutor:', error);
    res.status(500).json({ error: 'Error al asignar tutor al grupo.' });
  }
};

module.exports = {
  getDashboardMetrics,
  getDocentesCarrera,
  getAlumnosRiesgo,
  getAlumnosDelGrupo,
  asignarTutorGrupo,
  sendWhatsappMessage
};

const express = require('express');
const router = express.Router();
const docenteController = require('../controllers/docenteController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Todas las rutas en este archivo requieren token y rol de 'docente'
router.use(verifyToken);
router.use(authorize('docente'));

// Obtener grupos del docente
router.get('/grupos', docenteController.getGruposAsignados);

// Obtener alumnos de un grupo asignado
router.get('/grupo/:asignacionId/alumnos', docenteController.getAlumnosGrupo);

// Obtener asistencia diaria por asignación
router.get('/grupo/:asignacionId/asistencia-diaria', docenteController.getAsistenciaDiaria);

// Descargar lista de asistencia en CSV para la asignación
router.get('/grupo/:asignacionId/asistencia-descarga', docenteController.descargarAsistenciaGrupo);

// Importar alumnos inscritos en la materia desde Excel/CSV
router.post('/grupo/:asignacionId/importar-alumnos', docenteController.importarAlumnosGrupo);

// Registrar asistencia y participación de una clase
router.post('/asistencias', docenteController.registrarAsistenciaClase);

module.exports = router;

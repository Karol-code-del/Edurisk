const express = require('express');
const router = express.Router();
const jefeController = require('../controllers/jefeController');
const { verifyToken, authorize } = require('../middleware/authMiddleware');

// Todas las rutas en este archivo requieren token y rol de 'jefe_carrera'
router.use(verifyToken);
router.use(authorize('jefe_carrera'));

// Obtener métricas resumidas y riesgo por grupo de la carrera
router.get('/dashboard', jefeController.getDashboardMetrics);

// Obtener la plantilla de docentes de la carrera con sus respectivas asignaciones
router.get('/docentes', jefeController.getDocentesCarrera);

// Obtener la lista de alumnos en riesgo crítico/alerta de la carrera
router.get('/alumnos-riesgo', jefeController.getAlumnosRiesgo);

// Obtener alumnos de un grupo específico
router.get('/grupo/:grupoId/alumnos', jefeController.getAlumnosDelGrupo);

// Asignar un docente como tutor de un grupo
router.post('/grupo/:grupoId/asignar-tutor', jefeController.asignarTutorGrupo);

// Enviar mensaje por WhatsApp a un alumno desde el Jefe de Carrera
router.post('/whatsapp', jefeController.sendWhatsappMessage);

module.exports = router;

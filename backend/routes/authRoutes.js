const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');

// Ruta pública: Iniciar sesión
router.post('/login', authController.login);

// Ruta protegida: Obtener información del usuario autenticado
router.get('/me', verifyToken, authController.getMe);

module.exports = router;

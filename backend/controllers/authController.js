const db = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// Iniciar sesión
const login = async (req, res) => {
  const { correo, password } = req.body;

  if (!correo || !password) {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });
  }

  try {
    // Buscar usuario en la BD
    const [rows] = await db.query('SELECT * FROM usuarios WHERE correo = ?', [correo]);
    
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales incorrectas (usuario no encontrado).' });
    }

    const usuario = rows[0];

    // Verificar contraseña encriptada
    const passwordValida = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas.' });
    }

    // Generar token JWT
    const secret = process.env.JWT_SECRET || 'super_secret_jwt_key_alerta_temprana_2026';
    const token = jwt.sign(
      {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      },
      secret,
      { expiresIn: '8h' }
    );

    // Devolver respuesta
    res.json({
      message: 'Inicio de sesión exitoso.',
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        rol: usuario.rol
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error interno del servidor al iniciar sesión.' });
  }
};

// Obtener perfil de usuario logueado
const getMe = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, nombre, correo, rol FROM usuarios WHERE id = ?', [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    res.json(rows[0]);
  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ error: 'Error al obtener los datos del usuario.' });
  }
};

module.exports = {
  login,
  getMe
};

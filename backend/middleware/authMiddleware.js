const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware para verificar token JWT
const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  
  if (!authHeader) {
    return res.status(403).json({ error: 'Acceso denegado. No se proporcionó token.' });
  }

  // Esperar formato: Bearer <TOKEN>
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return res.status(401).json({ error: 'Formato de token inválido (se esperaba Bearer).' });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_jwt_key_alerta_temprana_2026');
    req.user = decoded; // { id, correo, rol, nombre }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

// Middleware para autorizar roles específicos
const authorize = (roles = []) => {
  if (typeof roles === 'string') {
    roles = [roles];
  }

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado.' });
    }

    if (roles.length && !roles.includes(req.user.rol)) {
      return res.status(403).json({ error: `Acceso restringido. Requiere rol: ${roles.join(' o ')}` });
    }

    next();
  };
};

module.exports = {
  verifyToken,
  authorize
};

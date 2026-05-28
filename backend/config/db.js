const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'alerta_temprana_db',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

pool.getConnection()
  .then(connection => {
    console.log('Conexion a la base de datos MySQL establecida correctamente.');
    connection.release();
  })
  .catch(err => {
    console.error('Error al conectar a la base de datos MySQL:', err.message);
    console.error('Revisa las variables DB_HOST, DB_PORT, DB_USER, DB_PASSWORD y DB_NAME.');
  });

module.exports = pool;

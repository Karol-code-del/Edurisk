# 🎓 Plataforma Alerta Temprana - Prevención del Abandono Escolar

Esta plataforma web es un sistema inteligente diseñado para detectar a tiempo los factores de deserción universitaria (particularmente la inasistencia acumulada y la falta de participación) y emitir alertas visuales automatizadas para coordinadores de carrera (Jefes de Carrera) y profesores (Docentes).
# 🎓 Plataforma Alerta Temprana - Prevención del Abandono Escolar

Esta plataforma web es un sistema inteligente diseñado para detectar a tiempo los factores de deserción universitaria (particularmente la inasistencia acumulada y la falta de participación) y emitir alertas visuales automatizadas para coordinadores de carrera (Jefes de Carrera) y profesores (Docentes).

El sistema cuenta con un diseño estético de alta gama en **modo oscuro** con efectos **Glassmorphism**, transiciones y micro-animaciones premium, programado con **Vue.js 3** en el frontend, **Node.js con Express** en el backend y **MySQL** como motor de base de datos.

---

## 🚀 Requisitos Previos

Asegúrate de contar con lo siguiente instalado en tu equipo de desarrollo:
- **Node.js** (Versión 18 o superior recomendada)
- **NPM** (Gestor de paquetes de Node)
- **MySQL Server** (XAMPP, WampServer, Laragon o instalación directa)

---

## 🛠️ Instrucciones de Configuración y Arranque

### Paso 1: Configuración de la Base de Datos (MySQL)

1. Enciende tu servidor local de **MySQL**.
2. Abre tu herramienta favorita de administración de bases de datos (phpMyAdmin, DBeaver, MySQL Workbench, HeidiSQL, etc.).
3. Ejecuta las sentencias contenidas en los siguientes archivos en orden:
   - Primero, ejecuta el esquema: [schema.sql](file:///C:/Users/patyk/.gemini/antigravity/scratch/plataforma-abandono-escolar/backend/database/schema.sql)
   - Segundo, inserta los datos semilla de prueba: [seed.sql](file:///C:/Users/patyk/.gemini/antigravity/scratch/plataforma-abandono-escolar/backend/database/seed.sql)

*Nota: Estos scripts crearán una base de datos llamada `alerta_temprana_db` con las 6 carreras iniciales configuradas, grupos específicos (incluyendo grupos múltiples en Agronomía), docentes con perfiles cruzados y alumnos con historial de asistencia precargado.*

---

### Paso 2: Configuración y Arranque del Backend (Node.js)

1. Abre una terminal y colócate en la carpeta del backend:
   ```bash
   cd C:\Users\patyk\.gemini\antigravity\scratch\plataforma-abandono-escolar\backend
   ```
2. Revisa el archivo de variables de entorno [.env](file:///C:/Users/patyk/.gemini/antigravity/scratch/plataforma-abandono-escolar/backend/.env) y ajusta los valores de `DB_USER` y `DB_PASSWORD` para que coincidan con tu configuración local de MySQL (por defecto usuario `root` y contraseña vacía).
3. Levanta el servidor en modo desarrollo:
   ```bash
   npm run start
   ```
   *Verás el mensaje en consola confirmando que la conexión a MySQL fue exitosa y que el servidor escucha en el puerto `3000`.*

---

### Paso 3: Configuración y Arranque del Frontend (Vue.js)

1. Abre otra ventana de la terminal y navega a la carpeta del frontend:
   ```bash
   cd C:\Users\patyk\.gemini\antigravity\scratch\plataforma-abandono-escolar\frontend
   ```
2. Levanta el servidor de desarrollo de Vite:
   ```bash
   npm run dev
   ```
3. Abre tu navegador en la dirección local que indique la consola (generalmente `http://localhost:5173`).

## 🔐 Variables de Entorno (`.env`)

- Hay un archivo de ejemplo en la raíz: [.env.example](.env.example). Copia ese archivo a `.env` y rellena los valores reales (no subir `.env` al repositorio).
- Variables importantes que debes configurar:
   - `PORT` — puerto donde corre el backend (por ejemplo `3000`).
   - `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` — configuración de MySQL.
   - `JWT_SECRET` — clave secreta para firmar JWT.
   - `WHATSAPP_*` — variables para proveedores de mensajería (Twilio, UltraMsg, Meta, etc.).

## 🚀 Despliegue rápido (Hostinger - guía mínima)

1. En `frontend`: generar la build de producción
```bash
cd frontend
npm install
npm run build
```

2. Opciones de hosting en Hostinger:
   - Si usas Hosting con soporte Node.js: sube la carpeta `backend` y configura el comando de inicio `npm start` en el panel; crea la base de datos MySQL en el panel y llena con `backend/database/schema.sql` y `backend/database/seed.sql`.
   - Si usas hosting estático para el frontend (p.ej. `public_html`): sube `frontend/dist` por separado y configura las llamadas a la API para apuntar al backend desplegado.

3. Si quieres servir el frontend junto al backend (recomendado si sólo tienes una app Node en Hostinger), asegúrate de que `NODE_ENV=production` y que el backend incluya los archivos estáticos (`frontend/dist`).

4. Seguridad y producción:
   - No dejes `CORS` abierto en producción; limita `origin` a tu dominio.
   - Usa HTTPS (Hostinger ofrece certificados Let’s Encrypt).
   - Guarda secretos en las variables de entorno del panel de Hostinger (no en el repo).

Si quieres, puedo generar un `Dockerfile` o un `Procfile` para facilitar el deploy en Hostinger.

## Deploy en Vercel y Railway

Para publicar desde GitHub con frontend en Vercel y backend en Railway, usa la guia nueva en [DEPLOYMENT.md](DEPLOYMENT.md).
---

## 🔑 Cuentas de Acceso de Prueba (Seed)

Para facilitar la demostración de la plataforma, el componente de inicio de sesión incluye **accesos directos táctiles** que rellenan automáticamente las credenciales. Todos los usuarios de la base de datos semilla usan la contraseña: `password123`.

### Jefes de Carrera (Rol: jefe_carrera)
- **Ingeniería en Sistemas Computacionales**: `roberto.sistemas@universidad.edu`
- **Agronomía** (Con múltiples grupos y alertas): `carlos.agro@universidad.edu`
- **Ingeniería en Veterinaria**: `miguel.vet@universidad.edu`

*El panel del Jefe de Carrera muestra indicadores de deserción de su respectiva carrera, un listado de alertas ordenado por criticidad (Riesgo Crítico < 80% de asistencia, Alerta Temprana < 85%), un resumen visual de riesgos demográficos por semestre y la plantilla de docentes bajo su supervisión.*

### Docentes (Rol: docente)
- **Ing. Ana Martínez** (Sistemas y Ciberseguridad): `ana.martinez@universidad.edu`
- **Dr. Jorge Valdés** (Agronomía y Veterinaria): `jorge.valdes@universidad.edu`

*El panel del docente le muestra los grupos asignados a través de tarjetas dinámicas en el periodo escolar correspondiente. Al seleccionar un grupo, ingresará al pase de lista interactivo donde puede asentar asistencia del día (Presente, Falta, Retardo, Justificada) e incrementar puntos de participación en tiempo real.*

---

## 🔬 Lógica de Clasificación de Riesgo de Abandono Escolar

Cada vez que un docente guarda la asistencia diaria, el backend calcula automáticamente el porcentaje acumulado del estudiante:

$$\text{Tasa de Asistencia} = \left( \frac{\text{Asistencias Presente} + 0.5 \times \text{Retardos}}{\text{Total Sesiones Activas}} \right) \times 100$$

- Si el estudiante registra un promedio general **menor a 80.0%**, su estado se actualiza automáticamente a **Riesgo Crítico** (color coral/rojo), notificándose de inmediato al Jefe de Carrera en su panel.
- Si el estudiante registra un promedio **entre 80.0% y 84.9%**, se actualiza a **Alerta Temprana** (color naranja/ámbar) para una intervención preventiva.
- Si se mantiene sobre **85%**, está en estado **Seguro** (color verde esmeralda).

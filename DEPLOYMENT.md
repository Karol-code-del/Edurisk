# Deploy en Vercel y Railway

Este repositorio contiene dos aplicaciones:

- `frontend`: Vue 3 + Vite, pensado para Vercel.
- `backend`: Node.js + Express + MySQL, pensado para Railway.

## 1. Subir a GitHub

Desde la raiz del proyecto:

```bash
git init
git add .
git commit -m "Preparar deploy en Vercel y Railway"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

No subas archivos `.env`, `node_modules` ni `dist`; ya estan ignorados por `.gitignore`.

## 2. Backend en Railway

1. Crea un nuevo proyecto en Railway desde el repositorio de GitHub.
2. En la configuracion del servicio, usa como root directory:

```text
backend
```

3. Agrega las variables de entorno:

```text
NODE_ENV=production
PORT=3000
DB_HOST=...
DB_PORT=3306
DB_USER=...
DB_PASSWORD=...
DB_NAME=...
JWT_SECRET=...
FRONTEND_URL=https://tu-frontend.vercel.app
```

4. Si usas MySQL en Railway, crea el servicio de MySQL y copia sus variables al backend.
5. Ejecuta el SQL de `backend/database/schema.sql` y, si quieres datos iniciales, `backend/database/seed.sql`.

El backend expone un endpoint de salud en:

```text
/api/status
```

## 3. Frontend en Vercel

1. Crea un nuevo proyecto en Vercel desde el mismo repositorio de GitHub.
2. En la configuracion del proyecto, usa como root directory:

```text
frontend
```

3. Vercel detectara Vite. Si necesitas configurarlo manualmente:

```text
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

4. Agrega esta variable de entorno con la URL publica del backend en Railway:

```text
VITE_API_BASE_URL=https://tu-backend.up.railway.app/api
```

5. Haz redeploy del frontend despues de cambiar `VITE_API_BASE_URL`, porque Vite la inyecta durante el build.

## 4. Flujo recomendado

1. Despliega primero Railway.
2. Copia la URL publica del backend.
3. Configura `VITE_API_BASE_URL` en Vercel.
4. Despliega Vercel.
5. Copia la URL de Vercel en `FRONTEND_URL` de Railway.
6. Redeploy del backend para aplicar CORS.

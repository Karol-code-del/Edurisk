import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import JefeDashboard from '../views/JefeDashboard.vue';
import DocenteDashboard from '../views/DocenteDashboard.vue';
import GrupoClaseView from '../views/GrupoClaseView.vue';

const routes = [
  {
    path: '/login',
    name: 'login',
    component: LoginView,
    meta: { public: true }
  },
  {
    path: '/jefe',
    name: 'jefe-dashboard',
    component: JefeDashboard,
    meta: { role: 'jefe_carrera' }
  },
  {
    path: '/docente',
    name: 'docente-dashboard',
    component: DocenteDashboard,
    meta: { role: 'docente' }
  },
  {
    path: '/docente/grupo/:asignacionId',
    name: 'grupo-clase',
    component: GrupoClaseView,
    meta: { role: 'docente' }
  },
  {
    path: '/',
    redirect: () => {
      const auth = useAuthStore();
      if (!auth.isAuthenticated) return { name: 'login' };
      return auth.userRole === 'jefe_carrera' 
        ? { name: 'jefe-dashboard' } 
        : { name: 'docente-dashboard' };
    }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Guardián de Navegación Global (Proteger rutas por Rol y Autenticación)
router.beforeEach(async (to, from, next) => {
  const auth = useAuthStore();

  // Si tiene token y no hay usuario cargado en memoria, intentar restaurar sesión
  if (auth.token && !auth.user) {
    await auth.checkAuth();
  }

  const isAuth = auth.isAuthenticated;
  const isPublic = to.meta.public;
  const requiredRole = to.meta.role;

  if (!isAuth && !isPublic) {
    // Si no está autenticado y la ruta es privada, redirigir al login
    return next({ name: 'login' });
  }

  if (isAuth && isPublic) {
    // Si ya está autenticado e intenta ir al login, redirigir a su correspondiente dashboard
    return next(auth.userRole === 'jefe_carrera' ? '/jefe' : '/docente');
  }

  if (isAuth && requiredRole && auth.userRole !== requiredRole) {
    // Si está autenticado pero intenta entrar a un área sin el rol adecuado, denegar
    return next(auth.userRole === 'jefe_carrera' ? '/jefe' : '/docente');
  }

  next();
});

export default router;

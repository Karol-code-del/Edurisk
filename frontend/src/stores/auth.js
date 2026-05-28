import { defineStore } from 'pinia';
import { API_BASE_URL } from '../config';


export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(localStorage.getItem('user')) || null,
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
  }),

  getters: {
    isAuthenticated: (state) => !!state.token,
    userRole: (state) => state.user?.rol || null,
  },

  actions: {
    // Iniciar sesión
    async login(correo, password) {
      this.loading = true;
      this.error = null;
      try {
        const response = await fetch(`${API_BASE_URL}/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ correo, password }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Error al iniciar sesión.');
        }

        this.token = data.token;
        this.user = data.usuario;
        
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.usuario));
        
        return data.usuario;
      } catch (err) {
        this.error = err.message;
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Cerrar sesión
    logout() {
      this.token = null;
      this.user = null;
      this.error = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },

    // Verificar si el token guardado sigue siendo válido
    async checkAuth() {
      if (!this.token) return false;

      try {
        const response = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${this.token}`,
          },
        });

        if (!response.ok) {
          this.logout();
          return false;
        }

        const userData = await response.json();
        this.user = userData;
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      } catch (err) {
        console.error('Error al restaurar sesión:', err);
        this.logout();
        return false;
      }
    }
  },
});

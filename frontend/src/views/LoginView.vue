<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const router = useRouter();
const authStore = useAuthStore();

const correo = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

const handleLogin = async () => {
  if (!correo.value || !password.value) {
    error.value = 'Por favor completa todos los campos.';
    return;
  }

  error.value = '';
  loading.value = true;

  try {
    const user = await authStore.login(correo.value, password.value);
    if (user.rol === 'jefe_carrera') {
      router.push('/jefe');
    } else {
      router.push('/docente');
    }
  } catch (err) {
    error.value = err.message || 'Error al conectar con el servidor.';
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="login-wrapper">
    <div class="login-container glass-card">
      <div class="login-header">
        <div class="logo-icon">ER</div>
        <h2>EduRisk IA</h2>
        <p>Plataforma para la Prevencion del Abandono Escolar</p>
      </div>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label class="form-label" for="email">Correo Institucional</label>
          <input
            id="email"
            v-model="correo"
            type="email"
            class="input-glass"
            placeholder="correo@universidad.edu"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label class="form-label" for="pass">Contrasena</label>
          <input
            id="pass"
            v-model="password"
            type="password"
            class="input-glass"
            placeholder="********"
            required
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="error-banner">
          {{ error }}
        </div>

        <button type="submit" class="btn btn-primary btn-block glow-active" :disabled="loading">
          {{ loading ? 'Iniciando sesion...' : 'Ingresar a la Plataforma' }}
        </button>
      </form>
    </div>
  </div>
</template>

<style scoped>
.login-wrapper {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  padding: 1.5rem;
}

.login-container {
  max-width: 480px;
  width: 100%;
  padding: 2.5rem;
  border-radius: var(--radius-lg);
}

.login-header {
  text-align: center;
  margin-bottom: 2rem;
}

.login-header .logo-icon {
  width: 54px;
  height: 54px;
  margin: 0 auto 1rem;
}

.login-header h2 {
  font-size: 1.8rem;
  margin-bottom: 0.5rem;
}

.login-header p {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.btn-block {
  width: 100%;
  padding: 0.9rem;
  font-size: 1rem;
  margin-top: 1rem;
}

.error-banner {
  background: rgba(255, 71, 87, 0.15);
  color: var(--color-danger);
  border: 1px solid rgba(255, 71, 87, 0.3);
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  font-size: 0.85rem;
  margin-bottom: 1rem;
  font-weight: 600;
}

@media (max-width: 480px) {
  .login-container {
    padding: 1.5rem;
  }
}
</style>

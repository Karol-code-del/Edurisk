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

// Accesos directos para demostración de pruebas
const cargarDemo = (rol, email) => {
  correo.value = email;
  password.value = 'password123';
};
</script>

<template>
  <div class="login-wrapper">
    <div class="login-container glass-card">
      <div class="login-header">
        <div class="logo-icon">🎓</div>
        <h2>EduRisk IA</h2>
        <p>Plataforma para la Prevención del Abandono Escolar</p>
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
          <label class="form-label" for="pass">Contraseña</label>
          <input
            id="pass"
            v-model="password"
            type="password"
            class="input-glass"
            placeholder="••••••••"
            required
            :disabled="loading"
          />
        </div>

        <div v-if="error" class="error-banner">
          ⚠️ {{ error }}
        </div>

        <button type="submit" class="btn btn-primary btn-block glow-active" :disabled="loading">
          {{ loading ? 'Iniciando Sesión...' : 'Ingresar a la Plataforma' }}
        </button>
      </form>

      <div class="demo-shortcuts">
        <h3>⚡ Accesos Rápidos de Prueba (Contraseña: password123)</h3>
        <div class="shortcut-section">
          <h4>Jefes de Carrera:</h4>
          <div class="shortcuts-grid">
            <button @click="cargarDemo('jefe', 'roberto.sistemas@universidad.edu')" class="btn-demo">
              💻 ISC (Roberto)
            </button>
            <button @click="cargarDemo('jefe', 'carlos.agro@universidad.edu')" class="btn-demo">
              🌾 Agronomía (Carlos)
            </button>
            <button @click="cargarDemo('jefe', 'miguel.vet@universidad.edu')" class="btn-demo">
              🐶 Veterinaria (Miguel)
            </button>
          </div>
        </div>
        <div class="shortcut-section">
          <h4>Docentes (Multicarrera):</h4>
          <div class="shortcuts-grid">
            <button @click="cargarDemo('docente', 'ana.martinez@universidad.edu')" class="btn-demo">
              👩‍🏫 Ana (Sistemas y Ciber)
            </button>
            <button @click="cargarDemo('docente', 'jorge.valdes@universidad.edu')" class="btn-demo">
              👨‍🏫 Jorge (Agronomía y Vet)
            </button>
          </div>
        </div>
      </div>
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
  font-size: 1.75rem;
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

.login-form {
  margin-bottom: 2rem;
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

/* Shortcuts de Demo */
.demo-shortcuts {
  border-top: 1px solid var(--border-color);
  padding-top: 1.5rem;
}

.demo-shortcuts h3 {
  font-size: 0.9rem;
  color: var(--primary);
  margin-bottom: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.shortcut-section {
  margin-bottom: 1rem;
}

.shortcut-section h4 {
  font-size: 0.8rem;
  color: #94a3b8;
  margin-bottom: 0.5rem;
}

.shortcuts-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.btn-demo {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: #cbd5e1;
  padding: 0.5rem;
  font-size: 0.75rem;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;
  font-family: var(--font-family);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.btn-demo:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: var(--primary);
  color: #fff;
}

@media (max-width: 480px) {
  .login-container {
    padding: 1.5rem;
  }
  .shortcuts-grid {
    grid-template-columns: 1fr;
  }
}
</style>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { API_BASE_URL } from '../config';

const router = useRouter();
const authStore = useAuthStore();

const grupos = ref([]);
const loading = ref(true);
const error = ref('');

// Cargar asignaciones del docente
const cargarGrupos = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/docente/grupos`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });

    if (!response.ok) {
      throw new Error('No se pudo cargar la lista de grupos.');
    }

    const data = await response.json();
    grupos.value = data;
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const irAGrupo = (asignacionId) => {
  router.push(`/docente/grupo/${asignacionId}`);
};

onMounted(cargarGrupos);
</script>

<template>
  <div class="app-container">
    <!-- Header Premium -->
    <header class="nav-header">
      <div class="nav-brand">
        <div class="logo-icon">🎓</div>
        <span class="logo-text">EduRisk AI</span>
      </div>
      <div class="nav-profile">
        <div class="user-info">
          <p class="user-name">{{ authStore.user?.nombre }}</p>
          <span class="user-role">Docente</span>
        </div>
        <button @click="handleLogout" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
          Cerrar Sesión
        </button>
      </div>
    </header>

    <!-- Contenido Principal -->
    <main class="main-content">
      <div class="dashboard-intro">
        <h1>Panel del Docente</h1>
        <p class="subtitle">Gestiona tus clases, registra asistencias y monitorea la participación en tiempo real.</p>
      </div>

      <!-- Tarjetas de Estadísticas Simples -->
      <div class="stats-grid">
        <div class="glass-card stat-card primary">
          <div class="stat-icon">📚</div>
          <div class="stat-info">
            <span class="stat-label">Grupos Asignados</span>
            <span class="stat-value">{{ grupos.length }}</span>
          </div>
        </div>
        <div class="glass-card stat-card safe">
          <div class="stat-icon">⏱️</div>
          <div class="stat-info">
            <span class="stat-label">Periodo Activo</span>
            <span class="stat-value">2026-1</span>
          </div>
        </div>
      </div>

      <!-- Sección de Grupos -->
      <h2 class="section-title">Asignaturas y Grupos Asignados</h2>
      
      <div v-if="loading" class="state-container">
        <div class="loader"></div>
        <p>Cargando grupos asignados...</p>
      </div>

      <div v-else-if="error" class="state-container error">
        <p>⚠️ Error: {{ error }}</p>
      </div>

      <div v-else-if="grupos.length === 0" class="state-container empty">
        <p>📭 No tienes asignaturas o grupos asignados para el periodo escolar actual.</p>
      </div>

      <div v-else class="grupos-grid">
        <div 
          v-for="grupo in grupos" 
          :key="grupo.asignacion_id" 
          class="glass-card grupo-card"
          @click="irAGrupo(grupo.asignacion_id)"
        >
          <div class="grupo-card-header">
            <span class="badge badge-safe">{{ grupo.semestre }} Semestre</span>
            <span class="carrera-tag">{{ grupo.carrera_nombre }}</span>
          </div>
          
          <h3 class="materia-title">{{ grupo.materia }}</h3>
          
          <div class="grupo-card-body">
            <div class="detail-item">
              <span class="label">Grupo:</span>
              <span class="val">{{ grupo.grupo_nombre }}</span>
            </div>
            <div class="detail-item">
              <span class="label">Ciclo:</span>
              <span class="val">{{ grupo.periodo }}</span>
            </div>
          </div>

          <div class="grupo-card-footer">
            <button class="btn btn-primary btn-full-width">
              Iniciar Clase y Pase de Lista ⚡
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.dashboard-intro {
  margin-bottom: 2.5rem;
}

.subtitle {
  color: var(--color-muted);
  font-size: 1.05rem;
  margin-top: 0.5rem;
}

.section-title {
  font-size: 1.4rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

/* Grilla de Grupos */
.grupos-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.grupo-card {
  padding: 1.5rem;
  cursor: pointer;
  display: flex;
  flex-direction: column;
}

.grupo-card:hover {
  border-color: var(--primary);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.15);
}

.grupo-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.carrera-tag {
  font-size: 0.75rem;
  color: #94a3b8;
  font-weight: 600;
  max-width: 60%;
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}

.materia-title {
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 1rem;
  height: 48px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  color: #fff;
}

.grupo-card-body {
  background: rgba(15, 23, 42, 0.4);
  border-radius: var(--radius-sm);
  padding: 0.75rem;
  margin-bottom: 1.5rem;
  flex-grow: 1;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  margin-bottom: 0.25rem;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-item .label {
  color: #94a3b8;
}

.detail-item .val {
  font-weight: 700;
}

.btn-full-width {
  width: 100%;
}

/* Loaders y Estados Vacíos */
.state-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: var(--bg-card);
  border-radius: var(--radius-md);
  border: 1px solid var(--border-color);
  color: var(--color-muted);
}

.loader {
  border: 3px solid rgba(255,255,255,.05);
  border-top: 3px solid var(--primary);
  border-radius: 50%;
  width: 36px;
  height: 36px;
  animation: spin 1s linear infinite;
  margin-bottom: 1rem;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

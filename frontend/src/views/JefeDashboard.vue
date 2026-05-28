<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { API_BASE_URL } from '../config';

const router = useRouter();
const authStore = useAuthStore();

const activeTab = ref('alertas'); // 'alertas', 'docentes', 'grupos'
const carreraId = ref(null);
const carreraNombre = ref('');
const resumen = ref({ total_alumnos: 0, alumnos_criticos: 0, alumnos_riesgo: 0, alumnos_activos: 0 });
const grupos = ref([]);
const docentes = ref([]);
const alumnosRiesgo = ref([]);

const loading = ref(true);
const error = ref('');

const sendingAlumnoId = ref(null);
const feedbackMessage = ref('');
const expandedGrupos = ref(new Set());
const alumnosPorGrupo = ref({});
const loadingAlumnosGrupo = ref(null);
const gruposTutorInfo = ref({});
const selectedTutorGrupo = ref({});
const assigningTutorGrupoId = ref(null);

const limpiarTelefono = (telefono) => {
  if (!telefono) return '';

  const digits = String(telefono).replace(/\D/g, '');
  if (!digits) return '';

  return `+${digits}`;
};

const puedeContactarWhatsapp = (alumno) => {
  return Boolean(limpiarTelefono(alumno.telefono));
};

const getDefaultWhatsappMessage = (alumno) => {
  return `Hola ${alumno.nombre}, te escribo desde la plataforma Alerta Temprana para hacer seguimiento académico.`;
};

const showFeedback = (mensaje) => {
  feedbackMessage.value = mensaje;
  setTimeout(() => {
    if (feedbackMessage.value === mensaje) {
      feedbackMessage.value = '';
    }
  }, 4500);
};

const enviarWhatsappAlumno = async (alumno) => {
  if (!puedeContactarWhatsapp(alumno)) {
    showFeedback('El alumno no tiene número de WhatsApp registrado.');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authStore.token}`
  };

  sendingAlumnoId.value = alumno.id;

  try {
    const response = await fetch(`${API_BASE_URL}/jefe/whatsapp`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        alumnoId: alumno.id,
        mensaje: getDefaultWhatsappMessage(alumno)
      })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'No se pudo enviar el mensaje por WhatsApp.');
    }

    showFeedback('Mensaje enviado por WhatsApp al alumno.');
  } catch (err) {
    showFeedback(err.message);
  } finally {
    sendingAlumnoId.value = null;
  }
};

const getContactoTexto = (alumno) => {
  return puedeContactarWhatsapp(alumno) ? '📲 WhatsApp' : '🚫 Sin WhatsApp';
};

const toggleGrupoExpanded = async (grupoId) => {
  if (expandedGrupos.value.has(grupoId)) {
    expandedGrupos.value.delete(grupoId);
    return;
  }

  if (alumnosPorGrupo.value[grupoId]) {
    expandedGrupos.value.add(grupoId);
    return;
  }

  loadingAlumnosGrupo.value = grupoId;
  error.value = '';

  try {
    const headers = { 'Authorization': `Bearer ${authStore.token}` };
    const response = await fetch(`${API_BASE_URL}/jefe/grupo/${grupoId}/alumnos`, { headers });
    if (!response.ok) throw new Error('No se pudo cargar los alumnos del grupo.');
    
    const alumnos = await response.json();
    alumnosPorGrupo.value[grupoId] = alumnos;
    expandedGrupos.value.add(grupoId);
  } catch (err) {
    error.value = err.message;
  } finally {
    loadingAlumnosGrupo.value = null;
  }
};

const asignarTutorAlGrupo = async (grupoId) => {
  const docenteId = selectedTutorGrupo.value[grupoId];
  if (!docenteId) {
    error.value = 'Por favor selecciona un docente para asignar como tutor.';
    setTimeout(() => { error.value = ''; }, 3000);
    return;
  }

  assigningTutorGrupoId.value = grupoId;
  error.value = '';

  try {
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authStore.token}`
    };

    const response = await fetch(`${API_BASE_URL}/jefe/grupo/${grupoId}/asignar-tutor`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ docenteId })
    });

    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'No se pudo asignar el tutor.');

    gruposTutorInfo.value[grupoId] = {
      tutor_id: docenteId,
      tutor_nombre: result.tutorNombre
    };

    showFeedback(result.message);
  } catch (err) {
    error.value = err.message;
  } finally {
    assigningTutorGrupoId.value = null;
  }
};

const cargarDatosJefe = async () => {
  loading.value = true;
  error.value = '';
  try {
    const headers = { 'Authorization': `Bearer ${authStore.token}` };

    // 1. Cargar Dashboard Resumen e Info de Carrera
    const resDash = await fetch(`${API_BASE_URL}/jefe/dashboard`, { headers });
    if (!resDash.ok) throw new Error('Error al cargar métricas de la carrera.');
    const dataDash = await resDash.json();
    carreraId.value = dataDash.carreraId;
    carreraNombre.value = dataDash.carreraNombre;
    resumen.value = dataDash.resumen;
    grupos.value = dataDash.grupos;

    // 2. Cargar Docentes
    const resDoc = await fetch(`${API_BASE_URL}/jefe/docentes`, { headers });
    if (!resDoc.ok) throw new Error('Error al cargar plantilla de docentes.');
    docentes.value = await resDoc.json();

    // 3. Cargar Alumnos en Riesgo
    const resRiesgo = await fetch(`${API_BASE_URL}/jefe/alumnos-riesgo`, { headers });
    if (!resRiesgo.ok) throw new Error('Error al cargar alumnos en riesgo.');
    alumnosRiesgo.value = await resRiesgo.json();

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

// Helper CSS
const getRiesgoClass = (estado) => {
  if (estado === 'critico') return 'danger';
  if (estado === 'riesgo') return 'warning';
  return 'safe';
};

const getRiesgoText = (estado) => {
  if (estado === 'critico') return 'Riesgo Crítico';
  if (estado === 'riesgo') return 'Alerta Temprana';
  return 'Seguro / Activo';
};

onMounted(cargarDatosJefe);
</script>

<template>
  <div class="app-container">
    <!-- Header -->
    <header class="nav-header">
      <div class="nav-brand">
        <div class="logo-icon">🎓</div>
        <span class="logo-text">EduRisk AI</span>
      </div>
      <div class="nav-profile">
        <div class="user-info">
          <p class="user-name">{{ authStore.user?.nombre }}</p>
          <span class="user-role">Jefe de Carrera</span>
        </div>
        <button @click="handleLogout" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
          Cerrar Sesión
        </button>
      </div>
    </header>

    <main class="main-content">
      <div class="dashboard-intro">
        <span class="carrera-header-badge">{{ carreraNombre }}</span>
        <h1>Panel de Coordinación Académica</h1>
        <p class="subtitle">Monitorea los índices de permanencia escolar y toma decisiones estratégicas con tus docentes.</p>
      </div>

      <div v-if="error" class="error-banner">
        ⚠️ Error: {{ error }}
      </div>

      <div v-if="feedbackMessage" class="success-banner">
        ✅ {{ feedbackMessage }}
      </div>

      <div v-if="loading" class="state-container">
        <div class="loader"></div>
        <p>Cargando panel de control de carrera...</p>
      </div>

      <div v-else>
        <!-- Tarjetas de Estadísticas de Riesgo -->
        <div class="stats-grid">
          <div class="glass-card stat-card primary">
            <div class="stat-icon">👨‍🎓</div>
            <div class="stat-info">
              <span class="stat-label">Alumnos Totales</span>
              <span class="stat-value">{{ resumen.total_alumnos }}</span>
            </div>
          </div>
          <div class="glass-card stat-card danger">
            <div class="stat-icon">🚨</div>
            <div class="stat-info">
              <span class="stat-label">Riesgo Crítico</span>
              <span class="stat-value">{{ resumen.alumnos_criticos }}</span>
            </div>
          </div>
          <div class="glass-card stat-card warning">
            <div class="stat-icon">⚠️</div>
            <div class="stat-info">
              <span class="stat-label">Alerta Temprana</span>
              <span class="stat-value">{{ resumen.alumnos_riesgo }}</span>
            </div>
          </div>
          <div class="glass-card stat-card safe">
            <div class="stat-icon">❇️</div>
            <div class="stat-info">
              <span class="stat-label">Alumnos Seguros</span>
              <span class="stat-value">{{ resumen.alumnos_activos }}</span>
            </div>
          </div>
        </div>

        <!-- Menú de Pestañas (Tabs) -->
        <div class="tabs-navigation">
          <button 
            @click="activeTab = 'alertas'" 
            class="tab-btn" 
            :class="{ active: activeTab === 'alertas' }"
          >
            📢 Alertas Tempranas ({{ alumnosRiesgo.length }})
          </button>
          <button 
            @click="activeTab = 'docentes'" 
            class="tab-btn" 
            :class="{ active: activeTab === 'docentes' }"
          >
            👥 Plantilla de Docentes ({{ docentes.length }})
          </button>
          <button 
            @click="activeTab = 'grupos'" 
            class="tab-btn" 
            :class="{ active: activeTab === 'grupos' }"
          >
            📊 Semestres y Grupos ({{ grupos.length }})
          </button>
        </div>

        <!-- PESTAÑA 1: ALERTAS TEMPRANAS DE DESERCIÓN -->
        <div v-if="activeTab === 'alertas'" class="tab-panel">
          <div class="glass-card panel-card">
            <div class="panel-header">
              <h2>Alumnos en Situación de Riesgo</h2>
              <p>Estudiantes cuya tasa acumulada de asistencia está por debajo del 85%. Requieren seguimiento inmediato.</p>
            </div>

            <div v-if="alumnosRiesgo.length === 0" class="empty-tab-state">
              🎉 ¡Felicidades! No se reportan estudiantes en situación de riesgo en esta carrera.
            </div>

            <div v-else class="table-container">
              <table class="custom-table">
                <thead>
                  <tr>
                    <th>Estudiante</th>
                    <th>Grupo / Semestre</th>
                    <th>Asistencia Global</th>
                    <th>Participación</th>
                    <th>Estado de Alerta</th>
                    <th>Acción Correctiva</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="al in alumnosRiesgo" :key="al.id">
                    <td>
                      <div class="student-profile">
                        <p class="name">{{ al.nombre }}</p>
                        <span class="sub text-muted">Matrícula: {{ al.matricula }} | {{ al.correo }}</span>
                      </div>
                    </td>
                    <td>
                      <span class="group-pill">{{ al.semestre }} Sem. - Grupo {{ al.grupo_nombre }}</span>
                    </td>
                    <td>
                      <div class="attendance-trend">
                        <span class="trend-pct" :class="getRiesgoClass(al.estado)">
                          {{ al.porcentaje_asistencia }}%
                        </span>
                        <div class="progress-container" style="width: 140px;">
                          <div 
                            class="progress-bar" 
                            :class="getRiesgoClass(al.estado)"
                            :style="{ width: `${al.porcentaje_asistencia}%` }"
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span class="badge badge-safe" style="background: rgba(255,255,255,0.05); color: #fff;">
                        ⭐ {{ al.total_participaciones }} Pts
                      </span>
                    </td>
                    <td>
                      <span class="badge" :class="'badge-' + getRiesgoClass(al.estado)">
                        {{ getRiesgoText(al.estado) }}
                      </span>
                    </td>
                    <td>
                      <button
                        class="btn btn-primary"
                        style="padding: 0.35rem 0.75rem; font-size: 0.8rem;"
                        :disabled="!puedeContactarWhatsapp(al) || sendingAlumnoId === al.id"
                        @click="enviarWhatsappAlumno(al)"
                      >
                        <span v-if="sendingAlumnoId === al.id">Enviando...</span>
                        <span v-else>{{ getContactoTexto(al) }} Contactar Alumno</span>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- PESTAÑA 2: PLANTILLA DE DOCENTES -->
        <div v-if="activeTab === 'docentes'" class="tab-panel">
          <div class="glass-card panel-card">
            <div class="panel-header">
              <h2>Docentes Encargados de Grupos</h2>
              <p>Relación de docentes que imparten cátedra en los grupos asignados a esta carrera profesional.</p>
            </div>

            <div class="teachers-grid">
              <div v-for="doc in docentes" :key="doc.id" class="teacher-card glass-card">
                <div class="teacher-header">
                  <div class="avatar-logo">👨‍🏫</div>
                  <div>
                    <h3 class="teacher-title">{{ doc.nombre }}</h3>
                    <p class="teacher-email">{{ doc.correo }}</p>
                  </div>
                </div>

                <div class="assigned-courses">
                  <h4>Grupos y Materias a Cargo:</h4>
                  <ul>
                    <li v-for="asig in doc.asignaciones" :key="asig.id">
                      <span class="group-indicator">{{ asig.semestre }} "{{ asig.grupo }}"</span>
                      <span class="materia-name">{{ asig.materia }}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- PESTAÑA 3: RIESGO POR SEMESTRE -->
        <div v-if="activeTab === 'grupos'" class="tab-panel">
          <div class="glass-card panel-card">
            <div class="panel-header">
              <h2>Índices de Riesgo por Grupo y Semestre</h2>
              <p>Desglose demográfico para identificar qué semestres o grupos específicos registran mayor vulnerabilidad escolar.</p>
            </div>

            <div class="groups-analytics-grid">
              <div v-for="g in grupos" :key="g.id" class="group-stat-row glass-card" :class="{ expanded: expandedGrupos.has(g.id) }">
                <div class="group-header-row">
                  <div class="group-main-info">
                    <button
                      @click="toggleGrupoExpanded(g.id)"
                      class="group-expand-btn"
                      :class="{ expanded: expandedGrupos.has(g.id) }"
                    >
                      {{ expandedGrupos.has(g.id) ? '▼' : '▶' }}
                    </button>
                    <span class="group-bold">{{ g.semestre }} "{{ g.grupo_nombre }}"</span>
                    <span class="group-size">Población: {{ g.total_alumnos }} alumnos</span>
                  </div>
                  
                  <div class="group-risk-bars">
                    <!-- Barra de Alumnos en Riesgo Crítico -->
                    <div class="bar-wrapper">
                      <span class="bar-label">Críticos ({{ g.criticos }}):</span>
                      <div class="risk-bar-container">
                        <div 
                          class="risk-bar danger" 
                          :style="{ width: g.total_alumnos > 0 ? `${(g.criticos / g.total_alumnos) * 100}%` : '0%' }"
                        ></div>
                      </div>
                    </div>

                    <!-- Barra de Alumnos en Alerta -->
                    <div class="bar-wrapper">
                      <span class="bar-label">Alerta ({{ g.en_riesgo }}):</span>
                      <div class="risk-bar-container">
                        <div 
                          class="risk-bar warning" 
                          :style="{ width: g.total_alumnos > 0 ? `${(g.en_riesgo / g.total_alumnos) * 100}%` : '0%' }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Lista de alumnos del grupo expandida -->
                <div v-if="expandedGrupos.has(g.id)" class="group-students-list">
                  <!-- Sección de Asignación de Tutor -->
                  <div class="tutor-assignment-section">
                    <div class="tutor-header">
                      <h3>👨‍🏫 Asignar Tutor del Grupo</h3>
                      <p v-if="gruposTutorInfo[g.id]?.tutor_nombre" class="current-tutor">
                        Tutor actual: <strong>{{ gruposTutorInfo[g.id].tutor_nombre }}</strong>
                      </p>
                      <p v-else class="no-tutor">Sin tutor asignado</p>
                    </div>
                    <div class="tutor-selector-row">
                      <select
                        v-model="selectedTutorGrupo[g.id]"
                        class="tutor-select"
                        :disabled="assigningTutorGrupoId === g.id"
                      >
                        <option value="">-- Selecciona un docente --</option>
                        <option v-for="doc in docentes" :key="doc.id" :value="doc.id">
                          {{ doc.nombre }}
                        </option>
                      </select>
                      <button
                        class="btn btn-primary tutor-assign-btn"
                        @click="asignarTutorAlGrupo(g.id)"
                        :disabled="!selectedTutorGrupo[g.id] || assigningTutorGrupoId === g.id"
                      >
                        <span v-if="assigningTutorGrupoId === g.id">⏳ Asignando...</span>
                        <span v-else>✓ Asignar Tutor</span>
                      </button>
                    </div>
                  </div>

                  <!-- Tabla de Alumnos -->
                  <div class="students-section">
                    <h3 style="margin-top: 1.5rem; margin-bottom: 1rem; color: #fff;">📋 Alumnos del Grupo</h3>
                  </div>

                  <div v-if="loadingAlumnosGrupo === g.id" class="loading-students">
                    <span>Cargando alumnos...</span>
                  </div>
                  <div v-else-if="alumnosPorGrupo[g.id] && alumnosPorGrupo[g.id].length > 0" class="students-table-wrapper">
                    <table class="students-table">
                      <thead>
                        <tr>
                          <th>Nombre</th>
                          <th>Matrícula</th>
                          <th>Estado</th>
                          <th>Contacto</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="al in alumnosPorGrupo[g.id]" :key="al.id">
                          <td>{{ al.nombre }}</td>
                          <td><span class="matricula-tag">{{ al.matricula }}</span></td>
                          <td>
                            <span class="badge" :class="'badge-' + getRiesgoClass(al.estado)">
                              {{ getRiesgoText(al.estado) }}
                            </span>
                          </td>
                          <td>
                            <button
                              class="btn btn-primary btn-sm"
                              :disabled="!puedeContactarWhatsapp(al) || sendingAlumnoId === al.id"
                              @click="enviarWhatsappAlumno(al)"
                            >
                              {{ sendingAlumnoId === al.id ? 'Enviando...' : getContactoTexto(al) }}
                            </button>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div v-else class="empty-students">
                    No hay alumnos en este grupo.
                  </div>
                </div>
              </div>
            </div>
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

.carrera-header-badge {
  font-size: 0.8rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--primary);
  background: var(--primary-glow);
  padding: 0.35rem 0.8rem;
  border-radius: 50px;
  border: 1px solid rgba(0, 212, 255, 0.25);
  display: inline-block;
  margin-bottom: 0.5rem;
}

.subtitle {
  color: var(--color-muted);
  font-size: 1.05rem;
}

/* Éxito y Error */
.error-banner {
  background: rgba(255, 71, 87, 0.15);
  color: var(--color-danger);
  border: 1px solid rgba(255, 71, 87, 0.3);
  padding: 1rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  margin-bottom: 1.5rem;
}

/* Tabs */
.tabs-navigation {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 1px;
}

.tab-btn {
  background: none;
  border: none;
  color: var(--color-muted);
  font-family: var(--font-family);
  font-size: 1rem;
  font-weight: 700;
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
}

.tab-btn:hover {
  color: #fff;
}

.tab-btn.active {
  color: var(--primary);
}

.tab-btn.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--primary);
  border-radius: 50px;
  box-shadow: 0 0 10px var(--primary);
}

/* Paneles de Tab */
.panel-card {
  padding: 2rem;
}

.panel-header {
  margin-bottom: 2rem;
}

.panel-header h2 {
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 0.25rem;
}

.panel-header p {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.empty-tab-state {
  text-align: center;
  padding: 4rem 2rem;
  font-size: 1.1rem;
  color: var(--color-safe);
  background: rgba(46, 213, 115, 0.05);
  border: 1px dashed rgba(46, 213, 115, 0.2);
  border-radius: var(--radius-md);
}

.student-profile .name {
  font-weight: 700;
  color: #fff;
}

.student-profile .sub {
  font-size: 0.8rem;
}

.text-muted {
  color: var(--color-muted);
}

.group-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-color);
  padding: 0.25rem 0.6rem;
  border-radius: 50px;
  font-size: 0.85rem;
  font-weight: 600;
}

.attendance-trend {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.trend-pct {
  font-weight: 800;
  min-width: 45px;
}

.trend-pct.safe { color: var(--color-safe); }
.trend-pct.warning { color: var(--color-warning); }
.trend-pct.danger { color: var(--color-danger); }

/* Plantilla Docentes */
.teachers-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 1.5rem;
}

.teacher-card {
  padding: 1.5rem;
  background: rgba(15, 23, 42, 0.3);
}

.teacher-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.75rem;
}

.avatar-logo {
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: var(--primary-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  color: var(--primary);
  border: 1px solid rgba(0, 212, 255, 0.2);
}

.teacher-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #fff;
}

.teacher-email {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.assigned-courses h4 {
  font-size: 0.8rem;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 0.75rem;
}

.assigned-courses ul {
  list-style: none;
}

.assigned-courses li {
  display: flex;
  gap: 0.75rem;
  font-size: 0.85rem;
  margin-bottom: 0.5rem;
  align-items: center;
}

.group-indicator {
  background: var(--secondary-glow);
  color: var(--secondary);
  border: 1px solid rgba(138, 43, 226, 0.2);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  font-weight: 700;
  font-size: 0.75rem;
}

.materia-name {
  color: #e2e8f0;
  font-weight: 600;
}

/* Semestres y Grupos */
.groups-analytics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.group-stat-row {
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.3);
  transition: all 0.3s ease;
}

.group-stat-row.expanded {
  grid-column: 1 / -1;
  padding: 2rem;
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.08) 0%, rgba(15, 23, 42, 0.5) 100%);
  border: 2px solid rgba(0, 212, 255, 0.3);
  box-shadow: 0 8px 32px rgba(0, 212, 255, 0.15);
}

.group-main-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
}

.group-bold {
  font-weight: 800;
  font-size: 1.15rem;
  color: var(--primary);
}

.group-size {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.group-risk-bars {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.bar-wrapper {
  display: flex;
  flex-direction: column;
}

.bar-label {
  font-size: 0.75rem;
  color: #94a3b8;
  margin-bottom: 0.25rem;
}

.risk-bar-container {
  height: 8px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50px;
  overflow: hidden;
}

.risk-bar {
  height: 100%;
  border-radius: 50px;
  transition: width 0.5s ease;
}

.risk-bar.danger { background: var(--color-danger); }
.risk-bar.warning { background: var(--color-warning); }

/* Loader */
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

/* Expansión de Grupos */
.group-header-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.group-main-info {
  display: flex;
  align-items: center;
  gap: 1rem;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 0.5rem;
  margin-bottom: 0;
}

.group-expand-btn {
  background: none;
  border: none;
  color: var(--primary);
  font-size: 1rem;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
  flex-shrink: 0;
}

.group-expand-btn:hover {
  transform: scale(1.2);
}

.group-expand-btn.expanded {
  transform: rotate(0);
}

/* Lista de alumnos expandida */
.group-students-list {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--border-color);
}

.loading-students {
  text-align: center;
  padding: 1rem;
  color: var(--color-muted);
  font-size: 0.9rem;
}

.students-table-wrapper {
  overflow-x: auto;
}

.students-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.group-stat-row.expanded .students-table {
  font-size: 0.95rem;
}

.group-stat-row.expanded .students-table th {
  padding: 1rem 0.75rem;
  font-size: 1rem;
}

.group-stat-row.expanded .students-table td {
  padding: 1rem 0.75rem;
}

.students-table thead {
  background: rgba(0, 212, 255, 0.05);
}

.students-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: var(--primary);
  border-bottom: 1px solid var(--border-color);
}

.students-table td {
  padding: 0.75rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  color: #fff;
}

.students-table tbody tr:hover {
  background: rgba(0, 212, 255, 0.03);
}

.empty-students {
  text-align: center;
  padding: 2rem;
  color: var(--color-muted);
  font-size: 0.95rem;
}

.btn-sm {
  padding: 0.35rem 0.75rem !important;
  font-size: 0.75rem !important;
}

/* Sección de Asignación de Tutor */
.tutor-assignment-section {
  background: linear-gradient(135deg, rgba(0, 212, 255, 0.12) 0%, rgba(0, 212, 255, 0.04) 100%);
  border: 2px solid rgba(0, 212, 255, 0.3);
  border-radius: var(--radius-md);
  padding: 1.75rem;
  margin-bottom: 1.5rem;
  box-shadow: 0 4px 12px rgba(0, 212, 255, 0.1);
}

.tutor-header {
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(0, 212, 255, 0.2);
}

.tutor-header h3 {
  color: #00d4ff;
  font-size: 1.1rem;
  margin: 0 0 0.75rem 0;
  font-weight: 700;
  letter-spacing: 0.5px;
}

.current-tutor {
  font-size: 1rem;
  color: #4ade80;
  margin: 0;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.current-tutor strong {
  color: #86efac;
  text-decoration: underline;
  text-decoration-color: rgba(134, 239, 172, 0.3);
}

.no-tutor {
  font-size: 1rem;
  color: #fbbf24;
  margin: 0;
  font-style: italic;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.no-tutor::before {
  content: '⚠️';
  font-style: normal;
}

.tutor-selector-row {
  display: flex;
  gap: 1rem;
  align-items: stretch;
  flex-wrap: wrap;
}

.tutor-select {
  flex: 1;
  min-width: 240px;
  padding: 0.75rem 1rem;
  background: rgba(15, 23, 42, 0.6);
  border: 2px solid rgba(0, 212, 255, 0.2);
  border-radius: var(--radius-sm);
  color: #e2e8f0;
  font-family: var(--font-family);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.tutor-select:hover:not(:disabled) {
  background: rgba(15, 23, 42, 0.8);
  border-color: var(--primary);
  box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
}

.tutor-select:focus {
  outline: none;
  border-color: var(--primary);
  background: rgba(15, 23, 42, 0.9);
  box-shadow: 0 0 15px rgba(0, 212, 255, 0.4);
}

.tutor-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(15, 23, 42, 0.3);
}

.tutor-assign-btn {
  padding: 0.75rem 1.5rem !important;
  font-size: 0.95rem !important;
  font-weight: 600 !important;
  border-radius: var(--radius-sm) !important;
  white-space: nowrap;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.3s ease !important;
  min-width: 150px;
}

.tutor-assign-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 212, 255, 0.3) !important;
}

.tutor-assign-btn:disabled {
  opacity: 0.6 !important;
  cursor: not-allowed !important;
  transform: none !important;
}

.students-section {
  border-top: 1px solid var(--border-color);
  padding-top: 1rem;
}

.matricula-tag {
  background: rgba(0, 212, 255, 0.15);
  color: var(--primary);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
  font-family: monospace;
}
</style>

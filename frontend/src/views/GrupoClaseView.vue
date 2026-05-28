<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import * as XLSX from 'xlsx';
import { useAuthStore } from '../stores/auth';
import { API_BASE_URL } from '../config';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();

const asignacionId = route.params.asignacionId;
const alumnos = ref([]);
const loading = ref(true);
const error = ref('');
const fecha = ref(new Date().toISOString().split('T')[0]);
const search = ref('');
const guardando = ref(false);
const mensajeExito = ref('');
const importInfo = ref('');
const importPreview = ref([]);
const importedOnly = ref(false);
const importedAlumnoIds = ref(new Set());
const asistenciaDiaria = ref([]);
const loadingAsistenciaDiaria = ref(true);

// Estructura interna para almacenar el pase de lista del día actual en memoria
const claseLog = ref({});

const normalizeName = (value = '') => {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
};

const getFirstNonEmptyValue = (row = []) => {
  const rowValues = row.map(value => String(value ?? '').trim()).filter(Boolean);
  return rowValues[0] || '';
};

const parseImportedStudents = (workbook) => {
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false });

  if (!rows.length) {
    return [];
  }

  const headerRow = rows[0].map(value => normalizeName(String(value ?? '')));
  const hasHeader = headerRow.some(value =>
    ['nombre', 'alumno', 'estudiante', 'nombres', 'name', 'matricula', 'correo', 'email', 'telefono', 'celular', 'phone'].includes(value) ||
    value.includes('nombre') ||
    value.includes('matricula') ||
    value.includes('correo') ||
    value.includes('email') ||
    value.includes('telefono') ||
    value.includes('phone')
  );

  const dataRows = hasHeader ? rows.slice(1) : rows;

  return dataRows
    .map(row => {
      const values = row.map(value => String(value ?? '').trim());

      if (hasHeader) {
        const record = {};
        headerRow.forEach((key, index) => {
          record[key] = values[index] || '';
        });

        return {
          nombre: record.nombre || record.alumno || record.estudiante || record.nombres || record.name || '',
          matricula: record.matricula || record['matrícula'] || '',
          correo: record.correo || record.email || '',
          telefono: record.telefono || record.celular || record.phone || ''
        };
      }

      return {
        nombre: values[0] || '',
        matricula: values[1] || '',
        correo: values[2] || '',
        telefono: values[3] || ''
      };
    })
    .filter(item => item.nombre || item.matricula);
};

const cargarDatos = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/docente/grupo/${asignacionId}/alumnos`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });

    if (!response.ok) {
      throw new Error('No se pudo cargar la lista de alumnos.');
    }

    const data = await response.json();
    alumnos.value = data.alumnos;

    data.alumnos.forEach(al => {
      if (!claseLog.value[al.id]) {
        claseLog.value[al.id] = {
          alumno_id: al.id,
          estado_asistencia: 'presente',
          puntos_participacion: 0
        };
      }
    });

    await cargarAsistenciaDiaria();
  } catch (err) {
    error.value = err.message;
  } finally {
    loading.value = false;
  }
};

const cargarAsistenciaDiaria = async () => {
  loadingAsistenciaDiaria.value = true;
  try {
    const response = await fetch(`${API_BASE_URL}/docente/grupo/${asignacionId}/asistencia-diaria`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });

    if (!response.ok) {
      throw new Error('No se pudo cargar la asistencia diaria.');
    }

    asistenciaDiaria.value = await response.json();
  } catch (err) {
    error.value = err.message;
  } finally {
    loadingAsistenciaDiaria.value = false;
  }
};

const descargarAsistencia = async () => {
  error.value = '';
  try {
    const response = await fetch(`${API_BASE_URL}/docente/grupo/${asignacionId}/asistencia-descarga`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'No se pudo descargar la asistencia.');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const contentDisposition = response.headers.get('content-disposition') || '';
    const match = contentDisposition.match(/filename="?([^";]+)/);
    const fileName = match ? match[1] : `asistencia_asignacion_${asignacionId}.csv`;

    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch (err) {
    error.value = err.message;
  }
};

const alumnosActivos = computed(() => {
  if (!importedOnly.value || importedAlumnoIds.value.size === 0) {
    return alumnos.value;
  }

  return alumnos.value.filter(alumno => importedAlumnoIds.value.has(alumno.id));
});

const alumnosFiltrados = computed(() => {
  const lista = alumnosActivos.value;

  if (!search.value) {
    return lista;
  }

  const q = search.value.toLowerCase();
  return lista.filter(al =>
    al.nombre.toLowerCase().includes(q) ||
    al.matricula.toLowerCase().includes(q)
  );
});

const setAsistencia = (alumnoId, estado) => {
  if (claseLog.value[alumnoId]) {
    claseLog.value[alumnoId].estado_asistencia = estado;
  }
};

const incrementarParticipacion = (alumnoId) => {
  if (claseLog.value[alumnoId]) {
    claseLog.value[alumnoId].puntos_participacion++;
  }
};

const decrementarParticipacion = (alumnoId) => {
  if (claseLog.value[alumnoId] && claseLog.value[alumnoId].puntos_participacion > 0) {
    claseLog.value[alumnoId].puntos_participacion--;
  }
};

const handleExcelUpload = async (event) => {
  const file = event.target.files?.[0];

  if (!file) {
    return;
  }

  error.value = '';
  mensajeExito.value = '';
  importInfo.value = '';
  importPreview.value = [];
  importedOnly.value = false;
  importedAlumnoIds.value = new Set();

  try {
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const workbook = isCsv
      ? XLSX.read(await file.text(), { type: 'string' })
      : XLSX.read(await file.arrayBuffer(), { type: 'array' });

    const importedStudents = parseImportedStudents(workbook);

    if (importedStudents.length === 0) {
      throw new Error('El archivo no contiene datos de alumnos válidos. Asegúrate de incluir Nombre y Matrícula.');
    }

    const response = await fetch(`${API_BASE_URL}/docente/grupo/${asignacionId}/importar-alumnos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ alumnos: importedStudents })
    });

    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error || 'No se pudo importar los alumnos.');
    }

    await cargarDatos();
    importedOnly.value = false;
    importedAlumnoIds.value = new Set();
    importPreview.value = importedStudents.map(alumno => alumno.nombre || alumno.matricula);

    importInfo.value = `Se procesaron ${result.total} filas: ${result.inserted} nuevos alumnos, ${result.updated} actualizados y ${result.skipped} omitidos.`;
    if (result.warnings && result.warnings.length > 0) {
      importInfo.value += ` Avisos: ${result.warnings.join(' ')}.`;
    }
  } catch (err) {
    error.value = err.message;
    importedOnly.value = false;
    importedAlumnoIds.value = new Set();
    importInfo.value = '';
    importPreview.value = [];
  } finally {
    event.target.value = '';
  }
};

const limpiarImportacion = () => {
  importedOnly.value = false;
  importedAlumnoIds.value = new Set();
  importInfo.value = '';
  importPreview.value = [];
};

const guardarClase = async () => {
  guardando.value = true;
  mensajeExito.value = '';
  error.value = '';

  const alumnosSeleccionados = alumnosActivos.value.map(alumno => alumno.id);
  const alumnosData = Object.values(claseLog.value).filter(entry =>
    alumnosSeleccionados.includes(entry.alumno_id)
  );

  if (alumnosData.length === 0) {
    throw new Error('No hay alumnos seleccionados para registrar. Importa una lista o revisa el filtro activo.');
  }

  const payload = {
    asignacionId: parseInt(asignacionId),
    fecha: fecha.value,
    alumnosData
  };

  try {
    const response = await fetch(`${API_BASE_URL}/docente/asistencias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(payload)
    });

    const resData = await response.json();

    if (!response.ok) {
      throw new Error(resData.error || 'Error al guardar la asistencia.');
    }

    mensajeExito.value = '✅ ¡Asistencias y participaciones registradas! Se han recalculado los estados de alerta.';

    Object.keys(claseLog.value).forEach(id => {
      claseLog.value[id].puntos_participacion = 0;
    });

    await cargarDatos();

    setTimeout(() => {
      mensajeExito.value = '';
    }, 5000);
  } catch (err) {
    error.value = err.message;
  } finally {
    guardando.value = false;
  }
};

const getRiesgoClass = (estado) => {
  if (estado === 'critico') return 'danger';
  if (estado === 'riesgo') return 'warning';
  return 'safe';
};

const getRiesgoText = (estado) => {
  if (estado === 'critico') return 'Crítico (Absorbente)';
  if (estado === 'riesgo') return 'Alerta Temprana';
  return 'Seguro / Activo';
};

onMounted(cargarDatos);
</script>

<template>
  <div class="app-container">
    <!-- Header -->
    <header class="nav-header">
      <div class="nav-brand">
        <div class="logo-icon">🎓</div>
        <span class="logo-text">Alerta Temprana</span>
      </div>
      <div class="nav-profile">
        <div class="user-info">
          <p class="user-name">{{ authStore.user?.nombre }}</p>
          <span class="user-role">Docente</span>
        </div>
        <button @click="() => router.push('/docente')" class="btn btn-secondary" style="padding: 0.5rem 1rem; font-size: 0.85rem;">
          Volver a Dashboard
        </button>
      </div>
    </header>

    <main class="main-content">
      <div class="class-header">
        <h1>Gestión de Clase y Pase de Lista</h1>
        <p class="subtitle">Registra la asistencia del día y otorga puntos de participación que ayudan a motivar a tus alumnos.</p>
      </div>

      <!-- Éxito o Error -->
      <div v-if="mensajeExito" class="success-banner">
        {{ mensajeExito }}
      </div>
      <div v-if="error" class="error-banner">
        ⚠️ Error: {{ error }}
      </div>

      <div v-if="loading" class="state-container">
        <div class="loader"></div>
        <p>Cargando información del grupo...</p>
      </div>

      <div v-else>
        <!-- Filtros y Controles del Día -->
        <div class="glass-card controls-card">
          <div class="controls-grid">
            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Fecha de la Sesión</label>
              <input type="date" v-model="fecha" class="input-glass" :disabled="guardando" />
            </div>

            <div class="form-group" style="margin-bottom: 0;">
              <label class="form-label">Buscar Estudiante</label>
              <input 
                type="text" 
                v-model="search" 
                placeholder="Buscar por nombre o matrícula..." 
                class="input-glass" 
              />
            </div>
          </div>
        </div>

        <div class="glass-card import-card">
          <div class="import-header">
            <div>
              <p class="import-title">Importar lista de alumnos desde Excel</p>
              <p class="import-copy">Sube un archivo .xlsx, .xls o .csv con los datos de tus alumnos (Nombre y Matrícula mínimo). Opcionalmente puede incluir Correo y Teléfono.</p>
            </div>
            <button v-if="importedOnly" @click="limpiarImportacion" class="btn btn-secondary" type="button">
              Ver todos los alumnos
            </button>
          </div>

          <div class="import-body">
            <label class="upload-box" for="excel-upload">
              <span class="upload-icon">📄</span>
              <span class="upload-label">Selecciona tu archivo</span>
              <span class="upload-hint">Acepta .xlsx, .xls y .csv</span>
            </label>
            <input id="excel-upload" type="file" accept=".xlsx,.xls,.csv" class="sr-only" @change="handleExcelUpload" />
          </div>

          <div v-if="importInfo" class="import-status">
            {{ importInfo }}
          </div>

          <div v-if="importPreview.length" class="import-preview">
            <p class="import-preview-title">Alumnos detectados en esta importación:</p>
            <div class="import-chips">
              <span v-for="nombre in importPreview" :key="nombre" class="import-chip">{{ nombre }}</span>
            </div>
          </div>
        </div>

        <!-- Visualización de Asistencia Diaria -->
        <div class="glass-card attendance-summary-card">
          <div class="attendance-summary-header">
            <div>
              <h2>Asistencia Diaria</h2>
              <p class="attendance-summary-copy">Consulta cómo ha ido la asistencia en cada jornada del ciclo.</p>
            </div>
            <button @click="descargarAsistencia" class="btn btn-secondary" type="button">
              ⬇️ Descargar lista de asistencia
            </button>
          </div>

          <div v-if="loadingAsistenciaDiaria" class="state-container">
            <div class="loader"></div>
            <p>Cargando asistencia diaria...</p>
          </div>

          <div v-else-if="asistenciaDiaria.length === 0" class="empty-tab-state">
            📭 No existen registros de asistencia diaria para esta asignación todavía.
          </div>

          <div v-else class="attendance-table-wrapper">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Presentes</th>
                  <th>Faltas</th>
                  <th>Retardos</th>
                  <th>Justificadas</th>
                  <th>% Asistencia</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="registro in asistenciaDiaria" :key="registro.fecha">
                  <td>{{ registro.fecha }}</td>
                  <td>{{ registro.presentes }}</td>
                  <td>{{ registro.faltas }}</td>
                  <td>{{ registro.retardos }}</td>
                  <td>{{ registro.justificadas }}</td>
                  <td>
                    <div class="attendance-percent-cell">
                      <span class="percentage-val" :class="getRiesgoClass(registro.porcentaje_asistencia < 70 ? 'critico' : registro.porcentaje_asistencia < 85 ? 'riesgo' : 'activo')">
                        {{ registro.porcentaje_asistencia }}%
                      </span>
                      <div class="progress-container small">
                        <div class="progress-bar" :class="getRiesgoClass(registro.porcentaje_asistencia < 70 ? 'critico' : registro.porcentaje_asistencia < 85 ? 'riesgo' : 'activo')" :style="{ width: `${registro.porcentaje_asistencia}%` }"></div>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Tabla Interactiva de Pase de Lista -->
        <div class="glass-card list-card">
          <div class="table-container">
            <table class="custom-table">
              <thead>
                <tr>
                  <th>Estudiante</th>
                  <th>Matrícula</th>
                  <th>Asistencia Acumulada</th>
                  <th>Estado</th>
                  <th style="width: 280px;">Registro de Hoy</th>
                  <th>Participación Hoy</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="al in alumnosFiltrados" :key="al.id">
                  <td>
                    <div class="student-info">
                      <p class="student-name">{{ al.nombre }}</p>
                      <span class="student-email">{{ al.correo || 'Sin correo institucional' }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="matricula-tag">{{ al.matricula }}</span>
                  </td>
                  <td>
                    <div class="attendance-percentage">
                      <span class="percentage-val" :class="getRiesgoClass(al.estado_general)">
                        {{ al.porcentaje_asistencia }}%
                      </span>
                      <span class="sessions-detail">
                        ({{ al.presentes }} de {{ al.total_sesiones }} clases)
                      </span>
                      <div class="progress-container">
                        <div 
                          class="progress-bar" 
                          :class="getRiesgoClass(al.estado_general)" 
                          :style="{ width: `${al.porcentaje_asistencia}%` }"
                        ></div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span class="badge" :class="'badge-' + getRiesgoClass(al.estado_general)">
                      {{ getRiesgoText(al.estado_general) }}
                    </span>
                  </td>
                  <td>
                    <!-- Controladores de Asistencia del día actual -->
                    <div class="attendance-btn-group">
                      <button 
                        @click="setAsistencia(al.id, 'presente')"
                        class="attendance-opt presente"
                        :class="{ active: claseLog[al.id]?.estado_asistencia === 'presente' }"
                        type="button"
                      >
                        P
                      </button>
                      <button 
                        @click="setAsistencia(al.id, 'falta')"
                        class="attendance-opt falta"
                        :class="{ active: claseLog[al.id]?.estado_asistencia === 'falta' }"
                        type="button"
                      >
                        F
                      </button>
                      <button 
                        @click="setAsistencia(al.id, 'retardo')"
                        class="attendance-opt retardo"
                        :class="{ active: claseLog[al.id]?.estado_asistencia === 'retardo' }"
                        type="button"
                      >
                        R
                      </button>
                      <button 
                        @click="setAsistencia(al.id, 'justificada')"
                        class="attendance-opt justificada"
                        :class="{ active: claseLog[al.id]?.estado_asistencia === 'justificada' }"
                        type="button"
                      >
                        J
                      </button>
                    </div>
                  </td>
                  <td>
                    <!-- Controladores de Participación del día actual -->
                    <div class="participation-control">
                      <button 
                        @click="decrementarParticipacion(al.id)" 
                        class="btn-circle" 
                        type="button"
                      >
                        -
                      </button>
                      <span class="participation-score">
                        {{ claseLog[al.id]?.puntos_participacion || 0 }}
                      </span>
                      <button 
                        @click="incrementarParticipacion(al.id)" 
                        class="btn-circle" 
                        type="button"
                      >
                        +
                      </button>
                      <span class="total-badge" title="Puntos acumulados en el ciclo">
                        ⭐ {{ al.total_participaciones }} total
                      </span>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Botón de Envío -->
          <div class="list-footer">
            <button 
              @click="guardarClase" 
              class="btn btn-primary btn-lg glow-active"
              :disabled="guardando"
            >
              {{ guardando ? 'Guardando Registro...' : 'Guardar Asistencias del Día 💾' }}
            </button>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.class-header {
  margin-bottom: 2rem;
}

.subtitle {
  color: var(--color-muted);
  font-size: 1.05rem;
}

/* Banner de éxito y error */
.success-banner {
  background: rgba(46, 213, 115, 0.15);
  color: var(--color-safe);
  border: 1px solid rgba(46, 213, 115, 0.3);
  padding: 1rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

.error-banner {
  background: rgba(255, 71, 87, 0.15);
  color: var(--color-danger);
  border: 1px solid rgba(255, 71, 87, 0.3);
  padding: 1rem;
  border-radius: var(--radius-sm);
  font-weight: 600;
  margin-bottom: 1.5rem;
  font-size: 0.95rem;
}

/* Controles */
.controls-card {
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.controls-grid {
  display: grid;
  grid-template-columns: 240px 1fr;
  gap: 1.5rem;
}

.import-card {
  padding: 1.5rem;
  margin-bottom: 1.5rem;
}

.import-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.import-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 0.35rem;
}

.import-copy {
  color: var(--color-muted);
  font-size: 0.95rem;
  line-height: 1.5;
  margin: 0;
}

.import-body {
  margin-bottom: 1rem;
}

.upload-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  border: 1px dashed rgba(0, 212, 255, 0.45);
  border-radius: var(--radius-sm);
  padding: 1.25rem;
  background: rgba(15, 23, 42, 0.35);
  color: #e2e8f0;
  cursor: pointer;
  transition: border-color 0.2s ease, transform 0.2s ease;
}

.upload-box:hover {
  border-color: rgba(0, 212, 255, 0.9);
  transform: translateY(-1px);
}

.upload-icon {
  font-size: 1.6rem;
}

.upload-label {
  font-weight: 700;
}

.upload-hint {
  color: var(--color-muted);
  font-size: 0.9rem;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  border: 0;
}

.import-status {
  color: #cbd5e1;
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(148, 163, 184, 0.24);
  border-radius: var(--radius-sm);
  padding: 0.85rem 1rem;
  margin-bottom: 1rem;
  line-height: 1.5;
}

.import-preview {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.import-preview-title {
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.import-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.import-chip {
  background: rgba(0, 212, 255, 0.12);
  color: #e0f2fe;
  border: 1px solid rgba(0, 212, 255, 0.25);
  border-radius: 999px;
  padding: 0.35rem 0.85rem;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .controls-grid {
    grid-template-columns: 1fr;
  }

  .import-header {
    flex-direction: column;
  }
}

/* Lista */
.list-card {
  margin-bottom: 3rem;
}

.student-info {
  display: flex;
  flex-direction: column;
}

.student-name {
  font-weight: 700;
  color: #fff;
}

.student-email {
  font-size: 0.8rem;
  color: var(--color-muted);
}

.matricula-tag {
  font-family: monospace;
  background: rgba(255, 255, 255, 0.05);
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #e2e8f0;
}

.attendance-percentage {
  display: flex;
  flex-direction: column;
  max-width: 180px;
}

.percentage-val {
  font-weight: 800;
  font-size: 1.1rem;
}

.percentage-val.safe { color: var(--color-safe); }
.percentage-val.warning { color: var(--color-warning); }
.percentage-val.danger { color: var(--color-danger); }

.sessions-detail {
  font-size: 0.75rem;
  color: var(--color-muted);
}

.total-badge {
  font-size: 0.75rem;
  color: #f59e0b;
  font-weight: 600;
  background: rgba(245, 158, 11, 0.1);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
  margin-left: 0.5rem;
}

.list-footer {
  display: flex;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid var(--border-color);
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

.attendance-summary-card {
  margin-bottom: 1.5rem;
  padding: 1.5rem;
}

.attendance-summary-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.attendance-summary-header h2 {
  margin: 0 0 0.25rem 0;
  color: #fff;
}

.attendance-summary-copy {
  font-size: 0.9rem;
  color: var(--color-muted);
}

.attendance-table-wrapper {
  overflow-x: auto;
}

.attendance-table-wrapper .custom-table th,
.attendance-table-wrapper .custom-table td {
  padding: 0.75rem;
}

.attendance-percent-cell {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-width: 150px;
}

.progress-container.small {
  height: 8px;
  border-radius: 50px;
  overflow: hidden;
  background: rgba(255,255,255,.05);
}

.progress-container.small .progress-bar {
  height: 100%;
}

</style>

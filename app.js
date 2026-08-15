/* ==========================================================================
   SISTEMA DE GESTIÓN Y DISPONIBILIDAD DE AULAS - JAVASCRIPT
   Robust Excel parsing, dynamic room availability grid, multi-filters & modal UX
   ========================================================================== */

// --- Global Application State ---
const state = {
  rawReservations: [],
  filteredReservations: [],
  classrooms: [],
  blocks: [],
  faculties: [],
  teachers: [],
  subjects: [],
  dates: [],
  filters: {
    day: 'LUNES',
    fecha: '',
    bloque: '',
    facultad: '',
    aula: '',
    profesor: '',
    materia: '',
    startHour: 7,
    endHour: 23
  },
  activeView: 'matrix',
  timeSlots: [
    '07:00', '08:00', '09:00', '10:00', '11:00', '12:00', 
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', 
    '19:00', '20:00', '21:00', '22:00'
  ]
};

// Colors per Faculty for visual badges
const facultyColors = [
  { bg: 'rgba(56, 189, 248, 0.22)', border: 'rgba(56, 189, 248, 0.5)', text: '#38bdf8' },
  { bg: 'rgba(168, 85, 247, 0.22)', border: 'rgba(168, 85, 247, 0.5)', text: '#c084fc' },
  { bg: 'rgba(251, 191, 36, 0.22)', border: 'rgba(251, 191, 36, 0.5)', text: '#fbbf24' },
  { bg: 'rgba(244, 114, 182, 0.22)', border: 'rgba(244, 114, 182, 0.5)', text: '#f472b6' },
  { bg: 'rgba(52, 211, 153, 0.22)', border: 'rgba(52, 211, 153, 0.5)', text: '#34d399' },
  { bg: 'rgba(249, 115, 22, 0.22)', border: 'rgba(249, 115, 22, 0.5)', text: '#f97316' }
];

const facultyColorMap = {};

function getFacultyStyle(facultad) {
  if (!facultad) return facultyColors[0];
  if (!facultyColorMap[facultad]) {
    const keys = Object.keys(facultyColorMap);
    const index = keys.length % facultyColors.length;
    facultyColorMap[facultad] = facultyColors[index];
  }
  return facultyColorMap[facultad];
}

/**
 * Extracts Block code from Classroom string.
 * Examples:
 * - "CO201", "CO202" => "CO"
 * - "E1", "E2" => "E"
 * - "J1", "J 15" => "J"
 * - "M-208", "M-305" => "M"
 * - "LAB 1" => "LAB"
 */
function extractBlockFromClassroom(aulaStr) {
  if (!aulaStr || typeof aulaStr !== 'string') return 'OTRO';
  const clean = aulaStr.trim().toUpperCase();
  if (clean === 'POR ASIGNAR' || clean === 'N/A' || clean === '') return 'POR ASIGNAR';

  const match = clean.match(/^([A-Z\u00C0-\u00DC]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return 'OTRO';
}

/**
 * Normalizes string for accent-insensitive, case-insensitive, and whitespace-insensitive matching
 */
function normalizeStr(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Returns true if target string contains all words in query string (accent & case insensitive)
 */
function matchProfesor(targetStr, queryStr) {
  if (!targetStr || !queryStr) return false;
  const target = normalizeStr(targetStr);
  const words = normalizeStr(queryStr).split(' ').filter(w => w.length > 0);
  if (words.length === 0) return false;
  return words.every(w => target.includes(w));
}

/**
 * Formats hour to 12-hour format string with AM/PM guide
 * Example: 13 -> "13:00 (1pm)", 7 -> "07:00 (7am)", 22 -> "22:00 (10pm)"
 */
function formatHour12(hVal) {
  let h = typeof hVal === 'number' ? hVal : parseInt(String(hVal).split(':')[0], 10);
  if (isNaN(h)) return String(hVal);
  const period = h >= 12 ? 'pm' : 'am';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const h24 = String(h).padStart(2, '0') + ':00';
  return `${h24} (${h12}${period})`;
}

/**
 * Returns Spanish day of week from formatted date string ("DD/MM/YYYY" or "YYYY-MM-DD")
 */
function getDayOfWeekFromFormattedDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;

  const daysMap = ['DOMINGO', 'LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO'];

  const ddmmyyyy = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    const dateObj = new Date(year, month, day);
    return daysMap[dateObj.getDay()];
  }

  const yyyymmdd = dateStr.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (yyyymmdd) {
    const year = parseInt(yyyymmdd[1], 10);
    const month = parseInt(yyyymmdd[2], 10) - 1;
    const day = parseInt(yyyymmdd[3], 10);
    const dateObj = new Date(year, month, day);
    return daysMap[dateObj.getDay()];
  }

  return null;
}

// --- DOM Initialization ---
document.addEventListener('DOMContentLoaded', () => {
  initEventListeners();
  // Starts EMPTY - waiting for user's Excel file!
  applyFiltersAndRender();
});

// --- Event Listeners ---
function initEventListeners() {
  const fileInput = document.getElementById('excelFileInput');
  const dragInput = document.getElementById('dragFileInput');
  const dropZone = document.getElementById('dropZone');

  fileInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));
  dragInput.addEventListener('change', (e) => handleFileSelect(e.target.files[0]));

  // Drag and Drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  });

  // Day Buttons
  const dayButtons = document.querySelectorAll('#daySelector .day-btn');
  dayButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      dayButtons.forEach(b => b.classList.remove('active'));
      const target = e.target.closest('.day-btn');
      target.classList.add('active');
      state.filters.day = target.getAttribute('data-day');
      applyFiltersAndRender();
    });
  });

  // Dropdown & Input Filters with LIVE REAL-TIME Search (on input + change)
  const filterFecha = document.getElementById('filterFecha');
  if (filterFecha) {
    filterFecha.addEventListener('change', (e) => {
      const selectedDate = e.target.value;
      state.filters.fecha = selectedDate;

      // Auto-select day of week for the chosen date
      if (selectedDate) {
        const dayOfWeek = getDayOfWeekFromFormattedDate(selectedDate);
        if (dayOfWeek) {
          state.filters.day = dayOfWeek;
          const dayButtons = document.querySelectorAll('#daySelector .day-btn');
          dayButtons.forEach(b => {
            b.classList.toggle('active', b.getAttribute('data-day') === dayOfWeek);
          });
        }
      }

      // Automatically switch to 'matrix' view tab (Matriz de Disponibilidad)
      state.activeView = 'matrix';
      const tabBtns = document.querySelectorAll('.tab-btn');
      tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === 'matrix'));
      switchView('matrix');
    });
  }

  const filterBloque = document.getElementById('filterBloque');
  if (filterBloque) {
    filterBloque.addEventListener('change', (e) => {
      state.filters.bloque = e.target.value;
      updateAulaDatalist();
      applyFiltersAndRender();
    });
  }

  // Live real-time search inputs (updates as user types or pastes text)
  const searchInputs = [
    { id: 'filterFacultad', key: 'facultad' },
    { id: 'filterAula', key: 'aula' },
    { id: 'filterProfesor', key: 'profesor' },
    { id: 'filterMateria', key: 'materia' }
  ];

  searchInputs.forEach(item => {
    const inputEl = document.getElementById(item.id);
    if (inputEl) {
      const handleInput = (e) => {
        const val = e.target.value.trim();
        state.filters[item.key] = val;

        // If user types or picks a professor, automatically switch to Horario Profesor tab
        if (item.key === 'profesor' && val && state.activeView !== 'schedule') {
          state.activeView = 'schedule';
          const tabBtns = document.querySelectorAll('.tab-btn');
          tabBtns.forEach(b => b.classList.toggle('active', b.getAttribute('data-view') === 'schedule'));
          switchView('schedule');
        } else {
          applyFiltersAndRender();
        }
      };
      inputEl.addEventListener('input', handleInput);
      inputEl.addEventListener('change', handleInput);
    }
  });

  // Clear Input buttons (✕)
  document.querySelectorAll('.btn-clear-input').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-target');
      const inputEl = document.getElementById(targetId);
      if (inputEl) {
        inputEl.value = '';
        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
        inputEl.focus();
      }
    });
  });

  document.getElementById('filterHoraInicio').addEventListener('change', (e) => {
    state.filters.startHour = parseInt(e.target.value.split(':')[0], 10);
    applyFiltersAndRender();
  });

  document.getElementById('filterHoraFin').addEventListener('change', (e) => {
    state.filters.endHour = parseInt(e.target.value.split(':')[0], 10);
    applyFiltersAndRender();
  });

  document.getElementById('btnClearFilters').addEventListener('click', () => clearFilters());

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      tabBtns.forEach(b => b.classList.remove('active'));
      const targetBtn = e.target.closest('.tab-btn');
      targetBtn.classList.add('active');
      state.activeView = targetBtn.getAttribute('data-view');
      switchView(state.activeView);
    });
  });

  // Export PDF Button
  const btnExportPDF = document.getElementById('btnExportPDF');
  if (btnExportPDF) {
    btnExportPDF.addEventListener('click', exportProfessorSchedulePDF);
  }

  // Modal Close
  document.getElementById('btnModalClose').addEventListener('click', closeModal);
  document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target.id === 'detailModal') closeModal();
  });
}

// --- Excel Reading & Parsing ---
function handleFileSelect(file) {
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const sheetJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      if (!sheetJson || sheetJson.length === 0) {
        alert('El archivo Excel está vacío o no se pudo leer.');
        return;
      }

      parseExcelData(sheetJson);
    } catch (err) {
      console.error('Error parsing Excel:', err);
      alert('Error al leer el archivo Excel. Asegúrate de que sea un archivo válido (.xls, .xlsx, .csv).');
    }
  };
  reader.readAsArrayBuffer(file);
}

function parseExcelData(rows) {
  if (rows.length < 2) {
    alert('El archivo no contiene suficientes filas de datos.');
    return;
  }

  // Detect header row index
  let headerRowIndex = 0;
  for (let i = 0; i < Math.min(10, rows.length); i++) {
    const rowStr = rows[i].map(c => String(c || '').toLowerCase()).join(' ');
    if (rowStr.includes('materia') || rowStr.includes('profesor') || rowStr.includes('aula') || rowStr.includes('horario') || rowStr.includes('dia') || rowStr.includes('facultad')) {
      headerRowIndex = i;
      break;
    }
  }

  // Exact column positions:
  // Col B (index 1): ID de la materia
  // Col L (index 11): nroidenti
  // Col M (index 12): profesor
  // Col N (index 13): dia
  // Col O (index 14): horario
  // Col P (index 15): aula
  // Col Q (index 16): facultad
  // Col R (index 17): materia (Nombre de la materia)
  // Col S (index 18): fecha

  const colIdMateria = 1;
  const colNroidenti = 11;
  const colProfesor  = 12;
  const colDia       = 13;
  const colHorario   = 14;
  const colAula      = 15;
  const colFacultad  = 16;
  const colNombreMat = 17;
  const colFecha     = 18;

  const reservations = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawHorario = String(row[colHorario] !== undefined ? row[colHorario] : '').trim();
    let rawAula = String(row[colAula] !== undefined ? row[colAula] : '').trim().toUpperCase();
    const rawDia = String(row[colDia] !== undefined ? row[colDia] : '').trim().toUpperCase();

    if (!rawHorario || !rawDia) continue;

    if (!rawAula) rawAula = 'POR ASIGNAR';

    const timeRange = parseTimeRange(rawHorario);

    const materiaId = String(row[colIdMateria] !== undefined ? row[colIdMateria] : '').trim();
    let materiaNombre = String(row[colNombreMat] !== undefined ? row[colNombreMat] : '').trim();

    if (!materiaNombre) materiaNombre = materiaId || 'ASIGNATURA SIN NOMBRE';

    const rawFecha = row[colFecha];
    const fechaFormatted = formatExcelDate(rawFecha);

    const resObj = {
      id: i,
      idMateria: materiaId || 'N/A',
      nroidenti: String(row[colNroidenti] !== undefined ? row[colNroidenti] : '').trim() || 'N/A',
      profesor: String(row[colProfesor] !== undefined ? row[colProfesor] : '').trim() || 'SIN DOCENTE ASIGNADO',
      dia: normalizeDay(rawDia),
      horarioStr: rawHorario,
      startHour: timeRange.startHour,
      endHour: timeRange.endHour,
      aula: rawAula,
      facultad: String(row[colFacultad] !== undefined ? row[colFacultad] : '').trim() || 'FACULTAD GENERAL',
      materia: materiaNombre,
      fecha: fechaFormatted
    };

    reservations.push(resObj);
  }

  state.rawReservations = reservations;
  extractMetadata();
  populateDropdownFilters();
  applyFiltersAndRender();
}

/**
 * Parses time ranges such as "06:00 A 07:00", "09:01 A 11:00", "14:00 A 16:00", "16:00 A 18:00"
 */
function parseTimeRange(horarioStr) {
  let startHour = 6.0;
  let endHour = 7.0;

  const clean = horarioStr.toUpperCase().replace(/\s+/g, ' ');
  const match = clean.match(/(\d{1,2}):?(\d{2})?\s*(?:A|-|HASTA)\s*(\d{1,2}):?(\d{2})?/);

  if (match) {
    const h1 = parseInt(match[1], 10);
    const m1 = match[2] ? parseInt(match[2], 10) : 0;
    const h2 = parseInt(match[3], 10);
    const m2 = match[4] ? parseInt(match[4], 10) : 0;

    startHour = h1 + (m1 / 60.0);
    endHour = h2 + (m2 / 60.0);
  } else {
    const numbers = clean.match(/\d{1,2}/g);
    if (numbers && numbers.length >= 2) {
      startHour = parseInt(numbers[0], 10);
      endHour = parseInt(numbers[1], 10);
    }
  }

  if (isNaN(startHour) || startHour < 0) startHour = 6.0;
  if (isNaN(endHour) || endHour <= startHour) endHour = startHour + 1.0;

  return { startHour, endHour };
}

function normalizeDay(dayStr) {
  const d = dayStr.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (d.includes('LUN')) return 'LUNES';
  if (d.includes('MAR')) return 'MARTES';
  if (d.includes('MIE') || d.includes('MIÉR')) return 'MIÉRCOLES';
  if (d.includes('JUE')) return 'JUEVES';
  if (d.includes('VIE')) return 'VIERNES';
  if (d.includes('SAB') || d.includes('SÁB')) return 'SÁBADO';
  if (d.includes('DOM')) return 'DOMINGO';
  return d;
}

/**
 * Formats date values from Excel (strings like "12/08/2026", "2026-08-12", or serial numbers) to DD/MM/YYYY
 */
function formatExcelDate(val) {
  if (val === undefined || val === null || val === '') return 'N/A';
  if (typeof val === 'number') {
    if (typeof XLSX !== 'undefined' && XLSX.SSF) {
      try {
        const jsDate = XLSX.SSF.parse_date_code(val);
        if (jsDate && jsDate.d && jsDate.m && jsDate.y) {
          const d = String(jsDate.d).padStart(2, '0');
          const m = String(jsDate.m).padStart(2, '0');
          const y = jsDate.y;
          return `${d}/${m}/${y}`;
        }
      } catch (err) {
        // Fallback
      }
    }
    const d = new Date(Math.round((val - 25569) * 86400 * 1000));
    if (!isNaN(d.getTime())) {
      const day = String(d.getUTCDate()).padStart(2, '0');
      const month = String(d.getUTCMonth() + 1).padStart(2, '0');
      const year = d.getUTCFullYear();
      return `${day}/${month}/${year}`;
    }
  }

  const str = String(val).trim();
  if (!str) return 'N/A';

  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    let year = ddmmyyyy[3];
    if (year.length === 2) year = '20' + year;
    return `${day}/${month}/${year}`;
  }

  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})$/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, '0');
    const day = yyyymmdd[3].padStart(2, '0');
    return `${day}/${month}/${year}`;
  }

  return str;
}

// --- Extract Metadata for Dropdowns & Blocks ---
function extractMetadata() {
  const aulaSet = new Set();
  const facSet = new Set();
  const teacherSet = new Set();
  const subjectSet = new Set();
  const dateSet = new Set();
  const blockSet = new Set();

  state.rawReservations.forEach(r => {
    if (r.aula) {
      aulaSet.add(r.aula);
      const b = extractBlockFromClassroom(r.aula);
      blockSet.add(b);
    }
    if (r.facultad) facSet.add(r.facultad);
    if (r.profesor && r.profesor !== 'SIN DOCENTE ASIGNADO') teacherSet.add(r.profesor);
    if (r.materia) subjectSet.add(r.materia);
    if (r.fecha && r.fecha !== 'N/A') dateSet.add(r.fecha);
  });

  state.classrooms = Array.from(aulaSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  state.blocks = Array.from(blockSet).sort((a, b) => a.localeCompare(b));
  state.faculties = Array.from(facSet).sort();
  state.teachers = Array.from(teacherSet).sort();
  state.subjects = Array.from(subjectSet).sort();
  state.dates = Array.from(dateSet).sort((a, b) => {
    const pA = a.split('/');
    const pB = b.split('/');
    if (pA.length === 3 && pB.length === 3) {
      const keyA = `${pA[2]}${pA[1]}${pA[0]}`;
      const keyB = `${pB[2]}${pB[1]}${pB[0]}`;
      return keyA.localeCompare(keyB);
    }
    return a.localeCompare(b);
  });
}

function populateDropdownFilters() {
  // Fecha
  const dateSelect = document.getElementById('filterFecha');
  if (dateSelect) {
    dateSelect.innerHTML = '<option value="">Todas las Fechas</option>';
    state.dates.forEach(fecha => {
      const opt = document.createElement('option');
      opt.value = fecha;
      opt.textContent = fecha;
      dateSelect.appendChild(opt);
    });
  }

  // Bloque
  const blockSelect = document.getElementById('filterBloque');
  if (blockSelect) {
    blockSelect.innerHTML = '<option value="">Todos los Bloques</option>';
    state.blocks.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = `Bloque ${b}`;
      blockSelect.appendChild(opt);
    });
  }

  // Facultad Datalist
  const dlFacultad = document.getElementById('dlFacultad');
  if (dlFacultad) {
    dlFacultad.innerHTML = '';
    state.faculties.forEach(fac => {
      const opt = document.createElement('option');
      opt.value = fac;
      dlFacultad.appendChild(opt);
    });
  }

  // Aula Datalist
  updateAulaDatalist();

  // Profesor Datalist
  const dlProfesor = document.getElementById('dlProfesor');
  if (dlProfesor) {
    dlProfesor.innerHTML = '';
    state.teachers.forEach(teacher => {
      const opt = document.createElement('option');
      opt.value = teacher;
      dlProfesor.appendChild(opt);
    });
  }

  // Materia Datalist
  const dlMateria = document.getElementById('dlMateria');
  if (dlMateria) {
    dlMateria.innerHTML = '';
    state.subjects.forEach(subject => {
      const opt = document.createElement('option');
      opt.value = subject;
      dlMateria.appendChild(opt);
    });
  }
}

function updateAulaDatalist() {
  const dlAula = document.getElementById('dlAula');
  if (!dlAula) return;
  dlAula.innerHTML = '';

  const activeBlock = state.filters.bloque;
  const filteredClassrooms = activeBlock 
    ? state.classrooms.filter(c => extractBlockFromClassroom(c) === activeBlock)
    : state.classrooms;

  filteredClassrooms.forEach(aula => {
    const opt = document.createElement('option');
    opt.value = aula;
    dlAula.appendChild(opt);
  });
}

function clearFilters() {
  state.filters.day = 'LUNES';
  state.filters.fecha = '';
  state.filters.bloque = '';
  state.filters.facultad = '';
  state.filters.aula = '';
  state.filters.profesor = '';
  state.filters.materia = '';
  state.filters.startHour = 7;
  state.filters.endHour = 23;

  const dateSelect = document.getElementById('filterFecha');
  if (dateSelect) dateSelect.value = '';

  const blockSelect = document.getElementById('filterBloque');
  if (blockSelect) blockSelect.value = '';

  const inputFacultad = document.getElementById('filterFacultad');
  if (inputFacultad) inputFacultad.value = '';

  const inputAula = document.getElementById('filterAula');
  if (inputAula) inputAula.value = '';

  const inputProfesor = document.getElementById('filterProfesor');
  if (inputProfesor) inputProfesor.value = '';

  const inputMateria = document.getElementById('filterMateria');
  if (inputMateria) inputMateria.value = '';

  document.getElementById('filterHoraInicio').value = '07:00';
  document.getElementById('filterHoraFin').value = '23:00';

  const dayButtons = document.querySelectorAll('#daySelector .day-btn');
  dayButtons.forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-day') === 'LUNES');
  });

  updateAulaDatalist();
  applyFiltersAndRender();
}

/**
 * Returns filtered list of classrooms based on active Bloque and Aula live search input
 */
function getFilteredClassrooms() {
  let list = state.classrooms;

  if (state.filters.bloque) {
    list = list.filter(c => extractBlockFromClassroom(c) === state.filters.bloque);
  }

  if (state.filters.aula) {
    const search = state.filters.aula.trim().toUpperCase();
    list = list.filter(c => c.toUpperCase().includes(search));
  }

  return list;
}

// --- Filtering Logic ---
function applyFiltersAndRender() {
  const { day, fecha, bloque, facultad, aula, profesor, materia, startHour, endHour } = state.filters;

  state.filteredReservations = state.rawReservations.filter(r => {
    if (day !== 'TODOS' && r.dia !== day) return false;
    if (fecha && r.fecha && r.fecha !== 'N/A' && r.fecha !== fecha) return false;
    
    // Bloque Filter
    if (bloque) {
      const rBlock = extractBlockFromClassroom(r.aula);
      if (rBlock !== bloque) return false;
    }

    // Live search for Facultad (accent-insensitive substring match)
    if (facultad && !matchProfesor(r.facultad, facultad)) return false;

    // Live search for Aula (substring match)
    if (aula && !normalizeStr(r.aula).includes(normalizeStr(aula))) return false;

    // Live search for Profesor (accent-insensitive multi-word match)
    if (profesor && !matchProfesor(r.profesor, profesor)) return false;

    // Live search for Materia (accent-insensitive multi-word match)
    if (materia && !matchProfesor(r.materia, materia)) return false;

    if (r.endHour <= startHour || r.startHour >= endHour) return false;
    return true;
  });

  updateStats();
  renderCurrentView();
}

function updateStats() {
  const targetClassrooms = getFilteredClassrooms();
  document.getElementById('statTotalAulas').textContent = state.classrooms.length;
  document.getElementById('statTotalReservas').textContent = state.rawReservations.length;
  document.getElementById('statFacultades').textContent = state.faculties.length;

  let freeSlotsCount = 0;
  const hoursToRender = state.timeSlots.filter(t => {
    const h = parseInt(t.split(':')[0], 10);
    return h >= state.filters.startHour && h < state.filters.endHour;
  });

  targetClassrooms.forEach(c => {
    hoursToRender.forEach(tStr => {
      const h = parseInt(tStr.split(':')[0], 10);
      const isOccupied = state.filteredReservations.some(r => 
        r.aula.toUpperCase() === c.toUpperCase() && r.startHour < (h + 1) && r.endHour > h
      );
      if (!isOccupied) freeSlotsCount++;
    });
  });

  document.getElementById('statLibresAhora').textContent = freeSlotsCount;
}

function switchView(viewName) {
  document.getElementById('viewMatrix').style.display = viewName === 'matrix' ? 'block' : 'none';
  document.getElementById('viewCards').style.display = viewName === 'cards' ? 'grid' : 'none';
  document.getElementById('viewTable').style.display = viewName === 'table' ? 'block' : 'none';
  document.getElementById('viewSchedule').style.display = viewName === 'schedule' ? 'block' : 'none';

  renderCurrentView();
}

function renderCurrentView() {
  if (state.activeView === 'matrix') renderMatrixView();
  else if (state.activeView === 'cards') renderCardsView();
  else if (state.activeView === 'table') renderTableView();
  else if (state.activeView === 'schedule') renderScheduleView();
}

// --- View 1: Matrix Render (Full Width Grid) ---
function renderMatrixView() {
  const headerRow = document.getElementById('matrixHeaderRow');
  const tbody = document.getElementById('matrixBody');

  const activeHours = state.timeSlots.filter(t => {
    const h = parseInt(t.split(':')[0], 10);
    return h >= state.filters.startHour && h < state.filters.endHour;
  });

  headerRow.innerHTML = `<th class="col-aula"><i class="fa-solid fa-door-open"></i> Aula / Espacio</th>`;
  activeHours.forEach(t => {
    const h = parseInt(t.split(':')[0], 10);
    const start12 = formatHour12(h);
    const end12 = formatHour12(h + 1);
    headerRow.innerHTML += `<th>${start12}<br><span style="font-size:0.7em; font-weight:normal; opacity:0.7;">a ${end12}</span></th>`;
  });

  tbody.innerHTML = '';

  const targetClassrooms = getFilteredClassrooms();

  if (state.rawReservations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${activeHours.length + 1}" class="empty-state">
      <i class="fa-solid fa-file-excel" style="font-size: 38px; color: var(--accent-cyan); margin-bottom: 12px;"></i>
      <h3 style="color: var(--text-main); font-size: 1.1rem;">No hay programación cargada</h3>
      <p style="margin-top: 4px;">Haz clic en <b>"Importar Archivo Excel"</b> arriba o arrastra tu archivo <b>12.xls</b> a la zona superior para analizar la disponibilidad.</p>
    </td></tr>`;
    return;
  }

  if (targetClassrooms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${activeHours.length + 1}" class="empty-state">
      <p>No se encontraron aulas con los filtros seleccionados.</p>
    </td></tr>`;
    return;
  }

  targetClassrooms.forEach(aula => {
    const tr = document.createElement('tr');
    const blockCode = extractBlockFromClassroom(aula);

    const tdAula = document.createElement('td');
    tdAula.className = 'cell-aula';
    tdAula.innerHTML = `
      <div class="aula-header-info">
        <span class="block-badge" title="Bloque ${blockCode}">${blockCode}</span>
        <span class="aula-name"><i class="fa-solid fa-chalkboard"></i> ${aula}</span>
      </div>
    `;
    tr.appendChild(tdAula);

    activeHours.forEach(tStr => {
      const h = parseInt(tStr.split(':')[0], 10);
      const td = document.createElement('td');

      // Find reservations overlapping this hour
      const matchingResList = state.filteredReservations.filter(r => 
        r.aula.toUpperCase() === aula.toUpperCase() && r.startHour < (h + 1) && r.endHour > h
      );

      if (matchingResList.length > 0) {
        const reservation = matchingResList[0];
        td.className = 'matrix-cell occupied';
        const style = getFacultyStyle(reservation.facultad);
        td.style.backgroundColor = style.bg;
        td.style.borderColor = style.border;
        td.style.color = style.text;

        const dayTag = state.filters.day === 'TODOS' ? `<span style="opacity:0.8;">[${reservation.dia.slice(0,3)}] </span>` : '';

        td.innerHTML = `
          <span class="cell-badge">${dayTag}${reservation.materia}</span>
          <span class="cell-sub">${reservation.profesor}</span>
        `;
        td.addEventListener('click', () => openModalReservationList(matchingResList, aula, tStr));
      } else {
        // Outside reserved schedule => DISPONIBLE
        td.className = 'matrix-cell free';
        td.innerHTML = `<span style="font-size:0.75rem; font-weight:600;"><i class="fa-solid fa-check"></i> Libre</span>`;
        td.addEventListener('click', () => openModalFreeSlot(aula, state.filters.day, tStr));
      }

      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// --- View 2: Cards Render ---
function renderCardsView() {
  const container = document.getElementById('viewCards');
  container.innerHTML = '';

  if (state.rawReservations.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
      <i class="fa-solid fa-file-excel" style="font-size: 38px; color: var(--accent-cyan); margin-bottom: 12px;"></i>
      <h3>No hay programación cargada</h3>
      <p>Importa tu archivo Excel para ver el cronograma por aula.</p>
    </div>`;
    return;
  }

  const targetClassrooms = getFilteredClassrooms();

  if (targetClassrooms.length === 0) {
    container.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">No hay aulas para mostrar.</div>`;
    return;
  }

  const activeHours = state.timeSlots.filter(t => {
    const h = parseInt(t.split(':')[0], 10);
    return h >= state.filters.startHour && h < state.filters.endHour;
  });

  targetClassrooms.forEach(aula => {
    const blockCode = extractBlockFromClassroom(aula);
    const classroomRes = state.filteredReservations.filter(r => r.aula.toUpperCase() === aula.toUpperCase());

    const busySlots = activeHours.filter(tStr => {
      const h = parseInt(tStr.split(':')[0], 10);
      return classroomRes.some(r => r.startHour < (h + 1) && r.endHour > h);
    }).length;

    const occPercent = Math.round((busySlots / activeHours.length) * 100) || 0;
    let occClass = 'low';
    if (occPercent > 65) occClass = 'high';
    else if (occPercent > 35) occClass = 'med';

    const card = document.createElement('div');
    card.className = 'classroom-card';

    let slotsHtml = '';
    activeHours.forEach(tStr => {
      const h = parseInt(tStr.split(':')[0], 10);
      const res = classroomRes.find(r => r.startHour < (h + 1) && r.endHour > h);
      const t12Start = formatHour12(h);
      const t12End = formatHour12(h + 1);

      if (res) {
        slotsHtml += `
          <div class="slot-item busy" onclick="openModalById(${res.id})">
            <div>
              <strong>${t12Start} - ${t12End}</strong>: ${res.materia}
              <div style="font-size:0.75rem; color: var(--text-muted);">${res.profesor} (${res.dia})</div>
            </div>
            <span class="badge-faculty">${res.facultad}</span>
          </div>
        `;
      } else {
        slotsHtml += `
          <div class="slot-item free" onclick="openModalFreeSlot('${aula}', '${state.filters.day}', '${tStr}')">
            <strong>${t12Start} - ${t12End}</strong>
            <span><i class="fa-solid fa-circle-check"></i> DISPONIBLE</span>
          </div>
        `;
      }
    });

    card.innerHTML = `
      <div class="card-head">
        <h4>
          <span class="block-badge" title="Bloque ${blockCode}">${blockCode}</span>
          <i class="fa-solid fa-chalkboard"></i> Aula ${aula}
        </h4>
        <span class="occ-tag ${occClass}">${occPercent}% Ocupado</span>
      </div>
      <div class="slot-list">
        ${slotsHtml}
      </div>
    `;

    container.appendChild(card);
  });
}

// --- View 3: Data Table Render ---
function renderTableView() {
  const tbody = document.getElementById('dataTableBody');
  tbody.innerHTML = '';

  if (state.rawReservations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No hay datos cargados. Importa tu archivo Excel arriba.</td></tr>`;
    return;
  }

  if (state.filteredReservations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty-state">No se encontraron reservas con los filtros aplicados.</td></tr>`;
    return;
  }

  state.filteredReservations.forEach(r => {
    const blockCode = extractBlockFromClassroom(r.aula);
    const tr = document.createElement('tr');
    tr.style.cursor = 'pointer';
    tr.onclick = () => openModalReservation(r);

    tr.innerHTML = `
      <td>
        <span class="block-badge" title="Bloque ${blockCode}">${blockCode}</span>
        <strong>${r.aula}</strong>
      </td>
      <td>${r.fecha || 'N/A'}</td>
      <td>${r.dia}</td>
      <td>${r.horarioStr}</td>
      <td>${r.materia}</td>
      <td><code>${r.idMateria}</code></td>
      <td>${r.profesor}</td>
      <td>${r.nroidenti}</td>
      <td><span class="badge-faculty">${r.facultad}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

// --- Modal Windows ---
function openModalReservationList(resList, aula, tStr) {
  if (resList.length === 1) {
    openModalReservation(resList[0]);
    return;
  }

  const modal = document.getElementById('detailModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalBodyContent');

  title.innerHTML = `<i class="fa-solid fa-layer-group" style="color: var(--accent-purple);"></i> Reservas Encontradas (${resList.length})`;

  let listHtml = '';
  resList.forEach(res => {
    listHtml += `
      <div class="detail-row full-width" style="margin-bottom:8px;">
        <span class="label">${res.dia} | ${res.horarioStr}</span>
        <span class="val" style="color: var(--accent-cyan);">${res.materia} (ID: ${res.idMateria})</span>
        <span style="font-size:0.8rem; color: var(--text-muted);">Profesor: ${res.profesor} | ${res.facultad}</span>
      </div>
    `;
  });

  content.innerHTML = `
    <div style="font-size:0.85rem; color: var(--text-muted); margin-bottom:10px;">
      Espacio <strong>${aula}</strong> a las <strong>${tStr}</strong>:
    </div>
    <div class="detail-grid">
      ${listHtml}
    </div>
  `;

  modal.classList.add('active');
}

function openModalReservation(res) {
  const modal = document.getElementById('detailModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalBodyContent');
  const blockCode = extractBlockFromClassroom(res.aula);

  title.innerHTML = `<i class="fa-solid fa-bookmark" style="color: var(--status-occupied);"></i> Reserva Registrada`;

  content.innerHTML = `
    <div class="detail-grid">
      <div class="detail-row full-width">
        <span class="label">Materia / Asignatura (Columna R)</span>
        <span class="val">${res.materia}</span>
      </div>
      <div class="detail-row">
        <span class="label">ID Materia (Columna B)</span>
        <span class="val">${res.idMateria}</span>
      </div>
      <div class="detail-row">
        <span class="label">Profesor / Docente</span>
        <span class="val">${res.profesor}</span>
      </div>
      <div class="detail-row">
        <span class="label">Documento Docente</span>
        <span class="val">${res.nroidenti}</span>
      </div>
      <div class="detail-row">
        <span class="label">Aula / Salón</span>
        <span class="val"><span class="block-badge">${blockCode}</span> ${res.aula}</span>
      </div>
      <div class="detail-row">
        <span class="label">Día & Horario</span>
        <span class="val">${res.dia} - ${res.horarioStr}</span>
      </div>
      <div class="detail-row">
        <span class="label">Fecha (Columna S)</span>
        <span class="val">${res.fecha || 'N/A'}</span>
      </div>
      <div class="detail-row full-width">
        <span class="label">Facultad</span>
        <span class="val">${res.facultad}</span>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function openModalById(id) {
  const res = state.rawReservations.find(r => r.id === id);
  if (res) openModalReservation(res);
}

function openModalFreeSlot(aula, dia, tStr) {
  const modal = document.getElementById('detailModal');
  const title = document.getElementById('modalTitle');
  const content = document.getElementById('modalBodyContent');
  const blockCode = extractBlockFromClassroom(aula);

  const h = parseInt(tStr.split(':')[0], 10);
  const start12 = formatHour12(h);
  const end12 = formatHour12(h + 1);

  title.innerHTML = `<i class="fa-solid fa-circle-check" style="color: var(--status-available);"></i> Espacio Libre Confirmado`;

  content.innerHTML = `
    <div class="detail-grid">
      <div class="detail-row full-width">
        <span class="label">Estado del Espacio</span>
        <span class="val" style="color: var(--status-available);"><i class="fa-solid fa-check-double"></i> DISPONIBLE PARA RESERVAR</span>
      </div>
      <div class="detail-row">
        <span class="label">Aula / Salón</span>
        <span class="val"><span class="block-badge">${blockCode}</span> ${aula}</span>
      </div>
      <div class="detail-row">
        <span class="label">Día Seleccionado</span>
        <span class="val">${dia}</span>
      </div>
      <div class="detail-row full-width">
        <span class="label">Horario Libre</span>
        <span class="val">${start12} a ${end12}</span>
      </div>
    </div>
  `;

  modal.classList.add('active');
}

function closeModal() {
  document.getElementById('detailModal').classList.remove('active');
}

// --- View 4: Render Professor Schedule View ---
function renderScheduleView() {
  const profNameEl = document.getElementById('profScheduleName');
  const tbody = document.getElementById('scheduleBody');
  const btnExport = document.getElementById('btnExportPDF');

  const selectedProf = state.filters.profesor ? state.filters.profesor.trim() : '';

  if (state.rawReservations.length === 0) {
    if (profNameEl) profNameEl.textContent = 'No hay datos cargados';
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">
        <i class="fa-solid fa-file-excel" style="font-size: 38px; color: var(--accent-cyan); margin-bottom: 12px;"></i>
        <h3>No hay programación cargada</h3>
        <p>Importa tu archivo Excel arriba para consultar la matriz de horario por profesor.</p>
      </td></tr>`;
    }
    if (btnExport) btnExport.style.display = 'none';
    return;
  }

  if (!selectedProf) {
    if (profNameEl) profNameEl.textContent = 'Sin profesor seleccionado';
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state" style="padding: 40px 20px;">
        <i class="fa-solid fa-user-tie" style="font-size: 42px; color: var(--accent-cyan); margin-bottom: 12px;"></i>
        <h3 style="color: var(--text-main); font-size: 1.15rem; margin-bottom: 6px;">Ver Horario Completo del Profesor</h3>
        <p style="color: var(--text-muted); max-width: 520px; margin: 0 auto;">
          Escribe o selecciona el nombre de un profesor en el filtro <b>"Profesor / Docente"</b> para visualizar su rejilla semanal de clases (Lunes a Domingo) y poder exportarla en PDF.
        </p>
      </td></tr>`;
    }
    if (btnExport) btnExport.style.display = 'none';
    return;
  }

  // Filter reservations for this professor using accent-insensitive multi-word match
  const profReservations = state.rawReservations.filter(r => matchProfesor(r.profesor, selectedProf));

  const firstRes = profReservations[0];
  const fullName = firstRes ? firstRes.profesor : selectedProf;
  const docInfo = firstRes && firstRes.nroidenti !== 'N/A' ? ` (Doc: ${firstRes.nroidenti})` : '';

  if (profNameEl) {
    profNameEl.innerHTML = `<strong>${fullName}</strong>${docInfo} — Horario Semanal`;
  }

  if (btnExport) btnExport.style.display = 'inline-flex';

  if (profReservations.length === 0) {
    if (tbody) {
      tbody.innerHTML = `<tr><td colspan="8" class="empty-state">
        No se encontraron clases registradas para "${selectedProf}".
      </td></tr>`;
    }
    return;
  }

  const daysOfWeek = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];
  const activeHours = state.timeSlots.filter(t => {
    const h = parseInt(t.split(':')[0], 10);
    return h >= state.filters.startHour && h < state.filters.endHour;
  });

  if (!tbody) return;
  tbody.innerHTML = '';

  activeHours.forEach(tStr => {
    const h = parseInt(tStr.split(':')[0], 10);
    const tr = document.createElement('tr');

    const tdHora = document.createElement('td');
    tdHora.className = 'cell-hora';
    tdHora.innerHTML = `<strong>${formatHour12(h)}</strong><br><span style="font-size:0.7em; opacity:0.7;">a ${formatHour12(h+1)}</span>`;
    tr.appendChild(tdHora);

    daysOfWeek.forEach(day => {
      const td = document.createElement('td');
      const matches = profReservations.filter(r => 
        normalizeStr(r.dia) === normalizeStr(day) && r.startHour < (h + 1) && r.endHour > h
      );

      if (matches.length > 0) {
        td.className = 'schedule-cell busy';
        let cellHtml = '';
        matches.forEach(res => {
          const style = getFacultyStyle(res.facultad);
          const blockCode = extractBlockFromClassroom(res.aula);
          cellHtml += `
            <div class="sched-item-card" style="background:${style.bg}; border:1px solid ${style.border}; color:${style.text}; border-radius:5px; padding:4px 6px; margin-bottom:2px;">
              <div class="sched-mat-title">${res.materia}</div>
              <div class="sched-aula"><span class="block-badge">${blockCode}</span> ${res.aula}</div>
              <div class="sched-fac">${res.facultad}</div>
            </div>
          `;
        });
        td.innerHTML = cellHtml;
        td.onclick = () => openModalReservation(matches[0]);
      } else {
        td.className = 'schedule-cell free';
        td.innerHTML = `<span class="sched-free-text">-</span>`;
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
  });
}

// --- PDF Export Logic ---
function exportProfessorSchedulePDF() {
  const selectedProf = state.filters.profesor ? state.filters.profesor.trim() : '';
  if (!selectedProf) {
    alert('Por favor selecciona un profesor en el filtro antes de exportar el horario.');
    return;
  }

  if (typeof html2pdf === 'undefined') {
    alert('La librería html2pdf.js no se cargó correctamente. Revisa la conexión a internet o el archivo html.');
    return;
  }

  const element = document.getElementById('pdfPrintArea');
  const pdfHeader = document.getElementById('pdfExportHeader');
  const pdfTitle = document.getElementById('pdfProfTitle');
  const pdfSub = document.getElementById('pdfProfSub');

  const profReservations = state.rawReservations.filter(r => matchProfesor(r.profesor, selectedProf));
  const firstRes = profReservations[0];
  const fullName = firstRes ? firstRes.profesor : selectedProf;
  const docInfo = firstRes && firstRes.nroidenti !== 'N/A' ? ` (Doc: ${firstRes.nroidenti})` : '';

  if (pdfTitle) pdfTitle.textContent = `HORARIO DOCENTE: ${fullName.toUpperCase()}${docInfo}`;
  if (pdfSub) pdfSub.textContent = `Sistema de Gestión de Disponibilidad de Aulas | Generado el ${new Date().toLocaleDateString('es-CO')}`;

  if (pdfHeader) pdfHeader.style.display = 'block';

  const opt = {
    margin: [8, 8, 8, 8],
    filename: `Horario_${fullName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  html2pdf().set(opt).from(element).save().then(() => {
    if (pdfHeader) pdfHeader.style.display = 'none';
  }).catch(err => {
    console.error('Error generando PDF:', err);
    if (pdfHeader) pdfHeader.style.display = 'none';
    alert('Ocurrió un error al generar el PDF.');
  });
}

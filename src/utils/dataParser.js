/**
 * SISTEMA DE GESTIÓN Y DISPONIBILIDAD DE AULAS - DATA PARSER
 * Robust parsing for Excel (.xls, .xlsx, .csv), Google Sheets JSON, CSV and Apps Script APIs.
 */

import {
  parseTimeRange,
  normalizeDay,
  formatExcelDate,
  extractBlockFromClassroom
} from './scheduleHelper';

/**
 * Parses raw 2D array of rows (from Excel or Google Sheets values array)
 * Structure based on Principal.xls:
 * - Col B (index 1): ID de la materia
 * - Col L (index 11): nroidenti
 * - Col M (index 12): profesor
 * - Col N (index 13): dia
 * - Col O (index 14): horario
 * - Col P (index 15): aula
 * - Col Q (index 16): facultad
 * - Col R (index 17): materia (Nombre de la materia)
 * - Col S (index 18): fecha
 */
export function parseRowsArray(rows) {
  if (!Array.isArray(rows) || rows.length < 2) {
    return { reservations: [], error: 'El archivo o conjunto de datos no contiene suficientes filas.' };
  }

  // Detect header row index
  let headerRowIndex = 0;
  let colIndexes = {
    idMateria: 1,
    nroidenti: 11,
    profesor: 12,
    dia: 13,
    horario: 14,
    aula: 15,
    facultad: 16,
    materia: 17,
    fecha: 18
  };

  // Inspect first 12 rows to see if headers exist and identify columns by name dynamically
  for (let i = 0; i < Math.min(12, rows.length); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;
    const rowNormalized = row.map(c => String(c || '').toLowerCase().trim());
    const rowJoined = rowNormalized.join(' ');

    if (rowJoined.includes('materia') || rowJoined.includes('profesor') || rowJoined.includes('aula') || rowJoined.includes('horario') || rowJoined.includes('dia') || rowJoined.includes('facultad')) {
      headerRowIndex = i;

      // Detect column indices dynamically if available
      rowNormalized.forEach((h, colIdx) => {
        if (h === 'id' || h.includes('id_materia') || h.includes('id materia') || h.includes('codigo') || h.includes('código')) {
          colIndexes.idMateria = colIdx;
        } else if (h.includes('identi') || h.includes('documento') || h.includes('cedula') || h.includes('cédula') || h.includes('nroidenti')) {
          colIndexes.nroidenti = colIdx;
        } else if (h.includes('profesor') || h.includes('docente') || h.includes('instructor')) {
          colIndexes.profesor = colIdx;
        } else if (h === 'dia' || h === 'día' || h.includes('dia') || h.includes('día')) {
          colIndexes.dia = colIdx;
        } else if (h.includes('horario') || h.includes('hora')) {
          colIndexes.horario = colIdx;
        } else if (h.includes('aula') || h.includes('salon') || h.includes('salón') || h.includes('espacio')) {
          colIndexes.aula = colIdx;
        } else if (h.includes('facultad') || h.includes('departamento') || h.includes('programa')) {
          colIndexes.facultad = colIdx;
        } else if (h.includes('nombre') || (h.includes('materia') && colIdx !== colIndexes.idMateria) || h.includes('asignatura')) {
          colIndexes.materia = colIdx;
        } else if (h.includes('fecha') || h.includes('date')) {
          colIndexes.fecha = colIdx;
        }
      });
      break;
    }
  }

  const reservations = [];

  for (let i = headerRowIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const rawHorario = String(row[colIndexes.horario] !== undefined ? row[colIndexes.horario] : '').trim();
    let rawAula = String(row[colIndexes.aula] !== undefined ? row[colIndexes.aula] : '').trim().toUpperCase();
    const rawDia = String(row[colIndexes.dia] !== undefined ? row[colIndexes.dia] : '').trim().toUpperCase();

    // Skip empty lines
    if (!rawHorario && !rawAula && !rawDia) continue;
    if (!rawHorario || !rawDia) continue;

    if (!rawAula) rawAula = 'POR ASIGNAR';

    const timeRange = parseTimeRange(rawHorario);
    const materiaId = String(row[colIndexes.idMateria] !== undefined ? row[colIndexes.idMateria] : '').trim();
    let materiaNombre = String(row[colIndexes.materia] !== undefined ? row[colIndexes.materia] : '').trim();

    if (!materiaNombre) materiaNombre = materiaId || 'ASIGNATURA SIN NOMBRE';

    const rawFecha = row[colIndexes.fecha];
    const fechaFormatted = formatExcelDate(rawFecha);

    const resObj = {
      id: `res-${i}-${Math.random().toString(36).substr(2, 6)}`,
      rowIndex: i + 1,
      idMateria: materiaId || 'N/A',
      nroidenti: String(row[colIndexes.nroidenti] !== undefined ? row[colIndexes.nroidenti] : '').trim() || 'N/A',
      profesor: String(row[colIndexes.profesor] !== undefined ? row[colIndexes.profesor] : '').trim() || 'SIN DOCENTE ASIGNADO',
      dia: normalizeDay(rawDia),
      horarioStr: rawHorario,
      startHour: timeRange.startHour,
      endHour: timeRange.endHour,
      aula: rawAula,
      facultad: String(row[colIndexes.facultad] !== undefined ? row[colIndexes.facultad] : '').trim() || 'FACULTAD GENERAL',
      materia: materiaNombre,
      fecha: fechaFormatted
    };

    reservations.push(resObj);
  }

  return { reservations, error: null };
}

/**
 * Parses an array of JSON objects (e.g. returned by Google Apps Script or REST API)
 */
export function parseObjectsArray(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return { reservations: [], error: 'El servicio devolvió una lista vacía de elementos.' };
  }

  const reservations = [];

  items.forEach((item, idx) => {
    // Look for various common key names
    const rawHorario = String(item.horario || item.Horario || item.HORARIO || item.hora || item.Hora || item.rango_horario || '').trim();
    let rawAula = String(item.aula || item.Aula || item.AULA || item.salon || item.Salón || item.Salon || item.espacio || '').trim().toUpperCase();
    const rawDia = String(item.dia || item.Dia || item.DIA || item.día || item.Día || '').trim().toUpperCase();

    if (!rawHorario && !rawAula && !rawDia) return;
    if (!rawHorario || !rawDia) return;

    if (!rawAula) rawAula = 'POR ASIGNAR';

    const timeRange = parseTimeRange(rawHorario);
    const materiaId = String(item.idMateria || item.id_materia || item.id || item.codigo || item.Codigo || item.CODIGO || '').trim();
    let materiaNombre = String(item.materia || item.Materia || item.MATERIA || item.asignatura || item.Asignatura || item.nombre_materia || '').trim();

    if (!materiaNombre) materiaNombre = materiaId || 'ASIGNATURA SIN NOMBRE';

    const rawFecha = item.fecha || item.Fecha || item.FECHA || item.date || item.Date;
    const fechaFormatted = formatExcelDate(rawFecha);

    const resObj = {
      id: `sheet-${idx}-${Math.random().toString(36).substr(2, 6)}`,
      rowIndex: idx + 1,
      idMateria: materiaId || 'N/A',
      nroidenti: String(item.nroidenti || item.identificacion || item.documento || item.cedula || '').trim() || 'N/A',
      profesor: String(item.profesor || item.Profesor || item.PROFESOR || item.docente || item.Docente || '').trim() || 'SIN DOCENTE ASIGNADO',
      dia: normalizeDay(rawDia),
      horarioStr: rawHorario,
      startHour: timeRange.startHour,
      endHour: timeRange.endHour,
      aula: rawAula,
      facultad: String(item.facultad || item.Facultad || item.FACULTAD || item.departamento || '').trim() || 'FACULTAD GENERAL',
      materia: materiaNombre,
      fecha: fechaFormatted
    };

    reservations.push(resObj);
  });

  return { reservations, error: null };
}

/**
 * Parses raw CSV string into 2D rows
 */
export function parseCSV(csvText) {
  const lines = [];
  let row = [''];
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      row[row.length - 1] += '"';
      i++; // skip escaped quote
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if ((char === ',' || char === '\t') && !inQuotes) {
      row.push('');
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') i++; // Skip CRLF
      if (row.length > 1 || row[0] !== '') {
        lines.push(row);
      }
      row = [''];
    } else {
      row[row.length - 1] += char;
    }
  }

  if (row.length > 1 || row[0] !== '') {
    lines.push(row);
  }

  return parseRowsArray(lines);
}

/**
 * Extracts metadata (classrooms, blocks, faculties, teachers, subjects, dates) from reservations list
 */
export function extractMetadata(reservations) {
  const aulaSet = new Set();
  const facSet = new Set();
  const teacherSet = new Set();
  const subjectSet = new Set();
  const dateSet = new Set();
  const blockSet = new Set();

  reservations.forEach(r => {
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

  return {
    classrooms: Array.from(aulaSet).sort((a, b) => a.localeCompare(b, undefined, { numeric: true })),
    blocks: Array.from(blockSet).sort((a, b) => a.localeCompare(b)),
    faculties: Array.from(facSet).sort(),
    teachers: Array.from(teacherSet).sort(),
    subjects: Array.from(subjectSet).sort(),
    dates: Array.from(dateSet).sort((a, b) => {
      const pA = a.split('/');
      const pB = b.split('/');
      if (pA.length === 3 && pB.length === 3) {
        const keyA = `${pA[2]}${pA[1]}${pA[0]}`;
        const keyB = `${pB[2]}${pB[1]}${pB[0]}`;
        return keyA.localeCompare(keyB);
      }
      return a.localeCompare(b);
    })
  };
}

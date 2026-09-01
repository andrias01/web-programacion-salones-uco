/**
 * SISTEMA DE GESTIÓN Y DISPONIBILIDAD DE AULAS - SCHEDULE HELPER
 * Utility functions for times, days, faculty styles, strings & block extraction.
 */

export const TIME_SLOTS = [
  '07:00', '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00', '18:00',
  '19:00', '20:00', '21:00'
];

export const DAYS_OF_WEEK = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO'];

export const FACULTY_COLORS = [
  { bg: 'rgba(56, 189, 248, 0.22)', border: 'rgba(56, 189, 248, 0.5)', text: '#38bdf8' },
  { bg: 'rgba(168, 85, 247, 0.22)', border: 'rgba(168, 85, 247, 0.5)', text: '#c084fc' },
  { bg: 'rgba(251, 191, 36, 0.22)', border: 'rgba(251, 191, 36, 0.5)', text: '#fbbf24' },
  { bg: 'rgba(244, 114, 182, 0.22)', border: 'rgba(244, 114, 182, 0.5)', text: '#f472b6' },
  { bg: 'rgba(52, 211, 153, 0.22)', border: 'rgba(52, 211, 153, 0.5)', text: '#34d399' },
  { bg: 'rgba(249, 115, 22, 0.22)', border: 'rgba(249, 115, 22, 0.5)', text: '#f97316' },
  { bg: 'rgba(129, 140, 248, 0.22)', border: 'rgba(129, 140, 248, 0.5)', text: '#818cf8' },
  { bg: 'rgba(45, 212, 191, 0.22)', border: 'rgba(45, 212, 191, 0.5)', text: '#2dd4bf' }
];

const facultyColorMap = {};

/**
 * Assigns or retrieves a consistent color style per Faculty
 */
export function getFacultyStyle(facultad) {
  if (!facultad) return FACULTY_COLORS[0];
  const cleanFac = String(facultad).trim().toUpperCase();
  if (!facultyColorMap[cleanFac]) {
    const keys = Object.keys(facultyColorMap);
    const index = keys.length % FACULTY_COLORS.length;
    facultyColorMap[cleanFac] = FACULTY_COLORS[index];
  }
  return facultyColorMap[cleanFac];
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
export function extractBlockFromClassroom(aulaStr) {
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
export function normalizeStr(str) {
  if (!str) return '';
  return String(str)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Checks if target string contains all words in query string (accent & case insensitive)
 */
export function matchSearch(targetStr, queryStr) {
  if (!queryStr) return true;
  if (!targetStr) return false;
  const target = normalizeStr(targetStr);
  const words = normalizeStr(queryStr).split(' ').filter(w => w.length > 0);
  if (words.length === 0) return true;
  return words.every(w => target.includes(w));
}

/**
 * Formats hour to 12-hour format string with AM/PM guide
 * Example: 13 -> "13:00 (1:00 pm)", 7 -> "07:00 (7:00 am)", 22 -> "22:00 (10:00 pm)"
 */
export function formatHour12(hVal) {
  let h = typeof hVal === 'number' ? hVal : parseInt(String(hVal).split(':')[0], 10);
  if (isNaN(h)) return String(hVal);
  const period = h >= 12 ? 'pm' : 'am';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  const h24 = String(h).padStart(2, '0') + ':00';
  return `${h24} (${h12}:00 ${period})`;
}

/**
 * Returns Spanish day of week from formatted date string ("DD/MM/YYYY" or "YYYY-MM-DD")
 */
export function getDayOfWeekFromFormattedDate(dateStr) {
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

/**
 * Parses time ranges such as "06:00 A 07:00", "09:01 A 11:00", "14:00 A 16:00", "16:00 A 18:00"
 */
export function parseTimeRange(horarioStr) {
  let startHour = 6.0;
  let endHour = 7.0;

  if (!horarioStr) return { startHour, endHour };

  const clean = String(horarioStr).toUpperCase().replace(/\s+/g, ' ');
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

/**
 * Normalizes day name to standard Spanish day representation
 */
export function normalizeDay(dayStr) {
  if (!dayStr) return 'LUNES';
  const d = String(dayStr).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
export function formatExcelDate(val) {
  if (val === undefined || val === null || val === '') return 'N/A';
  if (typeof val === 'number') {
    if (typeof window !== 'undefined' && window.XLSX && window.XLSX.SSF) {
      try {
        const jsDate = window.XLSX.SSF.parse_date_code(val);
        if (jsDate && jsDate.d && jsDate.m && jsDate.y) {
          const d = String(jsDate.d).padStart(2, '0');
          const m = String(jsDate.m).padStart(2, '0');
          const y = jsDate.y;
          return `${d}/${m}/${y}`;
        }
      } catch (err) {
        // Fallback below
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

/**
 * Formats an hour number to a short 24h label. Example: 7 -> "07:00", 14 -> "14:00"
 */
export function formatHourShort(hVal) {
  const h = typeof hVal === 'number' ? hVal : parseInt(String(hVal).split(':')[0], 10);
  if (isNaN(h)) return String(hVal);
  return `${String(h).padStart(2, '0')}:00`;
}

/**
 * Formats an hour number to a compact 12h label. Example: 7 -> "7am", 14 -> "2pm"
 */
export function formatHourCompact(hVal) {
  const h = typeof hVal === 'number' ? hVal : parseInt(String(hVal).split(':')[0], 10);
  if (isNaN(h)) return String(hVal);
  const period = h >= 12 ? 'pm' : 'am';
  let h12 = h % 12;
  if (h12 === 0) h12 = 12;
  return `${h12}${period}`;
}

/**
 * Builds the hour-by-hour occupancy of a single classroom within [startHour, endHour).
 * Returns [{ hour, free, reservations }]
 */
export function buildSlotAvailability(reservations, aula, startHour, endHour) {
  const aulaUpper = String(aula).toUpperCase();
  const slots = [];

  for (let h = startHour; h < endHour; h++) {
    const matching = reservations.filter(r =>
      String(r.aula).toUpperCase() === aulaUpper &&
      r.startHour < (h + 1) &&
      r.endHour > h
    );
    slots.push({ hour: h, free: matching.length === 0, reservations: matching });
  }

  return slots;
}

/**
 * Merges consecutive hour slots with the same state into continuous bands ("franjas").
 * Returns [{ free, start, end, hours, reservations }]
 */
export function mergeSlotSegments(slots) {
  const segments = [];

  slots.forEach(slot => {
    const last = segments[segments.length - 1];

    if (last && last.free === slot.free && last.end === slot.hour) {
      last.end = slot.hour + 1;
      last.hours += 1;
      slot.reservations.forEach(r => {
        if (!last.reservations.some(x => x.id === r.id)) last.reservations.push(r);
      });
    } else {
      segments.push({
        free: slot.free,
        start: slot.hour,
        end: slot.hour + 1,
        hours: 1,
        reservations: [...slot.reservations]
      });
    }
  });

  return segments;
}

/**
 * Extracts only the free bands from a segment list, optionally filtering by minimum length in hours.
 */
export function getFreeBands(segments, minHours = 1) {
  return segments.filter(s => s.free && s.hours >= minHours);
}

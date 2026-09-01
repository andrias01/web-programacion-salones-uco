/**
 * SISTEMA DE GESTIÓN Y DISPONIBILIDAD DE AULAS - EXPORTACIÓN PDF DE FRANJAS
 *
 * Construye un documento propio en tema claro (no una captura de la interfaz oscura)
 * con la disponibilidad de los salones visibles según los filtros activos.
 */

import { formatHourShort } from './scheduleHelper';

const COLORS = {
  ink: '#0f172a',
  inkSoft: '#475569',
  inkFaint: '#94a3b8',
  line: '#e2e8f0',
  freeBg: '#6ee7b7',
  freeText: '#064e3b',
  freeSoft: '#d1fae5',
  busyBg: '#fda4af',
  busyText: '#7f1d1d',
  busySoft: '#ffe4e6'
};

function escapeHtml(value) {
  return String(value === undefined || value === null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Human readable summary of the filters that produced the report
 */
function buildFilterChips(filters, options) {
  const chips = [];

  chips.push(['Día', filters.day === 'TODOS' ? 'Todos los días' : filters.day]);
  chips.push(['Rango', `${formatHourShort(filters.startHour)} a ${formatHourShort(filters.endHour)}`]);
  if (filters.fecha) chips.push(['Fecha', filters.fecha]);
  if (filters.bloque) chips.push(['Bloque', filters.bloque]);
  if (filters.facultad) chips.push(['Facultad', filters.facultad]);
  if (filters.aula) chips.push(['Aula', filters.aula]);
  if (filters.profesor) chips.push(['Profesor', filters.profesor]);
  if (filters.materia) chips.push(['Materia', filters.materia]);
  if (options.minHours > 1) chips.push(['Franja mínima', `${options.minHours} horas continuas`]);
  if (options.onlyFullyFree) chips.push(['Filtro', 'Solo aulas 100% libres']);

  return chips
    .map(([label, value]) => `
      <span style="display:inline-block;border:1px solid ${COLORS.line};border-radius:20px;padding:3px 10px;margin:0 6px 6px 0;font-size:9.5px;color:${COLORS.inkSoft};background:#f8fafc;">
        <b style="color:${COLORS.ink};">${escapeHtml(label)}:</b> ${escapeHtml(value)}
      </span>`)
    .join('');
}

/**
 * Proportional availability bar for a single classroom
 */
function buildTrack(room, startHour, totalHours) {
  const segments = room.segments.map(seg => {
    const width = (seg.hours / totalHours) * 100;
    const bg = seg.free ? COLORS.freeBg : COLORS.busyBg;
    const color = seg.free ? COLORS.freeText : COLORS.busyText;
    const label = seg.hours >= 2
      ? `${formatHourShort(seg.start)}-${formatHourShort(seg.end)}`
      : `${seg.hours}h`;

    return `<div style="width:${width}%;background:${bg};color:${color};font-size:7.5px;font-weight:700;line-height:16px;text-align:center;overflow:hidden;white-space:nowrap;border-right:1px solid #ffffff;">${escapeHtml(label)}</div>`;
  }).join('');

  return `<div style="display:flex;width:100%;height:16px;border:1px solid ${COLORS.line};border-radius:3px;overflow:hidden;">${segments}</div>`;
}

/**
 * Hour ruler drawn once in the table header, aligned with every track
 */
function buildRuler(startHour, endHour, totalHours) {
  const ticks = [];
  for (let h = startHour; h <= endHour; h++) {
    const pct = ((h - startHour) / totalHours) * 100;
    const align = h === startHour
      ? 'left:0;text-align:left;'
      : h === endHour
        ? 'right:0;text-align:right;'
        : `left:${pct}%;transform:translateX(-50%);`;
    ticks.push(`<span style="position:absolute;${align}font-size:7px;font-weight:700;color:${COLORS.inkFaint};">${String(h).padStart(2, '0')}</span>`);
  }
  return `<div style="position:relative;height:10px;width:100%;">${ticks.join('')}</div>`;
}

/**
 * One table row per classroom
 */
function buildRoomRow(room, filters, totalHours, index) {
  const freeBands = room.segments.filter(s => s.free);
  const busySegments = room.segments.filter(s => !s.free);

  const bandsHtml = freeBands.length === 0
    ? `<span style="color:${COLORS.inkFaint};font-style:italic;">Sin franjas libres</span>`
    : freeBands.map(b => `
        <span style="display:inline-block;background:${COLORS.freeSoft};color:${COLORS.freeText};border:1px solid ${COLORS.freeBg};border-radius:3px;padding:1px 5px;margin:0 4px 3px 0;font-size:8.5px;font-weight:700;white-space:nowrap;">
          ${formatHourShort(b.start)} a ${formatHourShort(b.end)} · ${b.hours}h
        </span>`).join('');

  // Unique reservations inside the visible range, ordered by start time
  const seen = new Set();
  const occupancy = [];
  busySegments.forEach(seg => {
    seg.reservations.forEach(r => {
      if (seen.has(r.id)) return;
      seen.add(r.id);
      occupancy.push(r);
    });
  });
  occupancy.sort((a, b) => a.startHour - b.startHour);

  const occupancyHtml = occupancy.length === 0
    ? `<span style="color:${COLORS.freeText};font-weight:700;">Sin reservas en el rango</span>`
    : occupancy.map(r => `
        <div style="margin-bottom:2px;line-height:1.25;">
          <b style="color:${COLORS.busyText};">${escapeHtml(r.horarioStr || `${formatHourShort(r.startHour)} a ${formatHourShort(r.endHour)}`)}</b>
          ${filters.day === 'TODOS' ? `<span style="color:${COLORS.inkFaint};"> [${escapeHtml(String(r.dia).slice(0, 3))}]</span>` : ''}
          <span style="color:${COLORS.ink};"> ${escapeHtml(r.materia)}</span>
          <span style="color:${COLORS.inkSoft};"> — ${escapeHtml(r.profesor)}</span>
        </div>`).join('');

  const zebra = index % 2 === 1 ? 'background:#f8fafc;' : '';
  const pct = room.freePercent;
  const pctColor = pct >= 66 ? COLORS.freeText : pct >= 33 ? '#b45309' : COLORS.busyText;

  return `
    <tr style="${zebra}page-break-inside:avoid;">
      <td style="padding:5px 6px;border-bottom:1px solid ${COLORS.line};vertical-align:top;">
        <span style="display:inline-block;background:#e0f2fe;color:#0369a1;border-radius:3px;padding:1px 4px;font-size:7.5px;font-weight:700;">${escapeHtml(room.block)}</span>
      </td>
      <td style="padding:5px 6px;border-bottom:1px solid ${COLORS.line};vertical-align:top;font-weight:700;color:${COLORS.ink};font-size:10px;">
        ${escapeHtml(room.aula)}
      </td>
      <td style="padding:5px 6px;border-bottom:1px solid ${COLORS.line};vertical-align:top;text-align:center;">
        <div style="font-weight:700;color:${pctColor};font-size:11px;">${room.freeHours} h</div>
        <div style="font-size:8px;color:${COLORS.inkFaint};">${pct}% libre</div>
      </td>
      <td style="padding:5px 6px;border-bottom:1px solid ${COLORS.line};vertical-align:middle;">
        ${buildTrack(room, filters.startHour, totalHours)}
      </td>
      <td style="padding:5px 6px;border-bottom:1px solid ${COLORS.line};vertical-align:top;">
        ${bandsHtml}
      </td>
      <td style="padding:5px 6px;border-bottom:1px solid ${COLORS.line};vertical-align:top;font-size:8.5px;">
        ${occupancyHtml}
      </td>
    </tr>`;
}

/**
 * Full printable document
 */
export function buildAvailabilityReportHtml({ rooms, filters, options, summary }) {
  const totalHours = Math.max(1, filters.endHour - filters.startHour);
  const now = new Date();
  const generated = `${now.toLocaleDateString('es-CO')} a las ${now.toLocaleTimeString('es-CO')}`;
  const dayLabel = filters.day === 'TODOS' ? 'TODOS LOS DÍAS' : filters.day;

  const statBox = (value, label, color) => `
    <div style="flex:1;border:1px solid ${COLORS.line};border-radius:6px;padding:7px 10px;background:#f8fafc;">
      <div style="font-size:16px;font-weight:800;color:${color};line-height:1.1;">${escapeHtml(value)}</div>
      <div style="font-size:8.5px;color:${COLORS.inkSoft};text-transform:uppercase;letter-spacing:0.03em;margin-top:2px;">${escapeHtml(label)}</div>
    </div>`;

  const warning = filters.day === 'TODOS'
    ? `<div style="margin-top:8px;padding:6px 10px;border:1px solid #fcd34d;background:#fffbeb;border-radius:5px;font-size:9px;color:#92400e;">
         <b>Aviso:</b> el reporte cubre todos los días de la semana. Una franja aparece como libre únicamente si el aula está desocupada en todos los días.
       </div>`
    : '';

  return `
  <div style="width:1060px;padding:18px 20px;background:#ffffff;color:${COLORS.ink};font-family:'Plus Jakarta Sans','Segoe UI',Arial,sans-serif;">

    <!-- Encabezado -->
    <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #0ea5e9;padding-bottom:10px;">
      <div>
        <div style="font-size:19px;font-weight:800;letter-spacing:-0.02em;">REPORTE DE DISPONIBILIDAD DE AULAS</div>
        <div style="font-size:10px;color:${COLORS.inkSoft};margin-top:2px;">
          Franjas libres y ocupación por salón · Día: <b style="color:${COLORS.ink};">${escapeHtml(dayLabel)}</b>
          · Horario ${formatHourShort(filters.startHour)} a ${formatHourShort(filters.endHour)}
        </div>
      </div>
      <div style="text-align:right;font-size:9px;color:${COLORS.inkSoft};line-height:1.5;">
        <div style="font-weight:700;color:${COLORS.ink};">Programación Académica</div>
        <div>Generado el ${escapeHtml(generated)}</div>
      </div>
    </div>

    <!-- Resumen -->
    <div style="display:flex;gap:8px;margin-top:12px;">
      ${statBox(String(rooms.length), 'Aulas en el reporte', COLORS.ink)}
      ${statBox(String(summary.withBand), 'Aulas con franja libre', '#0369a1')}
      ${statBox(`${summary.totalFreeHours} h`, 'Horas libres totales', COLORS.freeText)}
      ${statBox(String(summary.fullyFree), 'Aulas libres todo el rango', COLORS.freeText)}
    </div>

    <!-- Filtros aplicados -->
    <div style="margin-top:11px;">
      <div style="font-size:8.5px;font-weight:700;color:${COLORS.inkFaint};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:5px;">Filtros aplicados</div>
      ${buildFilterChips(filters, options)}
    </div>

    ${warning}

    <!-- Tabla principal -->
    <table style="width:100%;border-collapse:collapse;margin-top:10px;font-size:9px;">
      <thead>
        <tr style="background:${COLORS.ink};color:#ffffff;">
          <th style="padding:6px;text-align:left;font-size:8.5px;width:42px;">BLOQUE</th>
          <th style="padding:6px;text-align:left;font-size:8.5px;width:95px;">AULA</th>
          <th style="padding:6px;text-align:center;font-size:8.5px;width:60px;">LIBRE</th>
          <th style="padding:6px 6px 3px;text-align:left;font-size:8.5px;width:275px;">
            LÍNEA DE TIEMPO
            ${buildRuler(filters.startHour, filters.endHour, totalHours)}
          </th>
          <th style="padding:6px;text-align:left;font-size:8.5px;width:215px;">FRANJAS DISPONIBLES</th>
          <th style="padding:6px;text-align:left;font-size:8.5px;">OCUPACIÓN (HORARIO · MATERIA · DOCENTE)</th>
        </tr>
      </thead>
      <tbody>
        ${rooms.map((room, i) => buildRoomRow(room, filters, totalHours, i)).join('')}
      </tbody>
    </table>

    <!-- Leyenda -->
    <div style="margin-top:10px;display:flex;align-items:center;gap:16px;font-size:8.5px;color:${COLORS.inkSoft};border-top:1px solid ${COLORS.line};padding-top:7px;">
      <span><span style="display:inline-block;width:11px;height:9px;background:${COLORS.freeBg};border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Disponible</span>
      <span><span style="display:inline-block;width:11px;height:9px;background:${COLORS.busyBg};border-radius:2px;vertical-align:middle;margin-right:4px;"></span>Ocupado</span>
      <span style="margin-left:auto;">Sistema de Gestión y Disponibilidad de Aulas · ${rooms.length} ${rooms.length === 1 ? 'aula listada' : 'aulas listadas'}</span>
    </div>
  </div>`;
}

/**
 * Renders the report off-screen and saves it as a PDF (A4 horizontal).
 * Falls back to a printable window when html2pdf is not available.
 */
export function exportAvailabilityPDF({ rooms, filters, options, summary, onDone, onError }) {
  if (!rooms || rooms.length === 0) {
    if (onError) onError('No hay aulas para exportar con los filtros actuales.');
    return;
  }

  const html = buildAvailabilityReportHtml({ rooms, filters, options, summary });
  const dayPart = filters.day === 'TODOS' ? 'TODOS' : filters.day;
  const datePart = new Date().toISOString().slice(0, 10);
  const filename = `Disponibilidad_${dayPart}_${datePart}.pdf`
    .normalize('NFD').replace(/[̀-ͯ]/g, '');

  // Sin html2pdf: ventana de impresión del navegador
  if (typeof window === 'undefined' || !window.html2pdf) {
    const win = window.open('', '_blank');
    if (!win) {
      if (onError) onError('El navegador bloqueó la ventana de impresión. Habilita las ventanas emergentes.');
      return;
    }
    win.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>${filename.replace('.pdf', '')}</title></head><body style="margin:0;">${html}</body></html>`);
    win.document.close();
    win.focus();
    win.print();
    if (onDone) onDone();
    return;
  }

  const holder = document.createElement('div');
  holder.style.position = 'fixed';
  holder.style.left = '-10000px';
  holder.style.top = '0';
  holder.style.background = '#ffffff';
  holder.innerHTML = html;
  document.body.appendChild(holder);

  const opt = {
    margin: [7, 7, 9, 7],
    filename,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
    pagebreak: { mode: ['css', 'legacy'], avoid: 'tr' }
  };

  window.html2pdf().set(opt).from(holder.firstElementChild).save()
    .then(() => {
      document.body.removeChild(holder);
      if (onDone) onDone();
    })
    .catch(err => {
      console.error('Error generando el PDF de disponibilidad:', err);
      if (holder.parentNode) document.body.removeChild(holder);
      if (onError) onError('Ocurrió un error al generar el PDF. Intenta con menos aulas o usa Imprimir (Ctrl+P).');
    });
}

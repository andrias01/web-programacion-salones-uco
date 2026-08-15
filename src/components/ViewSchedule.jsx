import React from 'react';
import {
  TIME_SLOTS,
  DAYS_OF_WEEK,
  formatHour12,
  normalizeStr,
  matchSearch,
  extractBlockFromClassroom,
  getFacultyStyle
} from '../utils/scheduleHelper';
import { exportProfessorSchedulePDF } from '../utils/pdfExport';

export function ViewSchedule({
  rawReservations = [],
  selectedProfesor = '',
  filters,
  onOpenReservation
}) {
  const activeHours = TIME_SLOTS.filter(t => {
    const h = parseInt(t.split(':')[0], 10);
    return h >= filters.startHour && h < filters.endHour;
  });

  const profQuery = selectedProfesor ? selectedProfesor.trim() : '';

  if (rawReservations.length === 0) {
    return (
      <div className="schedule-card">
        <div className="empty-state">
          <i className="fa-solid fa-file-excel" style={{ fontSize: '38px', color: 'var(--accent-cyan)', marginBottom: '12px' }}></i>
          <h3>No hay programación cargada</h3>
          <p>Importa tu archivo Excel o conecta Google Sheets para consultar la rejilla semanal de horarios por docente.</p>
        </div>
      </div>
    );
  }

  if (!profQuery) {
    return (
      <div className="schedule-card">
        <div className="empty-state" style={{ padding: '48px 24px' }}>
          <i className="fa-solid fa-user-tie" style={{ fontSize: '44px', color: 'var(--accent-cyan)', marginBottom: '14px' }}></i>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.2rem', marginBottom: '8px' }}>
            Visualizador de Horario Semanal Docente
          </h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '560px', margin: '0 auto', fontSize: '0.92rem' }}>
            Escribe o selecciona el nombre de un profesor en el filtro <b>"Profesor / Docente"</b> en la barra superior para generar automáticamente su horario semanal (Lunes a Domingo) y poder exportarlo en PDF listo para imprimir.
          </p>
        </div>
      </div>
    );
  }

  const profReservations = rawReservations.filter(r => matchSearch(r.profesor, profQuery));
  const firstRes = profReservations[0];
  const fullName = firstRes ? firstRes.profesor : profQuery;
  const docInfo = firstRes && firstRes.nroidenti && firstRes.nroidenti !== 'N/A' ? firstRes.nroidenti : '';

  const handleExportPDF = () => {
    exportProfessorSchedulePDF({
      professorName: fullName,
      docInfo: docInfo,
      elementId: 'pdfPrintArea'
    });
  };

  return (
    <div className="schedule-card">
      <div className="schedule-header-actions">
        <div className="prof-schedule-title">
          <i className="fa-solid fa-user-tie" style={{ color: 'var(--accent-cyan)' }}></i>
          <span>
            <strong>{fullName}</strong>
            {docInfo && <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>(Doc: {docInfo})</span>}
            {' '}— Horario Semanal
          </span>
        </div>

        {profReservations.length > 0 && (
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleExportPDF}
            title="Exportar este horario a PDF"
          >
            <i className="fa-solid fa-file-pdf"></i> Exportar Horario en PDF
          </button>
        )}
      </div>

      {profReservations.length === 0 ? (
        <div className="empty-state" style={{ padding: '30px' }}>
          <p>No se encontraron asignaciones registradas para "{profQuery}".</p>
        </div>
      ) : (
        <div className="table-responsive" id="pdfPrintArea">
          <div className="pdf-export-header" id="pdfExportHeader" style={{ display: 'none' }}>
            <h2 id="pdfProfTitle">HORARIO DE CLASES Y DISPONIBILIDAD DOCENTE</h2>
            <p id="pdfProfSub"></p>
          </div>

          <table className="schedule-table">
            <thead>
              <tr>
                <th className="col-hora">Horario</th>
                {DAYS_OF_WEEK.map(d => (
                  <th key={d}>{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {activeHours.map(tStr => {
                const h = parseInt(tStr.split(':')[0], 10);
                const t12Start = formatHour12(h);
                const t12End = formatHour12(h + 1);

                return (
                  <tr key={tStr}>
                    <td className="cell-hora">
                      <strong>{t12Start}</strong>
                      <br />
                      <span style={{ fontSize: '0.7em', opacity: 0.7 }}>a {t12End}</span>
                    </td>

                    {DAYS_OF_WEEK.map(day => {
                      const matches = profReservations.filter(r =>
                        normalizeStr(r.dia) === normalizeStr(day) &&
                        r.startHour < (h + 1) &&
                        r.endHour > h
                      );

                      if (matches.length > 0) {
                        return (
                          <td
                            key={day}
                            className="schedule-cell busy"
                            onClick={() => onOpenReservation(matches[0])}
                          >
                            {matches.map((res) => {
                              const style = getFacultyStyle(res.facultad);
                              const blockCode = extractBlockFromClassroom(res.aula);

                              return (
                                <div
                                  key={res.id}
                                  className="sched-item-card"
                                  style={{
                                    background: style.bg,
                                    border: `1px solid ${style.border}`,
                                    color: style.text,
                                    borderRadius: '5px',
                                    padding: '4px 6px',
                                    marginBottom: '3px'
                                  }}
                                  title={`${res.materia} - Aula ${res.aula}`}
                                >
                                  <div className="sched-mat-title">{res.materia}</div>
                                  <div className="sched-aula">
                                    <span className="block-badge">{blockCode}</span> {res.aula}
                                  </div>
                                  <div className="sched-fac">{res.facultad}</div>
                                </div>
                              );
                            })}
                          </td>
                        );
                      } else {
                        return (
                          <td key={day} className="schedule-cell free">
                            <span className="sched-free-text">-</span>
                          </td>
                        );
                      }
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

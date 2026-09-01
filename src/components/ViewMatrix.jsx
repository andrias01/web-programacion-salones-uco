import React from 'react';
import {
  TIME_SLOTS,
  formatHour12,
  extractBlockFromClassroom,
  getFacultyStyle
} from '../utils/scheduleHelper';

export function ViewMatrix({
  reservations = [],
  rawCount = 0,
  filteredClassrooms = [],
  filters,
  onOpenReservationList,
  onOpenFreeSlot,
  onOpenSheetsModal
}) {
  const activeHours = TIME_SLOTS.filter(t => {
    const h = parseInt(t.split(':')[0], 10);
    return h >= filters.startHour && h < filters.endHour;
  });

  if (rawCount === 0) {
    return (
      <div className="matrix-card">
        <div className="empty-state">
          <i className="fa-solid fa-file-excel" style={{ fontSize: '38px', color: 'var(--accent-cyan)', marginBottom: '12px' }}></i>
          <h3 style={{ color: 'var(--text-main)', fontSize: '1.1rem' }}>No hay programación cargada</h3>
          <p style={{ marginTop: '4px' }}>
            Haz clic en <b>"Conectar Google Sheets"</b> arriba o importa tu archivo Excel de programación para analizar la disponibilidad.
          </p>
          <button 
            type="button" 
            className="btn btn-primary" 
            style={{ marginTop: '14px' }}
            onClick={onOpenSheetsModal}
          >
            <i className="fa-solid fa-table"></i> Conectar Enlace de Google Sheets
          </button>
        </div>
      </div>
    );
  }

  if (filteredClassrooms.length === 0) {
    return (
      <div className="matrix-card">
        <div className="empty-state">
          <p>No se encontraron aulas con los filtros seleccionados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="matrix-card">
      <div className="table-responsive matrix-scroll">
        <table className="matrix-table">
          <thead>
            <tr>
              <th className="col-aula">
                <i className="fa-solid fa-door-open"></i> Aula / Espacio
              </th>
              {activeHours.map(tStr => {
                const h = parseInt(tStr.split(':')[0], 10);
                const start12 = formatHour12(h);
                const end12 = formatHour12(h + 1);
                return (
                  <th key={tStr}>
                    {start12}
                    <br />
                    <span style={{ fontSize: '0.7em', fontWeight: 'normal', opacity: 0.7 }}>
                      a {end12}
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {filteredClassrooms.map(aula => {
              const blockCode = extractBlockFromClassroom(aula);

              return (
                <tr key={aula}>
                  <td className="cell-aula">
                    <div className="aula-header-info">
                      <span className="block-badge" title={`Bloque ${blockCode}`}>{blockCode}</span>
                      <span className="aula-name"><i className="fa-solid fa-chalkboard"></i> {aula}</span>
                    </div>
                  </td>

                  {activeHours.map(tStr => {
                    const h = parseInt(tStr.split(':')[0], 10);
                    // Overlapping reservations in this hour
                    const matching = reservations.filter(r =>
                      r.aula.toUpperCase() === aula.toUpperCase() &&
                      r.startHour < (h + 1) &&
                      r.endHour > h
                    );

                    if (matching.length > 0) {
                      const first = matching[0];
                      const style = getFacultyStyle(first.facultad);
                      const dayTag = filters.day === 'TODOS' ? `[${first.dia.slice(0, 3)}] ` : '';

                      return (
                        <td
                          key={tStr}
                          className="matrix-cell occupied"
                          style={{
                            backgroundColor: style.bg,
                            borderColor: style.border,
                            color: style.text
                          }}
                          onClick={() => onOpenReservationList(matching, aula, tStr)}
                          title={`${first.materia} (${first.profesor})`}
                        >
                          <span className="cell-badge">{dayTag}{first.materia}</span>
                          <span className="cell-sub">{first.profesor}</span>
                          {matching.length > 1 && (
                            <span className="badge-multiple">+{matching.length - 1} más</span>
                          )}
                        </td>
                      );
                    } else {
                      // Free cell
                      return (
                        <td
                          key={tStr}
                          className="matrix-cell free"
                          onClick={() => onOpenFreeSlot(aula, filters.day, tStr)}
                          title={`Espacio libre en ${aula} a las ${tStr}`}
                        >
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                            <i className="fa-solid fa-check"></i> Libre
                          </span>
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
    </div>
  );
}

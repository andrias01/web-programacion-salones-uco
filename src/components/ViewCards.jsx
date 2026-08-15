import React from 'react';
import {
  TIME_SLOTS,
  formatHour12,
  extractBlockFromClassroom
} from '../utils/scheduleHelper';

export function ViewCards({
  reservations = [],
  rawCount = 0,
  filteredClassrooms = [],
  filters,
  onOpenReservation,
  onOpenFreeSlot
}) {
  const activeHours = TIME_SLOTS.filter(t => {
    const h = parseInt(t.split(':')[0], 10);
    return h >= filters.startHour && h < filters.endHour;
  });

  if (rawCount === 0) {
    return (
      <div className="classroom-cards-grid">
        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
          <i className="fa-solid fa-file-excel" style={{ fontSize: '38px', color: 'var(--accent-cyan)', marginBottom: '12px' }}></i>
          <h3>No hay programación cargada</h3>
          <p>Importa tu archivo Excel o conecta Google Sheets para ver el cronograma por aula.</p>
        </div>
      </div>
    );
  }

  if (filteredClassrooms.length === 0) {
    return (
      <div className="classroom-cards-grid">
        <div className="empty-state" style={{ gridColumn: '1 / -1' }}>
          <p>No se encontraron aulas con los filtros aplicados.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="classroom-cards-grid">
      {filteredClassrooms.map(aula => {
        const blockCode = extractBlockFromClassroom(aula);
        const classroomRes = reservations.filter(r => r.aula.toUpperCase() === aula.toUpperCase());

        const busySlots = activeHours.filter(tStr => {
          const h = parseInt(tStr.split(':')[0], 10);
          return classroomRes.some(r => r.startHour < (h + 1) && r.endHour > h);
        }).length;

        const occPercent = Math.round((busySlots / activeHours.length) * 100) || 0;
        let occClass = 'low';
        if (occPercent > 65) occClass = 'high';
        else if (occPercent > 35) occClass = 'med';

        return (
          <div key={aula} className="classroom-card">
            <div className="card-head">
              <h4>
                <span className="block-badge" title={`Bloque ${blockCode}`}>{blockCode}</span>
                <i className="fa-solid fa-chalkboard"></i> Aula {aula}
              </h4>
              <span className={`occ-tag ${occClass}`}>{occPercent}% Ocupado</span>
            </div>

            <div className="slot-list">
              {activeHours.map(tStr => {
                const h = parseInt(tStr.split(':')[0], 10);
                const res = classroomRes.find(r => r.startHour < (h + 1) && r.endHour > h);
                const t12Start = formatHour12(h);
                const t12End = formatHour12(h + 1);

                if (res) {
                  return (
                    <div
                      key={tStr}
                      className="slot-item busy"
                      onClick={() => onOpenReservation(res)}
                    >
                      <div>
                        <strong>{t12Start} - {t12End}</strong>: {res.materia}
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {res.profesor} ({res.dia})
                        </div>
                      </div>
                      <span className="badge-faculty">{res.facultad}</span>
                    </div>
                  );
                } else {
                  return (
                    <div
                      key={tStr}
                      className="slot-item free"
                      onClick={() => onOpenFreeSlot(aula, filters.day, tStr)}
                    >
                      <strong>{t12Start} - {t12End}</strong>
                      <span><i className="fa-solid fa-circle-check"></i> DISPONIBLE</span>
                    </div>
                  );
                }
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

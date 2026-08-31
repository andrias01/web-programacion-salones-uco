import React from 'react';
import { extractBlockFromClassroom, formatHour12 } from '../utils/scheduleHelper';

export function DetailModal({
  isOpen,
  onClose,
  data // { type: 'single' | 'list' | 'free' | 'freeBand', reservation, resList, aula, day, tStr, band }
}) {
  if (!isOpen || !data) return null;

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      onClose();
    }
  };

  return (
    <div className="modal-overlay active" onClick={handleOverlayClick}>
      <div className="modal-card">
        <div className="modal-header">
          {data.type === 'freeBand' ? (
            <h3 style={{ color: 'var(--status-available)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-bars-progress"></i> Franja Disponible
            </h3>
          ) : data.type === 'free' ? (
            <h3 style={{ color: 'var(--status-available)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-circle-check"></i> Espacio Libre Confirmado
            </h3>
          ) : data.type === 'list' ? (
            <h3 style={{ color: 'var(--accent-purple)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-layer-group"></i> Reservas Encontradas ({data.resList?.length || 0})
            </h3>
          ) : (
            <h3 style={{ color: 'var(--status-occupied)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <i className="fa-solid fa-bookmark"></i> Detalle de Reserva
            </h3>
          )}
          <button className="modal-close" onClick={onClose} type="button">&times;</button>
        </div>

        <div className="modal-body">
          {/* Continuous Free Band Modal */}
          {data.type === 'freeBand' && data.band && (
            <div className="detail-grid">
              <div className="detail-row full-width">
                <span className="label">Estado del Espacio</span>
                <span className="val" style={{ color: 'var(--status-available)' }}>
                  <i className="fa-solid fa-check-double"></i> LIBRE DE FORMA CONTINUA ({data.band.hours} {data.band.hours === 1 ? 'HORA' : 'HORAS'})
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Aula / Salón</span>
                <span className="val">
                  <span className="block-badge">{extractBlockFromClassroom(data.aula)}</span> {data.aula}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Día Seleccionado</span>
                <span className="val">{data.day === 'TODOS' ? 'Todos los días' : (data.day || 'LUNES')}</span>
              </div>
              <div className="detail-row full-width">
                <span className="label">Franja Libre</span>
                <span className="val">
                  {formatHour12(data.band.start)} a {formatHour12(data.band.end)}
                </span>
              </div>
              <div className="detail-row full-width">
                <span className="label">Bloques de 1 hora incluidos</span>
                <span className="val" style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  {Array.from({ length: data.band.hours }, (_, i) => {
                    const h = data.band.start + i;
                    return `${String(h).padStart(2, '0')}:00 - ${String(h + 1).padStart(2, '0')}:00`;
                  }).join('  ·  ')}
                </span>
              </div>
            </div>
          )}

          {/* Free Slot Modal */}
          {data.type === 'free' && (
            <div className="detail-grid">
              <div className="detail-row full-width">
                <span className="label">Estado del Espacio</span>
                <span className="val" style={{ color: 'var(--status-available)' }}>
                  <i className="fa-solid fa-check-double"></i> DISPONIBLE PARA RESERVAR
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Aula / Salón</span>
                <span className="val">
                  <span className="block-badge">{extractBlockFromClassroom(data.aula)}</span> {data.aula}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Día Seleccionado</span>
                <span className="val">{data.day || 'LUNES'}</span>
              </div>
              <div className="detail-row full-width">
                <span className="label">Horario Libre</span>
                <span className="val">
                  {(() => {
                    const h = parseInt(String(data.tStr).split(':')[0], 10);
                    return `${formatHour12(h)} a ${formatHour12(h + 1)}`;
                  })()}
                </span>
              </div>
            </div>
          )}

          {/* Overlapping List Modal */}
          {data.type === 'list' && (
            <div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Espacio <strong>{data.aula}</strong> a las <strong>{data.tStr}</strong>:
              </div>
              <div className="detail-grid">
                {(data.resList || []).map((res) => (
                  <div key={res.id} className="detail-row full-width" style={{ marginBottom: '8px' }}>
                    <span className="label">{res.dia} | {res.horarioStr}</span>
                    <span className="val" style={{ color: 'var(--accent-cyan)' }}>
                      {res.materia} <small>(ID: {res.idMateria})</small>
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Profesor: {res.profesor} | {res.facultad}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Single Reservation Modal */}
          {data.type === 'single' && data.reservation && (
            <div className="detail-grid">
              <div className="detail-row full-width">
                <span className="label">Materia / Asignatura</span>
                <span className="val">{data.reservation.materia}</span>
              </div>
              <div className="detail-row">
                <span className="label">ID Materia (Código)</span>
                <span className="val">{data.reservation.idMateria}</span>
              </div>
              <div className="detail-row">
                <span className="label">Profesor / Docente</span>
                <span className="val">{data.reservation.profesor}</span>
              </div>
              <div className="detail-row">
                <span className="label">Documento Docente</span>
                <span className="val">{data.reservation.nroidenti}</span>
              </div>
              <div className="detail-row">
                <span className="label">Aula / Salón</span>
                <span className="val">
                  <span className="block-badge">{extractBlockFromClassroom(data.reservation.aula)}</span> {data.reservation.aula}
                </span>
              </div>
              <div className="detail-row">
                <span className="label">Día & Horario</span>
                <span className="val">{data.reservation.dia} - {data.reservation.horarioStr}</span>
              </div>
              <div className="detail-row">
                <span className="label">Fecha</span>
                <span className="val">{data.reservation.fecha || 'N/A'}</span>
              </div>
              <div className="detail-row full-width">
                <span className="label">Facultad / Unidad Académica</span>
                <span className="val">{data.reservation.facultad}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

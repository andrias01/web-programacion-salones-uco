import React, { useState } from 'react';
import { extractBlockFromClassroom } from '../utils/scheduleHelper';

export function ViewTable({
  reservations = [],
  rawCount = 0,
  onOpenReservation
}) {
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  if (rawCount === 0) {
    return (
      <div className="table-view-container">
        <div className="empty-state">
          <i className="fa-solid fa-table-list" style={{ fontSize: '38px', color: 'var(--accent-cyan)', marginBottom: '12px' }}></i>
          <h3>No hay datos cargados</h3>
          <p>Importa tu archivo Excel o conecta Google Sheets para visualizar la lista completa de reservas.</p>
        </div>
      </div>
    );
  }

  if (reservations.length === 0) {
    return (
      <div className="table-view-container">
        <div className="empty-state">
          <p>No se encontraron reservas con los filtros aplicados.</p>
        </div>
      </div>
    );
  }

  const totalPages = Math.ceil(reservations.length / pageSize);
  const displayedReservations = reservations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="table-view-container">
      <div className="table-meta-bar">
        <span>Mostrando <strong>{displayedReservations.length}</strong> de <strong>{reservations.length}</strong> reservas filtradas</span>
        {totalPages > 1 && (
          <div className="table-pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            >
              <i className="fa-solid fa-chevron-left"></i> Anterior
            </button>
            <span className="page-indicator">Página {currentPage} de {totalPages}</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            >
              Siguiente <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        )}
      </div>

      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th>Aula</th>
              <th>Fecha</th>
              <th>Día</th>
              <th>Horario</th>
              <th>Materia</th>
              <th>ID Materia</th>
              <th>Profesor</th>
              <th>Doc. Docente</th>
              <th>Facultad</th>
            </tr>
          </thead>
          <tbody>
            {displayedReservations.map(r => {
              const blockCode = extractBlockFromClassroom(r.aula);
              return (
                <tr
                  key={r.id}
                  onClick={() => onOpenReservation(r)}
                  style={{ cursor: 'pointer' }}
                  title="Haz clic para ver todos los detalles"
                >
                  <td>
                    <span className="block-badge" title={`Bloque ${blockCode}`}>{blockCode}</span>
                    <strong>{r.aula}</strong>
                  </td>
                  <td>{r.fecha || 'N/A'}</td>
                  <td>{r.dia}</td>
                  <td>{r.horarioStr}</td>
                  <td>{r.materia}</td>
                  <td><code>{r.idMateria}</code></td>
                  <td>{r.profesor}</td>
                  <td>{r.nroidenti}</td>
                  <td><span className="badge-faculty">{r.facultad}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

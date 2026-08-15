import React from 'react';

export function StatsGrid({ totalClassrooms, totalReservations, freeSlotsCount, totalFaculties }) {
  return (
    <div className="stats-grid">
      <div className="stat-card">
        <div className="stat-icon" style={{ color: 'var(--accent-cyan)' }}>
          <i className="fa-solid fa-door-open"></i>
        </div>
        <div className="stat-info">
          <div className="stat-value">{totalClassrooms}</div>
          <div className="stat-label">Aulas Detectadas</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ color: 'var(--accent-purple)' }}>
          <i className="fa-solid fa-book-bookmark"></i>
        </div>
        <div className="stat-info">
          <div className="stat-value">{totalReservations}</div>
          <div className="stat-label">Reservas Registradas</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ color: 'var(--status-available)' }}>
          <i className="fa-solid fa-circle-check"></i>
        </div>
        <div className="stat-info">
          <div className="stat-value">{freeSlotsCount}</div>
          <div className="stat-label">Espacios Libres (Filtro)</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon" style={{ color: 'var(--accent-pink)' }}>
          <i className="fa-solid fa-graduation-cap"></i>
        </div>
        <div className="stat-info">
          <div className="stat-value">{totalFaculties}</div>
          <div className="stat-label">Facultades</div>
        </div>
      </div>
    </div>
  );
}

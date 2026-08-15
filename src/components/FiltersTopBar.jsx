import React from 'react';
import { extractBlockFromClassroom, getDayOfWeekFromFormattedDate } from '../utils/scheduleHelper';

export function FiltersTopBar({
  filters,
  onFilterChange,
  onClearFilters,
  dates = [],
  blocks = [],
  faculties = [],
  classrooms = [],
  teachers = [],
  subjects = [],
  onSwitchView
}) {
  const days = ['LUNES', 'MARTES', 'MIÉRCOLES', 'JUEVES', 'VIERNES', 'SÁBADO', 'DOMINGO', 'TODOS'];

  const handleDayClick = (day) => {
    onFilterChange('day', day);
  };

  const handleDateChange = (e) => {
    const selectedDate = e.target.value;
    onFilterChange('fecha', selectedDate);

    if (selectedDate) {
      const dayOfWeek = getDayOfWeekFromFormattedDate(selectedDate);
      if (dayOfWeek) {
        onFilterChange('day', dayOfWeek);
      }
    }
    if (onSwitchView) onSwitchView('matrix');
  };

  const handleProfesorChange = (val) => {
    onFilterChange('profesor', val);
    if (val && val.trim().length > 1 && onSwitchView) {
      onSwitchView('schedule');
    }
  };

  // Filter classrooms by active block if selected
  const availableClassrooms = filters.bloque
    ? classrooms.filter(c => extractBlockFromClassroom(c) === filters.bloque)
    : classrooms;

  return (
    <section className="filters-topbar">
      {/* Row 1: Day Selector and Clear Filters */}
      <div className="topbar-row-1">
        <div className="filter-group-day">
          <label><i className="fa-regular fa-calendar-check"></i> Día de la Semana:</label>
          <div className="day-selector">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                className={`day-btn ${filters.day === d ? 'active' : ''}`}
                onClick={() => handleDayClick(d)}
              >
                {d === 'TODOS' ? 'TODOS LOS DÍAS' : d}
              </button>
            ))}
          </div>
        </div>

        <button type="button" className="btn-clear" onClick={onClearFilters}>
          <i className="fa-solid fa-filter-circle-xmark"></i> Limpiar Filtros
        </button>
      </div>

      {/* Row 2: Detailed Inputs & Dynamic Dropdowns */}
      <div className="topbar-row-2">
        {/* Fecha */}
        <div className="filter-group">
          <label htmlFor="filterFecha"><i className="fa-regular fa-calendar-days"></i> Fecha</label>
          <select
            id="filterFecha"
            className="input-control"
            value={filters.fecha || ''}
            onChange={handleDateChange}
          >
            <option value="">Todas las Fechas</option>
            {dates.map(date => (
              <option key={date} value={date}>{date}</option>
            ))}
          </select>
        </div>

        {/* Bloque */}
        <div className="filter-group">
          <label htmlFor="filterBloque"><i className="fa-solid fa-cubes"></i> Bloque</label>
          <select
            id="filterBloque"
            className="input-control"
            value={filters.bloque || ''}
            onChange={(e) => onFilterChange('bloque', e.target.value)}
          >
            <option value="">Todos los Bloques</option>
            {blocks.map(b => (
              <option key={b} value={b}>Bloque {b}</option>
            ))}
          </select>
        </div>

        {/* Facultad */}
        <div className="filter-group">
          <label htmlFor="filterFacultad"><i className="fa-solid fa-building-columns"></i> Facultad</label>
          <div className="search-input-wrapper">
            <input
              type="text"
              id="filterFacultad"
              list="dlFacultad"
              className="input-control search-input"
              placeholder="Todas las Facultades..."
              value={filters.facultad || ''}
              onChange={(e) => onFilterChange('facultad', e.target.value)}
              autoComplete="off"
            />
            <datalist id="dlFacultad">
              {faculties.map(fac => <option key={fac} value={fac} />)}
            </datalist>
            {filters.facultad && (
              <button
                type="button"
                className="btn-clear-input"
                onClick={() => onFilterChange('facultad', '')}
                title="Limpiar campo"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Salón / Aula */}
        <div className="filter-group">
          <label htmlFor="filterAula"><i className="fa-solid fa-chalkboard-user"></i> Salón / Aula</label>
          <div className="search-input-wrapper">
            <input
              type="text"
              id="filterAula"
              list="dlAula"
              className="input-control search-input"
              placeholder="Buscar Salón (ej: CO201, E1)..."
              value={filters.aula || ''}
              onChange={(e) => onFilterChange('aula', e.target.value)}
              autoComplete="off"
            />
            <datalist id="dlAula">
              {availableClassrooms.map(aula => <option key={aula} value={aula} />)}
            </datalist>
            {filters.aula && (
              <button
                type="button"
                className="btn-clear-input"
                onClick={() => onFilterChange('aula', '')}
                title="Limpiar campo"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Profesor / Docente */}
        <div className="filter-group">
          <label htmlFor="filterProfesor"><i className="fa-solid fa-user-tie"></i> Profesor / Docente</label>
          <div className="search-input-wrapper">
            <input
              type="text"
              id="filterProfesor"
              list="dlProfesor"
              className="input-control search-input"
              placeholder="Buscar Profesor..."
              value={filters.profesor || ''}
              onChange={(e) => handleProfesorChange(e.target.value)}
              autoComplete="off"
            />
            <datalist id="dlProfesor">
              {teachers.map(teacher => <option key={teacher} value={teacher} />)}
            </datalist>
            {filters.profesor && (
              <button
                type="button"
                className="btn-clear-input"
                onClick={() => onFilterChange('profesor', '')}
                title="Limpiar campo"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Materia / Asignatura */}
        <div className="filter-group">
          <label htmlFor="filterMateria"><i className="fa-solid fa-book"></i> Materia / Asignatura</label>
          <div className="search-input-wrapper">
            <input
              type="text"
              id="filterMateria"
              list="dlMateria"
              className="input-control search-input"
              placeholder="Todas las Materias..."
              value={filters.materia || ''}
              onChange={(e) => onFilterChange('materia', e.target.value)}
              autoComplete="off"
            />
            <datalist id="dlMateria">
              {subjects.map(subject => <option key={subject} value={subject} />)}
            </datalist>
            {filters.materia && (
              <button
                type="button"
                className="btn-clear-input"
                onClick={() => onFilterChange('materia', '')}
                title="Limpiar campo"
              >
                &times;
              </button>
            )}
          </div>
        </div>

        {/* Rango Horario */}
        <div className="filter-group">
          <label><i className="fa-solid fa-clock"></i> Rango Horario</label>
          <div className="time-range-row">
            <select
              id="filterHoraInicio"
              className="input-control"
              value={`${String(filters.startHour).padStart(2, '0')}:00`}
              onChange={(e) => onFilterChange('startHour', parseInt(e.target.value.split(':')[0], 10))}
            >
              {[7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22].map(h => {
                const h24 = `${String(h).padStart(2, '0')}:00`;
                const h12 = h % 12 === 0 ? 12 : h % 12;
                const period = h >= 12 ? 'pm' : 'am';
                return <option key={h} value={h24}>{h24} ({h12}:00 {period})</option>;
              })}
            </select>
            <span style={{ color: 'var(--text-muted)' }}>a</span>
            <select
              id="filterHoraFin"
              className="input-control"
              value={`${String(filters.endHour).padStart(2, '0')}:00`}
              onChange={(e) => onFilterChange('endHour', parseInt(e.target.value.split(':')[0], 10))}
            >
              {[23, 22, 21, 20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9, 8].map(h => {
                const h24 = `${String(h).padStart(2, '0')}:00`;
                const h12 = h % 12 === 0 ? 12 : h % 12;
                const period = h >= 12 ? 'pm' : 'am';
                return <option key={h} value={h24}>{h24} ({h12}:00 {period})</option>;
              })}
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

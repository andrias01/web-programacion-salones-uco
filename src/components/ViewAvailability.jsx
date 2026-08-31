import React, { useMemo, useState } from 'react';
import {
  formatHourShort,
  formatHourCompact,
  formatHour12,
  extractBlockFromClassroom,
  buildSlotAvailability,
  mergeSlotSegments,
  getFreeBands
} from '../utils/scheduleHelper';

const MIN_DURATION_OPTIONS = [
  { value: 1, label: 'Cualquier franja' },
  { value: 2, label: 'Mínimo 2 horas' },
  { value: 3, label: 'Mínimo 3 horas' },
  { value: 4, label: 'Mínimo 4 horas' }
];

const SORT_OPTIONS = [
  { value: 'free-desc', label: 'Más horas libres' },
  { value: 'band-desc', label: 'Franja libre más larga' },
  { value: 'name', label: 'Nombre de aula (A-Z)' }
];

export function ViewAvailability({
  reservations = [],
  rawCount = 0,
  filteredClassrooms = [],
  filters,
  onOpenFreeBand,
  onOpenReservationList
}) {
  const [minHours, setMinHours] = useState(1);
  const [sortBy, setSortBy] = useState('free-desc');
  const [onlyFullyFree, setOnlyFullyFree] = useState(false);

  const totalHours = Math.max(0, filters.endHour - filters.startHour);

  // Availability model per classroom
  const availability = useMemo(() => {
    return filteredClassrooms.map(aula => {
      const slots = buildSlotAvailability(reservations, aula, filters.startHour, filters.endHour);
      const segments = mergeSlotSegments(slots);
      const freeBands = segments.filter(s => s.free);
      const freeHours = freeBands.reduce((acc, b) => acc + b.hours, 0);
      const longestBand = freeBands.reduce((max, b) => Math.max(max, b.hours), 0);

      return {
        aula,
        block: extractBlockFromClassroom(aula),
        segments,
        freeHours,
        longestBand,
        busyHours: totalHours - freeHours,
        freePercent: totalHours > 0 ? Math.round((freeHours / totalHours) * 100) : 0
      };
    });
  }, [filteredClassrooms, reservations, filters.startHour, filters.endHour, totalHours]);

  // Apply view-local filters and ordering
  const visibleRooms = useMemo(() => {
    let list = availability.filter(room => getFreeBands(room.segments, minHours).length > 0);

    if (onlyFullyFree) {
      list = list.filter(room => room.busyHours === 0);
    }

    const sorted = [...list];
    if (sortBy === 'free-desc') {
      sorted.sort((a, b) => b.freeHours - a.freeHours || a.aula.localeCompare(b.aula, undefined, { numeric: true }));
    } else if (sortBy === 'band-desc') {
      sorted.sort((a, b) => b.longestBand - a.longestBand || a.aula.localeCompare(b.aula, undefined, { numeric: true }));
    } else {
      sorted.sort((a, b) => a.aula.localeCompare(b.aula, undefined, { numeric: true }));
    }

    return sorted;
  }, [availability, minHours, onlyFullyFree, sortBy]);

  // Global summary of the current selection
  const summary = useMemo(() => {
    const totalFreeHours = availability.reduce((acc, r) => acc + r.freeHours, 0);
    const fullyFree = availability.filter(r => r.busyHours === 0).length;
    const withBand = availability.filter(r => getFreeBands(r.segments, minHours).length > 0).length;
    return { totalFreeHours, fullyFree, withBand };
  }, [availability, minHours]);

  // Hour ruler ticks
  const ticks = useMemo(() => {
    const list = [];
    for (let h = filters.startHour; h <= filters.endHour; h++) list.push(h);
    return list;
  }, [filters.startHour, filters.endHour]);

  if (rawCount === 0) {
    return (
      <div className="availability-panel">
        <div className="empty-state">
          <i className="fa-solid fa-clock" style={{ fontSize: '38px', color: 'var(--status-available)', marginBottom: '12px' }}></i>
          <h3>No hay programación cargada</h3>
          <p>Importa tu archivo Excel o conecta Google Sheets para ver las franjas de disponibilidad.</p>
        </div>
      </div>
    );
  }

  if (totalHours <= 0) {
    return (
      <div className="availability-panel">
        <div className="empty-state">
          <p>El rango horario seleccionado no es válido. Ajusta la hora de inicio y fin en los filtros.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="availability-panel">
      {/* View toolbar: summary metrics + local controls */}
      <div className="availability-toolbar">
        <div className="avail-summary">
          <span className="avail-chip-stat">
            <i className="fa-solid fa-door-open"></i> {summary.withBand} de {availability.length} aulas con franja libre
          </span>
          <span className="avail-chip-stat">
            <i className="fa-solid fa-hourglass-half"></i> {summary.totalFreeHours} h libres en total
          </span>
          <span className="avail-chip-stat">
            <i className="fa-solid fa-star"></i> {summary.fullyFree} aulas libres todo el rango
          </span>
        </div>

        <div className="avail-controls">
          <div className="avail-control">
            <label htmlFor="availMinHours">Duración</label>
            <select
              id="availMinHours"
              className="input-control"
              value={minHours}
              onChange={(e) => setMinHours(parseInt(e.target.value, 10))}
            >
              {MIN_DURATION_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <div className="avail-control">
            <label htmlFor="availSort">Ordenar por</label>
            <select
              id="availSort"
              className="input-control"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          <label className="avail-toggle">
            <input
              type="checkbox"
              checked={onlyFullyFree}
              onChange={(e) => setOnlyFullyFree(e.target.checked)}
            />
            <span>Solo aulas 100% libres</span>
          </label>
        </div>
      </div>

      {/* Context note: which day the bands belong to */}
      <div className={`avail-scope-note ${filters.day === 'TODOS' ? 'warn' : ''}`}>
        <i className={`fa-solid ${filters.day === 'TODOS' ? 'fa-triangle-exclamation' : 'fa-calendar-day'}`}></i>
        {filters.day === 'TODOS' ? (
          <span>
            Estás viendo <b>todos los días</b>: una franja aparece libre solo si el aula está desocupada
            en <b>todos</b> los días de la semana. Selecciona un día para ver la disponibilidad real de esa jornada.
          </span>
        ) : (
          <span>
            Franjas libres del día <b>{filters.day}</b> entre {formatHourShort(filters.startHour)} y {formatHourShort(filters.endHour)}
            {filters.fecha ? <> · Fecha <b>{filters.fecha}</b></> : null}
          </span>
        )}
      </div>

      {/* Hour ruler shared by every track */}
      <div className="avail-ruler">
        <div className="avail-ruler-spacer"></div>
        <div className="avail-ruler-track">
          {ticks.map(h => (
            <span
              key={h}
              className="avail-tick"
              style={{ left: `${((h - filters.startHour) / totalHours) * 100}%` }}
            >
              {formatHourCompact(h)}
            </span>
          ))}
        </div>
      </div>

      {/* Classroom rows */}
      {visibleRooms.length === 0 ? (
        <div className="empty-state">
          <p>
            Ninguna aula tiene franjas libres
            {minHours > 1 ? ` de ${minHours} horas o más` : ''} con los filtros actuales.
          </p>
        </div>
      ) : (
        <div className="avail-rows">
          {visibleRooms.map(room => {
            const highlightBands = getFreeBands(room.segments, minHours);

            return (
              <div key={room.aula} className="avail-row">
                {/* Classroom identity + occupancy summary */}
                <div className="avail-room">
                  <div className="avail-room-name">
                    <span className="block-badge" title={`Bloque ${room.block}`}>{room.block}</span>
                    <span><i className="fa-solid fa-chalkboard"></i> {room.aula}</span>
                  </div>
                  <div className="avail-room-meta">
                    <span className="avail-free-tag">{room.freeHours} h libres</span>
                    <span className="avail-percent">{room.freePercent}% disponible</span>
                  </div>
                </div>

                {/* Visual availability band */}
                <div className="avail-track">
                  {room.segments.map(seg => {
                    const width = (seg.hours / totalHours) * 100;
                    const label = `${formatHourShort(seg.start)} - ${formatHourShort(seg.end)}`;

                    if (seg.free) {
                      return (
                        <button
                          key={`${room.aula}-${seg.start}`}
                          type="button"
                          className={`avail-seg free ${seg.hours >= minHours ? 'match' : 'dim'}`}
                          style={{ width: `${width}%` }}
                          title={`${room.aula} libre de ${formatHour12(seg.start)} a ${formatHour12(seg.end)} (${seg.hours} h)`}
                          onClick={() => onOpenFreeBand(room.aula, filters.day, seg)}
                        >
                          <span className="avail-seg-label">{seg.hours >= 2 ? label : `${seg.hours}h`}</span>
                        </button>
                      );
                    }

                    const first = seg.reservations[0];
                    return (
                      <button
                        key={`${room.aula}-${seg.start}`}
                        type="button"
                        className="avail-seg busy"
                        style={{ width: `${width}%` }}
                        title={`${label} · ${first ? `${first.materia} (${first.profesor})` : 'Ocupado'}`}
                        onClick={() => onOpenReservationList(seg.reservations, room.aula, formatHourShort(seg.start))}
                      >
                        <span className="avail-seg-label">{seg.hours >= 2 && first ? first.materia : ''}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Free bands as readable chips */}
                <div className="avail-bands">
                  {highlightBands.length === 0 ? (
                    <span className="avail-band-empty">Sin franjas de {minHours} h o más</span>
                  ) : (
                    highlightBands.map(band => (
                      <button
                        key={`chip-${room.aula}-${band.start}`}
                        type="button"
                        className="avail-band-chip"
                        onClick={() => onOpenFreeBand(room.aula, filters.day, band)}
                        title={`Ver detalle de la franja libre en ${room.aula}`}
                      >
                        <i className="fa-solid fa-circle-check"></i>
                        {formatHourShort(band.start)} a {formatHourShort(band.end)}
                        <span className="avail-band-dur">{band.hours}h</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

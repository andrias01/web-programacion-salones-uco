import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { GoogleSheetsModal } from './components/GoogleSheetsModal';
import { DropZoneBanner } from './components/DropZoneBanner';
import { StatsGrid } from './components/StatsGrid';
import { FiltersTopBar } from './components/FiltersTopBar';
import { ViewMatrix } from './components/ViewMatrix';
import { ViewAvailability } from './components/ViewAvailability';
import { ViewCards } from './components/ViewCards';
import { ViewTable } from './components/ViewTable';
import { ViewSchedule } from './components/ViewSchedule';
import { DetailModal } from './components/DetailModal';

import {
  TIME_SLOTS,
  matchSearch,
  normalizeStr,
  extractBlockFromClassroom
} from './utils/scheduleHelper';

import {
  parseRowsArray,
  extractMetadata
} from './utils/dataParser';

import {
  fetchGoogleSheetsData,
  getSavedSheetsConfig,
  saveSheetsConfig,
  saveLastSyncTime,
  saveCachedReservations,
  getCachedReservations
} from './utils/googleSheetsApi';

import { copyTextToClipboard } from './utils/clipboard';
import { SOURCE_LINK } from './config/appConfig';

import { SAMPLE_RESERVATIONS } from './data/sampleData';

export function App() {
  // Application Data State
  const [rawReservations, setRawReservations] = useState([]);
  const [dataSource, setDataSource] = useState('none'); // 'none' | 'sheets' | 'excel' | 'sample'
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(null);

  // Google Sheets Config State
  const [sheetsUrl, setSheetsUrl] = useState('');
  const [autoSyncMinutes, setAutoSyncMinutes] = useState(0);
  const [isSheetsModalOpen, setIsSheetsModalOpen] = useState(false);

  // Active View Tab
  const [activeView, setActiveView] = useState('matrix'); // 'matrix' | 'availability' | 'cards' | 'table' | 'schedule'

  // Filter State
  const [filters, setFilters] = useState({
    day: 'LUNES',
    fecha: '',
    bloque: '',
    facultad: '',
    aula: '',
    profesor: '',
    materia: '',
    startHour: 7,
    endHour: 22
  });

  // Modal State
  const [modalState, setModalState] = useState({
    isOpen: false,
    data: null
  });

  // Toast Notification State
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => (prev?.message === message ? null : prev));
    }, 4000);
  };

  // Copies the hidden data-source link (triggered from the header logo)
  const handleCopySourceLink = async () => {
    const copied = await copyTextToClipboard(SOURCE_LINK);
    showToast(
      copied ? 'Enlace copiado al portapapeles' : 'No se pudo copiar el enlace en este navegador',
      copied ? 'success' : 'error'
    );
    return copied;
  };

  // Sync from Google Sheets
  const syncWithGoogleSheets = useCallback(async (urlToFetch) => {
    const targetUrl = urlToFetch || sheetsUrl;
    if (!targetUrl) return;

    setIsSyncing(true);
    try {
      const result = await fetchGoogleSheetsData(targetUrl);
      if (result.error) {
        showToast(result.error, 'error');
      } else if (result.reservations && result.reservations.length > 0) {
        setRawReservations(result.reservations);
        setDataSource('sheets');
        const syncTime = saveLastSyncTime();
        setLastSyncTime(syncTime);
        saveCachedReservations(result.reservations);
        showToast(`Sincronizado con Google Sheets (${result.reservations.length} registros cargados)`, 'success');
      } else {
        showToast('No se encontraron registros en Google Sheets.', 'info');
      }
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Error al sincronizar con Google Sheets', 'error');
    } finally {
      setIsSyncing(false);
    }
  }, [sheetsUrl]);

  // Initial Load from LocalStorage & Cached Data
  useEffect(() => {
    const savedConfig = getSavedSheetsConfig();
    if (savedConfig.url) {
      setSheetsUrl(savedConfig.url);
      setAutoSyncMinutes(savedConfig.autoSyncMinutes || 0);
      setLastSyncTime(savedConfig.lastSync);

      // Load cached reservations first for instant UI response
      const cached = getCachedReservations();
      if (cached && cached.length > 0) {
        setRawReservations(cached);
        setDataSource('sheets');
      }

      // Then fetch live updates
      syncWithGoogleSheets(savedConfig.url);
    } else {
      // If no config, provide sample data for immediate interactive demo
      setRawReservations(SAMPLE_RESERVATIONS);
      setDataSource('sample');
    }
  }, []);

  // Periodic Auto-Sync Timer
  useEffect(() => {
    if (!sheetsUrl || autoSyncMinutes <= 0) return;

    const intervalMs = autoSyncMinutes * 60 * 1000;
    const timer = setInterval(() => {
      syncWithGoogleSheets();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [sheetsUrl, autoSyncMinutes, syncWithGoogleSheets]);

  // Handle Local Excel File (.xls, .xlsx, .csv)
  const handleExcelUpload = (file) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const XLSX = window.XLSX;
        if (!XLSX) {
          showToast('La biblioteca de Excel (SheetJS) no está disponible en la ventana.', 'error');
          return;
        }

        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const sheetJson = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

        if (!sheetJson || sheetJson.length === 0) {
          showToast('El archivo Excel está vacío o no se pudo leer.', 'error');
          return;
        }

        const result = parseRowsArray(sheetJson);
        if (result.error) {
          showToast(result.error, 'error');
        } else {
          setRawReservations(result.reservations);
          setDataSource('excel');
          showToast(`Archivo "${file.name}" cargado exitosamente (${result.reservations.length} reservas)`, 'success');
        }
      } catch (err) {
        console.error('Error parsing Excel:', err);
        showToast('Error al leer el archivo Excel. Verifica el formato (.xls, .xlsx, .csv).', 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // Google Sheets Config Save
  const handleSaveSheetsConfig = (url, syncInterval) => {
    setSheetsUrl(url);
    setAutoSyncMinutes(syncInterval);
    saveSheetsConfig(url, syncInterval);
    setIsSheetsModalOpen(false);
    syncWithGoogleSheets(url);
  };

  // Google Sheets Disconnect
  const handleDisconnectSheets = () => {
    setSheetsUrl('');
    setAutoSyncMinutes(0);
    saveSheetsConfig('', 0);
    setDataSource('none');
    setRawReservations([]);
    setIsSheetsModalOpen(false);
    showToast('Google Sheets desconectado.', 'info');
  };

  // Metadata extraction (classrooms, blocks, faculties, teachers, subjects, dates)
  const metadata = useMemo(() => {
    return extractMetadata(rawReservations);
  }, [rawReservations]);

  // Filter Handlers
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleClearFilters = () => {
    setFilters({
      day: 'LUNES',
      fecha: '',
      bloque: '',
      facultad: '',
      aula: '',
      profesor: '',
      materia: '',
      startHour: 7,
      endHour: 22
    });
  };

  // Filtered Classrooms list (respects Bloque and Aula search)
  const filteredClassrooms = useMemo(() => {
    let list = metadata.classrooms;

    if (filters.bloque) {
      list = list.filter(c => extractBlockFromClassroom(c) === filters.bloque);
    }

    if (filters.aula) {
      const search = filters.aula.trim().toUpperCase();
      list = list.filter(c => c.toUpperCase().includes(search));
    }

    return list;
  }, [metadata.classrooms, filters.bloque, filters.aula]);

  // Filtered Reservations List
  const filteredReservations = useMemo(() => {
    const { day, fecha, bloque, facultad, aula, profesor, materia, startHour, endHour } = filters;

    return rawReservations.filter(r => {
      // Day filter
      if (day !== 'TODOS' && r.dia !== day) return false;

      // Date filter
      if (fecha && r.fecha && r.fecha !== 'N/A' && r.fecha !== fecha) return false;

      // Block filter
      if (bloque) {
        const rBlock = extractBlockFromClassroom(r.aula);
        if (rBlock !== bloque) return false;
      }

      // Faculty filter (live match)
      if (facultad && !matchSearch(r.facultad, facultad)) return false;

      // Classroom filter
      if (aula && !normalizeStr(r.aula).includes(normalizeStr(aula))) return false;

      // Teacher filter (multi-word match)
      if (profesor && !matchSearch(r.profesor, profesor)) return false;

      // Subject filter
      if (materia && !matchSearch(r.materia, materia)) return false;

      // Hour range filter
      if (r.endHour <= startHour || r.startHour >= endHour) return false;

      return true;
    });
  }, [rawReservations, filters]);

  // Count available free slots
  const freeSlotsCount = useMemo(() => {
    const hoursToRender = TIME_SLOTS.filter(t => {
      const h = parseInt(t.split(':')[0], 10);
      return h >= filters.startHour && h < filters.endHour;
    });

    let freeCount = 0;
    filteredClassrooms.forEach(c => {
      hoursToRender.forEach(tStr => {
        const h = parseInt(tStr.split(':')[0], 10);
        const isOccupied = filteredReservations.some(r =>
          r.aula.toUpperCase() === c.toUpperCase() &&
          r.startHour < (h + 1) &&
          r.endHour > h
        );
        if (!isOccupied) freeCount++;
      });
    });

    return freeCount;
  }, [filteredClassrooms, filteredReservations, filters.startHour, filters.endHour]);

  // Modal Handlers
  const handleOpenReservation = (reservation) => {
    setModalState({
      isOpen: true,
      data: { type: 'single', reservation }
    });
  };

  const handleOpenReservationList = (resList, aula, tStr) => {
    if (resList.length === 1) {
      handleOpenReservation(resList[0]);
    } else {
      setModalState({
        isOpen: true,
        data: { type: 'list', resList, aula, tStr }
      });
    }
  };

  const handleOpenFreeSlot = (aula, day, tStr) => {
    setModalState({
      isOpen: true,
      data: { type: 'free', aula, day, tStr }
    });
  };

  const handleOpenFreeBand = (aula, day, band) => {
    setModalState({
      isOpen: true,
      data: { type: 'freeBand', aula, day, band }
    });
  };

  const handleCloseModal = () => {
    setModalState({ isOpen: false, data: null });
  };

  return (
    <div className="app-container">
      {/* App Header */}
      <Header
        dataSource={dataSource}
        isSyncing={isSyncing}
        lastSyncTime={lastSyncTime}
        onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
        onSyncNow={() => syncWithGoogleSheets()}
        onFileUpload={handleExcelUpload}
        onCopySourceLink={handleCopySourceLink}
      />

      {/* Drag and Drop Zone */}
      <DropZoneBanner
        onFileUpload={handleExcelUpload}
        loadedCount={rawReservations.length}
      />

      {/* Quick Metrics */}
      <StatsGrid
        totalClassrooms={metadata.classrooms.length}
        totalReservations={rawReservations.length}
        freeSlotsCount={freeSlotsCount}
        totalFaculties={metadata.faculties.length}
      />

      {/* Top Filter Bar */}
      <FiltersTopBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onClearFilters={handleClearFilters}
        dates={metadata.dates}
        blocks={metadata.blocks}
        faculties={metadata.faculties}
        classrooms={metadata.classrooms}
        teachers={metadata.teachers}
        subjects={metadata.subjects}
        onSwitchView={setActiveView}
      />

      {/* Main Workspace Section */}
      <main className="workspace-panel">
        {/* Workspace View Tabs & Legend */}
        <div className="workspace-toolbar">
          <div className="view-tabs">
            <button
              type="button"
              className={`tab-btn ${activeView === 'matrix' ? 'active' : ''}`}
              onClick={() => setActiveView('matrix')}
            >
              <i className="fa-solid fa-table-cells"></i> Matriz de Disponibilidad
            </button>
            <button
              type="button"
              className={`tab-btn ${activeView === 'availability' ? 'active' : ''}`}
              onClick={() => setActiveView('availability')}
            >
              <i className="fa-solid fa-bars-progress"></i> Franjas Disponibles
            </button>
            <button
              type="button"
              className={`tab-btn ${activeView === 'cards' ? 'active' : ''}`}
              onClick={() => setActiveView('cards')}
            >
              <i className="fa-solid fa-border-all"></i> Cronograma por Aula
            </button>
            <button
              type="button"
              className={`tab-btn ${activeView === 'table' ? 'active' : ''}`}
              onClick={() => setActiveView('table')}
            >
              <i className="fa-solid fa-list"></i> Lista de Reservas
            </button>
            <button
              type="button"
              className={`tab-btn ${activeView === 'schedule' ? 'active' : ''}`}
              onClick={() => setActiveView('schedule')}
            >
              <i className="fa-solid fa-calendar-week"></i> Horario Profesor
            </button>
          </div>

          <div className="view-options">
            <div className="legend-item">
              <span className="legend-dot available"></span> Disponible
            </div>
            <div className="legend-item">
              <span className="legend-dot occupied"></span> Ocupado
            </div>
          </div>
        </div>

        {/* Dynamic Active View */}
        {activeView === 'matrix' && (
          <ViewMatrix
            reservations={filteredReservations}
            rawCount={rawReservations.length}
            filteredClassrooms={filteredClassrooms}
            filters={filters}
            onOpenReservationList={handleOpenReservationList}
            onOpenFreeSlot={handleOpenFreeSlot}
            onOpenSheetsModal={() => setIsSheetsModalOpen(true)}
          />
        )}

        {activeView === 'availability' && (
          <ViewAvailability
            reservations={filteredReservations}
            rawCount={rawReservations.length}
            filteredClassrooms={filteredClassrooms}
            filters={filters}
            onOpenFreeBand={handleOpenFreeBand}
            onOpenReservationList={handleOpenReservationList}
            onNotify={showToast}
          />
        )}

        {activeView === 'cards' && (
          <ViewCards
            reservations={filteredReservations}
            rawCount={rawReservations.length}
            filteredClassrooms={filteredClassrooms}
            filters={filters}
            onOpenReservation={handleOpenReservation}
            onOpenFreeSlot={handleOpenFreeSlot}
          />
        )}

        {activeView === 'table' && (
          <ViewTable
            reservations={filteredReservations}
            rawCount={rawReservations.length}
            onOpenReservation={handleOpenReservation}
          />
        )}

        {activeView === 'schedule' && (
          <ViewSchedule
            rawReservations={rawReservations}
            selectedProfesor={filters.profesor}
            filters={filters}
            onOpenReservation={handleOpenReservation}
          />
        )}
      </main>

      {/* Google Sheets Modal */}
      <GoogleSheetsModal
        isOpen={isSheetsModalOpen}
        onClose={() => setIsSheetsModalOpen(false)}
        currentUrl={sheetsUrl}
        currentAutoSync={autoSyncMinutes}
        onSaveConfig={handleSaveSheetsConfig}
        onDisconnect={handleDisconnectSheets}
        isSyncing={isSyncing}
      />

      {/* Detail Modal */}
      <DetailModal
        isOpen={modalState.isOpen}
        onClose={handleCloseModal}
        data={modalState.data}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}>
            <i className={`fa-solid ${toast.type === 'success' ? 'fa-circle-check' : toast.type === 'error' ? 'fa-triangle-exclamation' : 'fa-circle-info'}`}></i>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

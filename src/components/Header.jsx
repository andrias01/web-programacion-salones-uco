import React from 'react';

export function Header({
  dataSource,
  isSyncing,
  lastSyncTime,
  onOpenSheetsModal,
  onSyncNow,
  onFileUpload,
  onCopySourceLink
}) {
  const fileInputRef = React.useRef(null);
  const [justCopied, setJustCopied] = React.useState(false);

  const handleBrandClick = async () => {
    if (!onCopySourceLink) return;
    const copied = await onCopySourceLink();
    if (copied) {
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1600);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <header className="app-header">
      <div className="brand">
        <button
          type="button"
          className={`brand-icon brand-icon-btn ${justCopied ? 'copied' : ''}`}
          onClick={handleBrandClick}
          title="Copiar enlace"
          aria-label="Copiar enlace de la fuente de datos"
        >
          <i className={`fa-solid ${justCopied ? 'fa-check' : 'fa-calendar-days'}`}></i>
        </button>
        <div className="brand-title">
          <h1>Disponibilidad de Aulas</h1>
          <p>Analizador y Gestor de Programación de Reservas Académicas</p>
        </div>
      </div>

      <div className="header-actions">
        {/* Source status indicator */}
        <div className="source-status-badge">
          {isSyncing ? (
            <span className="badge-status syncing">
              <i className="fa-solid fa-rotate fa-spin"></i> Sincronizando...
            </span>
          ) : dataSource === 'sheets' ? (
            <span className="badge-status online" title={`Última sincronización: ${lastSyncTime || 'Reciente'}`}>
              <i className="fa-solid fa-cloud-check"></i> Google Sheets Conectado
              {lastSyncTime && <small className="sync-time">({lastSyncTime})</small>}
            </span>
          ) : dataSource === 'excel' ? (
            <span className="badge-status local">
              <i className="fa-solid fa-file-excel"></i> Archivo Excel Local
            </span>
          ) : (
            <span className="badge-status none">
              <i className="fa-solid fa-circle-info"></i> Sin Fuente de Datos
            </span>
          )}
        </div>

        {/* Sync Now button if Google Sheets is connected */}
        {dataSource === 'sheets' && (
          <button 
            type="button" 
            className="btn btn-secondary btn-icon" 
            onClick={onSyncNow}
            disabled={isSyncing}
            title="Actualizar datos desde Google Sheets ahora"
          >
            <i className={`fa-solid fa-rotate ${isSyncing ? 'fa-spin' : ''}`}></i>
            <span className="btn-label-desktop">Actualizar</span>
          </button>
        )}

        {/* Connect Google Sheets button */}
        <button 
          type="button" 
          className={`btn ${dataSource === 'sheets' ? 'btn-secondary' : 'btn-sheets'}`}
          onClick={onOpenSheetsModal}
          title="Configurar conexión con Google Sheets API"
        >
          <i className="fa-solid fa-table"></i>
          <span>{dataSource === 'sheets' ? 'Configurar Sheets' : 'Conectar Google Sheets'}</span>
        </button>

        {/* Local File Upload button */}
        <div className="file-upload-wrapper">
          <button 
            type="button" 
            className="btn btn-primary" 
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
          >
            <i className="fa-solid fa-file-excel"></i>
            <span>Importar Excel (.xls / .xlsx)</span>
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xls,.xlsx,.csv" 
            style={{ display: 'none' }}
          />
        </div>
      </div>
    </header>
  );
}

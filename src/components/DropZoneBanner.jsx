import React, { useState, useRef } from 'react';

export function DropZoneBanner({ onFileUpload, loadedCount = 0 }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileUpload(e.target.files[0]);
    }
  };

  return (
    <div
      className={`drop-zone-banner ${isDragOver ? 'dragover' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current && fileInputRef.current.click()}
      title="Arrastra o haz clic para cargar un archivo Excel de programación"
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleInputChange}
        accept=".xls,.xlsx,.csv"
        style={{ display: 'none' }}
      />
      <div className="drop-icon">
        <i className="fa-solid fa-cloud-arrow-up"></i>
      </div>
      <div>
        <h3>Selecciona o arrastra aquí tu archivo Excel de Programación</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginTop: '2px' }}>
          Soporta archivos <b>.xls</b>, <b>.xlsx</b> y <b>.csv</b> (como <code>Principal.xls</code>). Los datos se procesan de inmediato.
          {loadedCount > 0 && (
            <span style={{ color: 'var(--status-available)', marginLeft: '8px', fontWeight: '600' }}>
              <i className="fa-solid fa-circle-check"></i> ({loadedCount} registros activos)
            </span>
          )}
        </p>
      </div>
    </div>
  );
}

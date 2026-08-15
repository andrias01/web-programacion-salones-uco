import React, { useState, useEffect } from 'react';

export function GoogleSheetsModal({
  isOpen,
  onClose,
  currentUrl,
  currentAutoSync,
  onSaveConfig,
  onDisconnect,
  isSyncing
}) {
  const [url, setUrl] = useState(currentUrl || '');
  const [autoSync, setAutoSync] = useState(currentAutoSync || 0);
  const [activeTab, setActiveTab] = useState('config'); // 'config' | 'guide'

  useEffect(() => {
    setUrl(currentUrl || '');
    setAutoSync(currentAutoSync || 0);
  }, [currentUrl, currentAutoSync, isOpen]);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    if (!url.trim()) {
      alert('Por favor ingresa una URL de Google Sheets o Apps Script.');
      return;
    }
    onSaveConfig(url.trim(), Number(autoSync));
  };

  return (
    <div className="modal-overlay active" onClick={(e) => e.target.classList.contains('modal-overlay') && onClose()}>
      <div className="modal-card modal-large">
        <div className="modal-header">
          <div className="modal-title-group">
            <i className="fa-solid fa-cloud-arrow-down" style={{ color: 'var(--accent-cyan)' }}></i>
            <h3>Conexión con Google Sheets API</h3>
          </div>
          <button className="modal-close" onClick={onClose} type="button">&times;</button>
        </div>

        <div className="modal-tabs">
          <button 
            type="button" 
            className={`modal-tab-btn ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <i className="fa-solid fa-sliders"></i> Configuración de Enlace
          </button>
          <button 
            type="button" 
            className={`modal-tab-btn ${activeTab === 'guide' ? 'active' : ''}`}
            onClick={() => setActiveTab('guide')}
          >
            <i className="fa-solid fa-circle-question"></i> Guía & Estructura de Columnas
          </button>
        </div>

        <div className="modal-body">
          {activeTab === 'config' ? (
            <form onSubmit={handleSave} className="sheets-config-form">
              <div className="form-group">
                <label htmlFor="sheetsUrl">
                  <i className="fa-solid fa-link"></i> Enlace de Google Sheets o Endpoint de API:
                </label>
                <input
                  type="text"
                  id="sheetsUrl"
                  className="input-control"
                  placeholder="https://docs.google.com/spreadsheets/d/... o https://script.google.com/macros/s/.../exec"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  autoComplete="off"
                />
                <small className="form-hint">
                  Puedes pegar el enlace de tu hoja de Google Sheets pública/compartida o el enlace de tu Web App de Google Apps Script.
                </small>
              </div>

              <div className="form-group">
                <label htmlFor="autoSyncSelect">
                  <i className="fa-solid fa-arrows-rotate"></i> Sincronización Automática en Segundo Plano:
                </label>
                <select
                  id="autoSyncSelect"
                  className="input-control"
                  value={autoSync}
                  onChange={(e) => setAutoSync(Number(e.target.value))}
                >
                  <option value={0}>Desactivada (Solo sincronización manual)</option>
                  <option value={2}>Cada 2 minutos</option>
                  <option value={5}>Cada 5 minutos (Recomendado)</option>
                  <option value={15}>Cada 15 minutos</option>
                  <option value={30}>Cada 30 minutos</option>
                </select>
                <small className="form-hint">
                  La aplicación consultará la hoja de cálculo periódicamente para mantener la disponibilidad actualizada en tiempo real.
                </small>
              </div>

              <div className="sheets-info-box">
                <i className="fa-solid fa-shield-halved"></i>
                <div>
                  <strong>Almacenamiento Local Seguro:</strong>
                  <p>La URL y la configuración se guardan en el almacenamiento local de tu navegador (localStorage) para que cada vez que ingreses a Netlify se carguen automáticamente los datos actualizados.</p>
                </div>
              </div>

              <div className="modal-actions-footer">
                {currentUrl && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-danger-hover"
                    onClick={onDisconnect}
                    style={{ marginRight: 'auto' }}
                  >
                    <i className="fa-solid fa-link-slash"></i> Desconectar Sheets
                  </button>
                )}
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSyncing}>
                  {isSyncing ? (
                    <>
                      <i className="fa-solid fa-spinner fa-spin"></i> Conectando...
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-cloud-check"></i> Guardar y Sincronizar
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <div className="sheets-guide-content">
              <div className="guide-card">
                <h4><i className="fa-solid fa-bolt" style={{ color: 'var(--accent-cyan)' }}></i> Opción 1: Enlace Público de Google Sheets (Rápido)</h4>
                <ol>
                  <li>Abre tu hoja de cálculo en <strong>Google Sheets</strong>.</li>
                  <li>Haz clic en el botón verde <strong>Compartir</strong> (arriba a la derecha).</li>
                  <li>En <em>Acceso general</em>, selecciona <strong>"Cualquier persona con el enlace"</strong> (como Lector).</li>
                  <li>Copia el enlace y pégalo en el campo de configuración de esta app.</li>
                </ol>
              </div>

              <div className="guide-card">
                <h4><i className="fa-solid fa-code" style={{ color: 'var(--accent-purple)' }}></i> Opción 2: Google Apps Script Web App (API JSON)</h4>
                <p>Para crear una API que entregue los datos en formato JSON:</p>
                <ol>
                  <li>En tu Google Sheet, ve a <strong>Extensiones &gt; Apps Script</strong>.</li>
                  <li>Pega el siguiente código:
                    <pre className="code-block">
{`function doGet() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = sheet.getDataRange().getValues();
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`}
                    </pre>
                  </li>
                  <li>Haz clic en <strong>Implementar &gt; Nueva implementación</strong>.</li>
                  <li>Tipo: <em>Aplicación web</em> | Quién tiene acceso: <em>Cualquier persona</em>.</li>
                  <li>Copia la URL de la aplicación web y pégala aquí.</li>
                </ol>
              </div>

              <div className="guide-card">
                <h4><i className="fa-solid fa-table-columns" style={{ color: 'var(--accent-pink)' }}></i> Estructura de Columnas (Basada en Excel de ejemplo)</h4>
                <p>Las columnas pueden identificarse por nombre de cabecera o por posición:</p>
                <div className="table-responsive">
                  <table className="mini-table">
                    <thead>
                      <tr>
                        <th>Columna</th>
                        <th>Campo</th>
                        <th>Ejemplo</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr><td>Col B (1)</td><td><code>ID Materia</code></td><td>MAT101, 10293</td></tr>
                      <tr><td>Col L (11)</td><td><code>Documento Docente</code></td><td>1037645210</td></tr>
                      <tr><td>Col M (12)</td><td><code>Profesor / Docente</code></td><td>GARCIA PEREZ CARLOS</td></tr>
                      <tr><td>Col N (13)</td><td><code>Día</code></td><td>LUNES, MARTES...</td></tr>
                      <tr><td>Col O (14)</td><td><code>Horario</code></td><td>07:00 A 09:00</td></tr>
                      <tr><td>Col P (15)</td><td><code>Aula / Salón</code></td><td>CO201, E1, LAB 1</td></tr>
                      <tr><td>Col Q (16)</td><td><code>Facultad</code></td><td>INGENIERÍA</td></tr>
                      <tr><td>Col R (17)</td><td><code>Materia</code></td><td>CÁLCULO DIFERENCIAL</td></tr>
                      <tr><td>Col S (18)</td><td><code>Fecha</code></td><td>18/08/2026</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

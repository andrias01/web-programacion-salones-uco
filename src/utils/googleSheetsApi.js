/**
 * SISTEMA DE GESTIÓN Y DISPONIBILIDAD DE AULAS - GOOGLE SHEETS API CLIENT
 * Supports Google Apps Script Web Apps, Google Sheets CSV/GViz endpoints, and JSON APIs.
 */

import { parseRowsArray, parseObjectsArray, parseCSV } from './dataParser';

export const STORAGE_KEYS = {
  SHEETS_URL: 'uco_reservations_sheets_url',
  AUTO_SYNC_MINUTES: 'uco_reservations_auto_sync',
  LAST_SYNC_TIMESTAMP: 'uco_reservations_last_sync',
  CACHED_DATA: 'uco_reservations_cached_data'
};

/**
 * Extracts Google Spreadsheet ID from a standard Google Sheets URL
 */
export function extractSpreadsheetId(url) {
  if (!url) return null;
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Normalizes input URL to an optimal fetch endpoint for Google Sheets
 */
export function normalizeGoogleSheetsUrl(rawUrl) {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();

  // If it's an Apps Script Web App execution endpoint
  if (trimmed.includes('script.google.com') && trimmed.includes('/exec')) {
    return trimmed;
  }

  // If it's a standard Google Sheet URL or edit link
  const sheetId = extractSpreadsheetId(trimmed);
  if (sheetId) {
    // Check if a specific gid / sheet is specified
    const gidMatch = trimmed.match(/gid=([0-9]+)/);
    const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';
    
    // GViz CSV export endpoint (No API Key needed, highly reliable for published or shared sheets)
    return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv${gidParam}`;
  }

  return trimmed;
}

/**
 * Fetches and parses reservations from Google Sheets URL or custom API
 */
export async function fetchGoogleSheetsData(url) {
  if (!url) {
    throw new Error('Debes proporcionar un enlace o API de Google Sheets.');
  }

  const endpointUrl = normalizeGoogleSheetsUrl(url);

  try {
    const response = await fetch(endpointUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/csv, text/plain, */*'
      }
    });

    if (!response.ok) {
      throw new Error(`Error en la petición HTTP: ${response.status} ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || '';
    const responseText = await response.text();

    if (!responseText || responseText.trim().length === 0) {
      throw new Error('La respuesta de Google Sheets está vacía.');
    }

    // 1. Check if response is JSON
    if (contentType.includes('application/json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
      try {
        const jsonData = JSON.parse(responseText);

        // Case A: Array of objects [{ aula: 'CO201', profesor: '...', ... }]
        if (Array.isArray(jsonData)) {
          if (jsonData.length > 0 && Array.isArray(jsonData[0])) {
            return parseRowsArray(jsonData);
          }
          return parseObjectsArray(jsonData);
        }

        // Case B: Google Sheets API v4 { values: [ [...], [...] ] }
        if (jsonData.values && Array.isArray(jsonData.values)) {
          return parseRowsArray(jsonData.values);
        }

        // Case C: Apps Script wrapped object { status: 'success', data: [...] }
        if (jsonData.data && Array.isArray(jsonData.data)) {
          if (jsonData.data.length > 0 && Array.isArray(jsonData.data[0])) {
            return parseRowsArray(jsonData.data);
          }
          return parseObjectsArray(jsonData.data);
        }

        // Case D: GViz JSON response (google.visualization.Query.setResponse({...}))
        if (jsonData.table && Array.isArray(jsonData.table.rows)) {
          const rows = [];
          const headers = (jsonData.table.cols || []).map(c => (c && c.label) ? c.label : '');
          rows.push(headers);
          jsonData.table.rows.forEach(r => {
            const rowValues = (r.c || []).map(cell => (cell && cell.v !== undefined) ? cell.v : '');
            rows.push(rowValues);
          });
          return parseRowsArray(rows);
        }
      } catch (jsonErr) {
        // If JSON parsing fails, continue to check GViz callback or CSV
      }
    }

    // 2. Check for GViz wrapped callback text: google.visualization.Query.setResponse({...})
    if (responseText.includes('google.visualization.Query.setResponse')) {
      const jsonStart = responseText.indexOf('(');
      const jsonEnd = responseText.lastIndexOf(')');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        const rawJson = responseText.substring(jsonStart + 1, jsonEnd);
        const parsedGviz = JSON.parse(rawJson);
        if (parsedGviz.table && Array.isArray(parsedGviz.table.rows)) {
          const rows = [];
          const headers = (parsedGviz.table.cols || []).map(c => (c && c.label) ? c.label : '');
          rows.push(headers);
          parsedGviz.table.rows.forEach(r => {
            const rowValues = (r.c || []).map(cell => (cell && cell.v !== undefined) ? (cell.f || cell.v) : '');
            rows.push(rowValues);
          });
          return parseRowsArray(rows);
        }
      }
    }

    // 3. Fallback: Parse as CSV text
    return parseCSV(responseText);

  } catch (err) {
    console.error('Error al conectar con Google Sheets:', err);
    throw new Error(err.message || 'No se pudo obtener la información de Google Sheets.');
  }
}

/**
 * LocalStorage helpers
 */
export function getSavedSheetsConfig() {
  if (typeof window === 'undefined') return { url: '', autoSyncMinutes: 0, lastSync: null };
  return {
    url: localStorage.getItem(STORAGE_KEYS.SHEETS_URL) || '',
    autoSyncMinutes: parseInt(localStorage.getItem(STORAGE_KEYS.AUTO_SYNC_MINUTES) || '0', 10),
    lastSync: localStorage.getItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP) || null
  };
}

export function saveSheetsConfig(url, autoSyncMinutes = 0) {
  if (typeof window === 'undefined') return;
  if (url) localStorage.setItem(STORAGE_KEYS.SHEETS_URL, url.trim());
  else localStorage.removeItem(STORAGE_KEYS.SHEETS_URL);
  localStorage.setItem(STORAGE_KEYS.AUTO_SYNC_MINUTES, String(autoSyncMinutes));
}

export function saveLastSyncTime() {
  if (typeof window === 'undefined') return;
  const nowStr = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  localStorage.setItem(STORAGE_KEYS.LAST_SYNC_TIMESTAMP, nowStr);
  return nowStr;
}

export function saveCachedReservations(reservations) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.CACHED_DATA, JSON.stringify(reservations));
  } catch (e) {
    console.warn('Could not cache reservations in localStorage (quota exceeded or disabled)');
  }
}

export function getCachedReservations() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_DATA);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

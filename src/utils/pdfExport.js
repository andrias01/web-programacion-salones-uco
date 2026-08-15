/**
 * SISTEMA DE GESTIÓN Y DISPONIBILIDAD DE AULAS - PDF EXPORT HELPER
 */

export function exportProfessorSchedulePDF({ professorName, docInfo, elementId = 'pdfPrintArea' }) {
  if (!professorName) {
    alert('Por favor selecciona un profesor en el filtro antes de exportar el horario.');
    return;
  }

  const element = document.getElementById(elementId);
  if (!element) {
    alert('No se encontró el contenedor de horario para exportar.');
    return;
  }

  const pdfHeader = document.getElementById('pdfExportHeader');
  const pdfTitle = document.getElementById('pdfProfTitle');
  const pdfSub = document.getElementById('pdfProfSub');

  if (pdfTitle) {
    pdfTitle.textContent = `HORARIO DOCENTE: ${professorName.toUpperCase()}${docInfo ? ` (${docInfo})` : ''}`;
  }
  if (pdfSub) {
    pdfSub.textContent = `Sistema de Gestión de Disponibilidad de Aulas | Generado el ${new Date().toLocaleDateString('es-CO')} a las ${new Date().toLocaleTimeString('es-CO')}`;
  }

  if (pdfHeader) pdfHeader.style.display = 'block';

  // Check if html2pdf is available
  if (typeof window !== 'undefined' && window.html2pdf) {
    const opt = {
      margin: [6, 6, 6, 6],
      filename: `Horario_${professorName.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    window.html2pdf().set(opt).from(element).save().then(() => {
      if (pdfHeader) pdfHeader.style.display = 'none';
    }).catch(err => {
      console.error('Error generando PDF:', err);
      if (pdfHeader) pdfHeader.style.display = 'none';
      alert('Ocurrió un error al generar el PDF. Puedes utilizar la opción Imprimir (Ctrl+P) de tu navegador.');
    });
  } else {
    // Native print fallback
    window.print();
    if (pdfHeader) pdfHeader.style.display = 'none';
  }
}

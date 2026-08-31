/**
 * SISTEMA DE GESTIÓN Y DISPONIBILIDAD DE AULAS - PORTAPAPELES
 * Copia texto plano con la API moderna y respaldo para contextos no seguros (http://).
 */

export async function copyTextToClipboard(text) {
  if (!text) return false;

  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      // Continúa con el método de respaldo
    }
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'fixed';
    textarea.style.top = '-9999px';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch (err) {
    return false;
  }
}

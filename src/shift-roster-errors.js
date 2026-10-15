const NO_CODES_MESSAGE = 'Ich konnte keine Schichtkürzel sicher erkennen. Bitte ein gerades, gut beleuchtetes Foto oder eine gut lesbare PDF wählen.';

export function rosterImportErrorMessage(error) {
  const message = String(error?.message || '').trim();
  if (message === NO_CODES_MESSAGE) return message;
  if (/^Bitte höchstens vier JPEG-, PNG- oder PDF-Dateien/.test(message)) return message;
  if (/PDF-Komponente|pdf\.js|PDF konnte nicht geladen/i.test(message)) {
    return 'Die PDF-Komponente konnte nicht geladen werden. Bitte die Internetverbindung prüfen und es erneut versuchen.';
  }
  if (/PDF-Datei|PDF-Seite|PDF konnte nicht gelesen|PDF konnte nicht dargestellt/i.test(message)) {
    return 'Die PDF-Datei konnte nicht gelesen werden. Bitte eine gut lesbare PDF mit vollständigem Dienstplan auswählen und es erneut versuchen.';
  }
  if (/read image|image/i.test(message)) {
    return 'Das Bild konnte nicht gelesen werden. Bitte ein JPEG- oder PNG-Foto auswählen und es erneut versuchen.';
  }
  if (/OCR konnte nicht geladen|internetverbindung|failed to fetch|network/i.test(message)) {
    return 'Die deutsche Texterkennung konnte nicht geladen werden. Bitte die Internetverbindung prüfen und es erneut versuchen.';
  }
  return 'Der Dienstplan konnte nicht gelesen werden. Bitte ein gut beleuchtetes JPEG- oder PNG-Foto oder eine gut lesbare PDF auswählen und es erneut versuchen.';
}


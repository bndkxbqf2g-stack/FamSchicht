const NO_CODES_MESSAGE = 'Ich konnte keine Schichtkürzel sicher erkennen. Bitte ein gerades, gut beleuchtetes Foto wählen.';

export function rosterImportErrorMessage(error) {
  const message = String(error?.message || '').trim();
  if (message === NO_CODES_MESSAGE) return message;
  if (/read image|image/i.test(message)) {
    return 'Das Bild konnte nicht gelesen werden. Bitte ein JPEG- oder PNG-Foto auswählen und es erneut versuchen.';
  }
  if (/OCR konnte nicht geladen|internetverbindung|failed to fetch|network/i.test(message)) {
    return 'Die deutsche Texterkennung konnte nicht geladen werden. Bitte die Internetverbindung prüfen und es erneut versuchen.';
  }
  return 'Der Dienstplan konnte nicht gelesen werden. Bitte ein gut beleuchtetes JPEG- oder PNG-Foto auswählen und es erneut versuchen.';
}


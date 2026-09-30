# Dienstplanimport

## Ziel

Ein fotografierter Monatsdienstplan kann auf dem Gerät des Nutzers gelesen werden. Das System erkennt die eigene Zeile und zeigt überlappende Kolleginnen und Kollegen im Bereich „Dienste“ an. Die eigene Zeile erscheint zusätzlich als persönlicher Dienst im Kalender.

## Fachliche Kürzel

| Kürzel | Bedeutung | Zeit / Verhalten |
| --- | --- | --- |
| F1 | Frühdienst | 06:00–14:12 |
| S1 | Spätdienst | 13:30–21:42 |
| N5 | Nachtdienst | 21:15–06:30 |
| Nx | Nachtdienst mit anderen Aufgaben | 21:15–06:30 |
| Z1 | Zwischendienst | 11:48–20:00 |
| OZ | Zusatzkennzeichnung „nicht angerechnet“ | Gilt zusammen mit dem eigentlichen Dienstcode; separate Anzeige im Team |
| O | Wunschfrei | Kein Dienst |
| U | Urlaub | Kein Dienst |
| FA | Freizeitausgleich | Kein Dienst |
| SL | Leitungsdienst | Wird in dieser Teamübersicht ignoriert |
| SG | Homeoffice/Weiterbildung, Tageszeit variabel | Wird ignoriert |

## Ablauf und Datenschutz

1. Bis zu vier Bilder (zusammen höchstens 35 MB) werden im Browser mit deutscher OCR verarbeitet.
2. Monat, eigene Person in FamSchicht, eigene Zeile, erkannte Namen, Datum, Kürzel und OZ-Markierungen können vor dem Speichern kontrolliert und bearbeitet werden. „Stefanie“ wird bei einem eindeutigen Haushaltsmitglied „Steffi“ vorausgewählt; die Zuordnung bleibt änderbar.
3. Nutzerbestätigung ist erforderlich. Ein Import ersetzt nach zusätzlicher Bestätigung einen bereits lokal gespeicherten Plan desselben Monats.
4. Das Foto wird nicht gespeichert. Bestätigte Zeilen liegen in `localStorage` dieses Browsers/Geräts; sie werden weder mit Supabase synchronisiert noch zwischen Geräten geteilt.
5. OCR kann Tabellenzellen verwechseln. Deshalb ist die manuelle Vorschau Teil des verpflichtenden Ablaufs.

## Anzeige

- Die Kachel im Bereich „Dienste“ sucht den gerade laufenden eigenen Dienst, andernfalls den nächsten zukünftigen Dienst.
- Kolleginnen und Kollegen erscheinen nur bei tatsächlicher zeitlicher Überschneidung; Nachtdienste reichen über Mitternacht.
- Namen werden dort auf Vornamen verkürzt. Regulär angerechnete Dienste und OZ-Zusatzdienste werden getrennt gruppiert.
- In den Kalender wird nur die eigene Zeile projiziert und der ausgewählten stabilen Haushalts-ID zugeordnet. So kann die Dienstplanzeile „Stefanie“ der FamSchicht-Person „Steffi“ zugeordnet werden. Die Auswahl wird pro lokalem Monatsplan gespeichert.
- Importierte Kalenderprojektionen sind Ansichten der lokalen Importdaten und können nicht als Supabase-Eintrag bearbeitet oder gelöscht werden. Der lokale Dienstplan bleibt die Quelle.

## Qualitätsregeln

- OCR-Ergebnisse nie ungeprüft persistieren.
- Keine echten Dienstplanfotos, Personennamen oder Mitarbeiterdaten in Fixtures, Screenshots oder Logs.
- Änderungen an den Dienstzeiten müssen `src/dates.js`, die Importlogik und ihre Regressionstests gemeinsam berücksichtigen.
- Prüfen: synthetische OCR-Parserfälle, Speicher-Roundtrip, Nachtüberschneidung, eindeutige Kalenderzuordnung und responsive Darstellung auf iPhone-Breite.

# ARCHITECTURE

Stand: 19.10.2026

## Client
Vite-basierte JavaScript-Web-App.

- src/main.js: Kalenderdarstellung und derzeitige UI-Orchestrierung.
- src/storage.js: lokaler Gerätespeicher.
- src/dates.js: Datums- und Schichtzeitlogik.
- src/custody.js: Umgangsrhythmus.
- src/security.js: UI-Sichtbarkeits-/Escaping-Helfer.
- src/auth.js: Supabase-Client und Auth.
- src/runtime-config.js: Build-Variablen für Supabase-URL und Publishable Key mit lokalem Konfigurationsstatus.
- src/auth-ui.js: Anmeldung/Abmeldung.
- src/household-ui.js: Haushalts-Setup, owner-only Mitgliederverwaltung/Einladungs-UI; Coparent erreicht diesen Verwaltungsbereich nicht.
- src/household-members.js: fachliche Haushaltsmitglieder mit stabiler ID, Farbe und Initialen.
- src/household-member-service.js: owner-scoped Persistenz der fachlichen Haushaltsmitglieder.
- src/shift-roster-*.js: Dienstplan-PDF-/OCR-Import, lokale Speicherung, Schichtlogik und Kalenderprojektion.
- src/shift-roster-pdf.js: PDF.js-Lazyload, Textlagen-Extraktion und Rendering bildbasierter Seiten als OCR-Fallback.
- Dienstplan-OCR wird über `import('./shift-roster-ocr.js')` erst beim Start eines Imports geladen; der normale Kalenderstart bleibt vom OCR-Code getrennt.
- src/shift-hours.js: optionale lokale Monats-Sollstunden und Ist-/Soll-Differenzen.
- src/task-planning.js: wiederkehrende Aufgaben- und Haushaltsroutinen mit Completion je Vorkommen.
- src/event-move.js: pure Datumsverschiebung für Einzel-, Mehrtages-, Wiederholungs-, Nacht- und Umgangseinträge.
- src/calendar-sources.js: read-only Quellenvertrag, Provider-Katalog sowie stabile UID-/Duplikat-/Konfliktentscheidung für externe Kalenderimporte.
- src/data-transfer.js: validierter JSON-Sicherungsimport mit ID-/Inhalts-Duplikaten und expliziten Konflikten.
- src/holidays.js: deterministische deutsche Feiertage mit Bundesland-Auswahl und lokaler Gerätespeicherung.
- src/display-preferences.js: lokale Darstellungspräferenz für Standard- und reversiblen read-only-Wandmodus.
- src/sync-status.js: erlaubte Synchronisationszustände sowie nutzerfreundliche Statuslabels und CSS-Klassen.
- src/rewards.js: lokale Punktwerte aus erledigten Aufgaben/Routinen und Belohnungsziele je Kalenderperson.

## Backend
Supabase/PostgreSQL mit:
- households
- memberships
- household_members
- calendar_events
- Row Level Security

Rollen im Repository-Entwurf: owner, partner, coparent.
Ereignissichtbarkeit im Repository-Entwurf: all, home, self.

## Datenfluss heute
- Offline/Fallback: lokale Kalendereinträge + Bootstrap-Mitglieder -> Kalender-UI.
- Supabase-Konfiguration: `.env.local` oder GitHub-Pages-Variablen -> `runtime-config.js` -> echter Supabase-Client; fehlen die Variablen, bleibt der Auth-/Transportadapter ohne Netzwerkzugriff im lokalen Modus.
- Optionale Sollstunden: Monatsziele pro schichtberechtigter Person -> lokaler Gerätespeicher -> Dienstplanübersicht; diese Werte werden nicht als Kalenderereignisse oder Supabase-Daten synchronisiert.
- Importierte Dienstpläne: Foto/PDF -> PDF-Textebene zuerst, sonst OCR im Browser -> editierbare Vorschau -> bestätigte Schichtzeilen in `localStorage` -> Teamkachel und lokale Projektion der eindeutig zugeordneten eigenen Dienste in die Kalenderansicht. Fotos und PDFs werden nach der Verarbeitung nicht gespeichert; es gibt dafür keinen Supabase-Schreibpfad.
- Externe Kalender: ICS-Datei -> optionale Zuordnung zu einer Kalenderperson -> read-only Quellenvertrag -> stabile externe UID/Fingerprint-Prüfung -> neue Termine oder explizit ausgewiesene Duplikate/Konflikte. Importierte Termine tragen die Quellenmetadaten im bestehenden `metadata`-Roundtrip und bleiben in der Oberfläche nicht bearbeitbar.
- Datensicherung: JSON-Datei -> Format-/Datums-/Uhrzeitvalidierung -> ID-/Inhalts-Duplikat- und Konfliktentscheidung -> bestätigter lokaler oder owner-scoped Speicherpfad.
- Feiertage: lokales Bundesland -> `holidays.js` -> deterministische bundesweite/regional ergänzte read-only Termine. Die berechneten Feiertage werden nicht als eigene Supabase-Zeilen gespeichert und können nicht bearbeitet, gelöscht oder verschoben werden.
- Wandmodus: lokale Darstellungspräferenz -> `display-preferences.js` -> Kalenderansicht mit ausgeblendeter Navigation, größeren Karten und deaktivierten Änderungszielen. Der Modus hat einen sichtbaren Rückweg und verändert weder Termine noch Cloud-Daten.
- Punkte/Belohnungen: Aufgabe oder Routine mit Punktwert -> erledigter Einzel-/Vorkommensstatus -> `rewards.js` -> lokaler Fortschritt je Kalenderperson und lokal verwaltete Belohnungsziele; kein Supabase-Pfad.
- Cloud-Kontext: Auth-Konto -> `get_my_household_context()` -> Haushalts-ID/Rolle; Owner lädt owner-scoped Kalenderpersonen, Coparent lädt nur serverseitig freigegebene gemeinsame `calendar_events`.
- Owner-Mitgliederverwaltung: Einstellungen -> `ensureOwnerHouseholdMembers`/`saveOwnerHouseholdMembers` -> `household_members`; neue Personen erhalten eine stabile ID, bestehende `ownerId`-Referenzen werden beim Bearbeiten nicht geändert. Coparent sieht weder diese Tabelle noch Rollen-/Einladungsverwaltung.
- `household_members` beschreibt Kalender-Personen. Authentifizierte Zugriffsrollen bleiben getrennt in `memberships`.
- Die Oberfläche meldet Sync-Zustände getrennt vom fachlichen `cloud`-Scope; ein Fehlerstatus bedeutet nicht, dass lokale Daten als serverseitig synchronisiert ausgegeben werden.
- Terminverschiebung: Kalenderkarte -> `event-move.js` -> unverändertes Ereignis mit verschobenem Datumsbereich -> bestehender `updateEntry`-Pfad -> lokaler Speicher oder owner-scoped Supabase-Update. `id`, `ownerId`, Uhrzeiten und Nachtdienst bleiben erhalten; `completedDates` folgen dem Anker, einzelne `custody`-Einträge behalten ihren Serienanker.

## Zielarchitektur
UI -> klar abgegrenzte Kalender-/Haushaltsservices -> Supabase.
Lokaler Speicher darf später höchstens kontrollierter Cache/Migrationsquelle sein und nicht als konkurrierende Wahrheit neben Supabase bestehen.

## Architekturregeln
- Fachlogik von UI und Transport trennen.
- Kleine Module statt wachsender main.js.
- Datenlücken explizit behandeln.
- RLS ist die serverseitige Sicherheitsgrenze; UI-Prüfungen ersetzen sie nicht.
- Keine freien Membership-Schreibrechte aus dem Browser.
- Coparent-RLS erlaubt nur gemeinsame Kalenderdaten/Aufgaben: nicht `self`, nicht `shift`/`private`; INSERT/UPDATE ja, DELETE nein. Die UI-Schranke ist nur Zusatzschutz.
- Kalenderpersonen dürfen owner-only bearbeitet und ergänzt werden; Löschung bleibt bis zu einer sicheren Referenz-/Archivierungsstrategie deaktiviert.
- Dienstplanfotos und importierte Teamdaten bleiben lokal auf dem Gerät; OCR-Ergebnisse müssen vor dem Speichern geprüft und bestätigt werden.


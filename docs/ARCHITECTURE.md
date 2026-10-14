# ARCHITECTURE

Stand: 14.10.2026

## Client
Vite-basierte JavaScript-Web-App.

- src/main.js: Kalenderdarstellung und derzeitige UI-Orchestrierung.
- src/storage.js: lokaler Gerätespeicher.
- src/dates.js: Datums- und Schichtzeitlogik.
- src/custody.js: Umgangsrhythmus.
- src/security.js: UI-Sichtbarkeits-/Escaping-Helfer.
- src/auth.js: Supabase-Client und Auth.
- src/auth-ui.js: Anmeldung/Abmeldung.
- src/household-ui.js: Haushalts-Setup, owner-only Mitgliederverwaltung und Einladungs-UI.
- src/household-members.js: fachliche Haushaltsmitglieder mit stabiler ID, Farbe und Initialen.
- src/household-member-service.js: owner-scoped Persistenz der fachlichen Haushaltsmitglieder.
- src/shift-roster-*.js: Dienstplan-OCR, lokale Speicherung, Schichtlogik und Kalenderprojektion.
- src/shift-hours.js: optionale lokale Monats-Sollstunden und Ist-/Soll-Differenzen.
- src/task-planning.js: wiederkehrende Aufgaben- und Haushaltsroutinen mit Completion je Vorkommen.
- src/event-move.js: pure Datumsverschiebung für Einzel-, Mehrtages-, Wiederholungs-, Nacht- und Umgangseinträge.
- src/calendar-sources.js: read-only Quellenvertrag, Provider-Katalog sowie stabile UID-/Duplikat-/Konfliktentscheidung für externe Kalenderimporte.
- src/sync-status.js: erlaubte Synchronisationszustände sowie nutzerfreundliche Statuslabels und CSS-Klassen.

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
- Optionale Sollstunden: Monatsziele pro schichtberechtigter Person -> lokaler Gerätespeicher -> Dienstplanübersicht; diese Werte werden nicht als Kalenderereignisse oder Supabase-Daten synchronisiert.
- Importierte Dienstpläne: Foto -> OCR im Browser -> editierbare Vorschau -> bestätigte Schichtzeilen in `localStorage` -> Teamkachel und lokale Projektion der eindeutig zugeordneten eigenen Dienste in die Kalenderansicht. Fotos werden nach der OCR nicht gespeichert; es gibt dafür keinen Supabase-Schreibpfad.
- Externe Kalender: ICS-Datei -> read-only Quellenvertrag -> stabile externe UID/Fingerprint-Prüfung -> neue Termine oder explizit ausgewiesene Duplikate/Konflikte. Importierte Termine tragen die Quellenmetadaten im bestehenden `metadata`-Roundtrip und bleiben in der Oberfläche nicht bearbeitbar.
- Cloud-Owner: Auth/Haushalt -> Supabase; `household_members` liefert Personenfilter/Schichtzuordnung, `calendar_events` liefert Termine und Dienste.
- Owner-Mitgliederverwaltung: Einstellungen -> `ensureOwnerHouseholdMembers`/`saveOwnerHouseholdMembers` -> `household_members`; neue Personen erhalten eine stabile ID, bestehende `ownerId`-Referenzen werden beim Bearbeiten nicht geändert.
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
- Kalenderpersonen dürfen owner-only bearbeitet und ergänzt werden; Löschung bleibt bis zu einer sicheren Referenz-/Archivierungsstrategie deaktiviert.
- Dienstplanfotos und importierte Teamdaten bleiben lokal auf dem Gerät; OCR-Ergebnisse müssen vor dem Speichern geprüft und bestätigt werden.


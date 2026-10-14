# FamSchicht

FamSchicht ist ein Familien- und Schichtkalender für gemeinsame Familientermine, Kindertermine, Umgangszeiten und persönliche Schichtplanung.

## Aktueller Stand

- Vite-Web-App mit GitHub-Pages-Deployment.
- Monats-, Wochen-, Tages- und Heute-Ansicht.
- Familien- und Schichttermine inklusive Wiederholungen und mehrtägigen Ereignissen.
- Schicht-Schnellerfassung für Frühdienst, Spätdienst, Zwischendienst, Nachtdienst, SG-Tag, Urlaub und Fortbildung.
- Monatsübersicht der Dienste je Person, getrennte OZ-Stunden und Konflikthinweise bei Familien-/Kinderterminen; zusätzlich ist `Krank` als ganztägiger Status erfassbar.
- Schichtserien über Wochentage sowie wiederverwendbare lokale Vorlagen für Zeitdienste und Statuswerte.
- Optionale Monats-Sollstunden je Person mit lokaler Speicherung und sichtbarer Ist-/Soll-Differenz.
- Gemeinsame Aufgaben mit Zuweisung, Fälligkeit, Priorität und Erledigt-Status direkt in der Übersicht; wiederkehrende Aufgaben werden je Vorkommen geführt.
- Haushaltsroutinen werden als wiederkehrende, zugewiesene Einträge mit eigenem Erledigt-Status je Vorkommen geführt.
- JSON-Sicherung sowie ICS-Import und -Export für den lokalen Kalenderaustausch.
- Installierbare PWA-Shell mit network-first Offline-/Retry-Fallback.
- Sichtbarer Synchronisationsstatus für lokal, laufend, synchronisiert, offline und Fehler; bei erneuter Verbindung wird der Cloud-Check automatisch wiederholt.
- Lokaler read-only-Wandmodus für große gemeinsame Displays mit sichtbarem Rückweg.
- Tastaturfreundlicher Einstellungen-Dialog mit Skip-Link, Dialogsemantik, Escape-Schließen und grundlegender ARIA-Navigation.
- Termine lassen sich im Kalender per Maus/Touch auf einen anderen Tag ziehen; ein zugänglicher Verschieben-Dialog dient als zuverlässiger Fallback und verschiebt auch mehrtägige, wiederkehrende und nächtliche Einträge korrekt.
- Dienstplanfotos können lokal per OCR gelesen, vor dem Speichern überprüft und ausschließlich auf diesem Gerät abgelegt werden. Die eigene Zeile wird mit eindeutiger Haushaltszuordnung in den Kalender projiziert; „Dienste“ zeigt überlappende Kolleginnen und Kollegen mit Vornamen.
- Zentrales Haushaltsmitglieder-Domänenmodell mit stabilen Mitglieder-IDs.
- Personenfilter, Schichtauswahl und die Mitgliederlegende mit individuellen Farben/Initialen werden aus diesem Modell erzeugt.
- Angemeldete Owner können Kalenderpersonen in den Einstellungen anlegen und Name, Typ, Farbe sowie Schichtberechtigung ändern; die stabilen IDs bleiben dabei erhalten.
- Neue Schichten speichern neben dem Anzeigenamen eine stabile `ownerId`; ältere Einträge mit nur `owner` bleiben lesbar.
- Supabase Magic-Link-Authentifizierung und owner-only Haushalt.
- Für angemeldete Owner werden `calendar_events` über Supabase geladen, angelegt, geändert und gelöscht.
- RLS und eingeschränkte Data-API-Grants schützen den aktuellen Live-Stand weiterhin owner-only.

## Noch nicht freigegeben

- Der Einladungsfluss für Partner/coparent ist technisch vorbereitet, aber noch nicht für Mehrbenutzer-RLS freigegeben.
- Keine Erweiterung der Live-RLS auf mehrere Haushaltsmitglieder.
- Keine Realtime-Synchronisierung zwischen getrennten Konten.
- Eine Löschaktion für Kalenderpersonen ist bewusst noch nicht angeboten, solange die sichere Umhängung bestehender `ownerId`-Referenzen nicht festgelegt ist.
- Keine Nutzung echter sensibler Familiendaten, bevor Mehrbenutzerrechte mit getrennten Testkonten geprüft sind.

## Entwicklung

```sh
npm install
npm test
npm run build
```

GitHub ist die technische Wahrheit. Vor Änderungen zuerst `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` und `docs/DECISIONS.md` prüfen.

Details zu OCR, Kürzeln, lokaler Speicherung und manueller Prüfung: [`docs/SHIFT_ROSTER_IMPORT.md`](docs/SHIFT_ROSTER_IMPORT.md).

**Datenschutz:** Keine Supabase-Service-Role-/Secret-Schlüssel oder unnötige sensible Familieninformationen im Repository speichern.


## Release 0.3.1

Die freigegebene helle Kalender-Startseite wird über den Pages-Workflow veröffentlicht; Fachlogik und owner-only RLS bleiben unverändert.


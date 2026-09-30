# FamSchicht Masterplan – FamilyCal-inspired family command center

Stand: 2026-09-25

## Ziel
FamSchicht wird zu einem eigenständigen Familien- und Schichtkalender mit ähnlich ruhiger, großbildtauglicher Bedienlogik wie FamilyCal. Der Fokus bleibt bewusst auf Kalender, Familie, Schichtplanung, Aufgaben/Routinen und externer Kalendersynchronisation. Es werden keine fremden Quellcodes, Markenassets oder proprietären Grafiken kopiert.

## Entwicklungsprinzip
- Bestehende Kernfunktionen niemals zugunsten neuer Module brechen.
- Erst Datenmodell/Service, dann UI, dann Integration.
- Kleine nachvollziehbare Commits, Regressionstests für belegte Fehler.
- Nach jedem kohärenten Block vollständige relevante CI.
- Rote CI blockiert neue Feature-Arbeit.
- Änderungen an Schema, Auth, Berechtigungen und externer Synchronisation werden kleiner geschnitten.
- Personen- und Standortdaten nur explizit, haushaltsbezogen und mit klaren Sichtbarkeitsregeln.
- Mobile, iPhone/PWA, Tablet und Wall-Display werden gleichwertig berücksichtigt.

## Definition „fertig“
Das Projekt gilt erst als abgeschlossen, wenn die Kernphasen 1–5 umgesetzt, getestet und dokumentiert sind, die Abschlussphase 6 grün ist und keine bekannten kritischen Fehler offen sind.

## Roadmap

### Phase 1 – App-Shell, Kalender und Ansichten
- [x] Family-command-center Layout
- [x] responsive Desktop-/Mobilnavigation
- [x] Monatsansicht
- [x] Heute-Ansicht
- [x] Wochenansicht
- [x] Tagesansicht
- [x] Personenfilter direkt im Kalender
- [x] Kategorie-/Farbfilter
- [x] Schnelltermin
- [x] vollständiger Termin-Editor
- [x] mehrtägige Termine
- [x] Wiederholungen: täglich / wöchentlich / monatlich / jährlich
- [x] Geburtstage und ganztägige Ereignisse
- [ ] Drag/Move nur falls stabil auf Touch und Desktop

### Phase 2 – Familie, Rollen und Sichtbarkeit
- [ ] Haushaltsmitglieder als eigenes Modell
- [ ] Martin / Steffi / Kinder / weitere Mitglieder
- [ ] individuelle Farben und Avatare/Initialen
- [ ] Einladung/Beitritt
- [ ] Rollen: Owner / Erwachsener / Kind / Gast
- [ ] Sichtbarkeit pro Ereignis
- [ ] persönliche vs. gemeinsame Einträge
- [ ] bestehende Schicht-Owner sauber in Mitgliedsmodell migrieren
- [ ] Anna später gezielt mit eingeschränktem Bereich/Kind-Kontext einbindbar

### Phase 3 – Schichtplanung als FamSchicht-Spezialität
- [x] Früh-/Spät-/Nachtdienst
- [x] Martin-/Steffi-Zuordnung
- [x] Schnellaufnahme mit automatischem Tagesfortschritt
- [ ] Schichtserie aus Dienstplan schneller erfassen
- [ ] Monatsübersicht Schichten je Person
- [ ] Soll-/Ist-Stunden optional
- [ ] freie Tage / Urlaub / Fortbildung / Krank
- [ ] Kollisionshinweise mit Familien- oder Kinderterminen
- [ ] Schichtfilter und kompakte Legende
- [ ] wiederverwendbare Schichtvorlagen

### Phase 4 – Aufgaben und Routinen
- [ ] gemeinsame Aufgabenliste
- [ ] Zuweisung an Person
- [ ] Fälligkeit
- [ ] Priorität
- [ ] wiederkehrende Aufgaben
- [ ] Erledigt-Status
- [ ] Heute-/Wochen-Dashboard
- [ ] optional Punkte-/Belohnungssystem für Kinder
- [ ] Haushaltsroutinen

### Phase 5 – Externe Kalender und Synchronisation
- [ ] Google Calendar Architektur
- [ ] Outlook/Microsoft Calendar Architektur
- [ ] Kalenderquellen pro Mitglied
- [ ] read-only Import zuerst
- [ ] Konflikt-/Duplikatlogik
- [ ] anschließend optionaler Zwei-Wege-Sync
- [ ] Feiertage/Bundesland
- [ ] ICS Import/Export
- [ ] Sync-Status und Fehleranzeige
Hinweis: produktiver OAuth-Sync benötigt Provider-Konfiguration/Credentials außerhalb des Repositorys.

### Phase 6 – Produktreife
- [ ] PWA installierbar
- [ ] iPhone Home-Screen optimiert
- [ ] Wall-/Tablet-Modus
- [ ] Offline/Retry-Konzept
- [ ] Echtzeit-Sync zwischen Haushaltsgeräten
- [ ] Benachrichtigungen
- [ ] Accessibility
- [ ] Ladezeit/Performance
- [ ] Datenexport
- [ ] Account-/Haushaltslöschung
- [ ] Security-/RLS-Audit
- [ ] Schema-Migrationstest
- [ ] End-to-End Kernabläufe
- [ ] Fehlerzustände und Recovery
- [ ] Dokumentation
- [ ] finaler Repo-/CI-/UX-Audit

## Arbeitsmodi A/N/Q/U

Die Kürzel gelten für das vom Nutzer genannte Repository. Sind mehrere Repositories ausdrücklich genannt, bearbeite sie jeweils getrennt.

### `A` — Autopilot
Erledige den vereinbarten Umfang in diesem Repository maximal selbstständig: aktuellen Branch und CI prüfen, Ursachen klären, Implementierung und Regressionstests ergänzen, relevante CI ausführen und klare Folgefehler beheben. Arbeite bis die Checks grün sind oder eine echte externe Grenze erreicht ist. Keine unbeauftragte Scope-Erweiterung; keine riskante Datenänderung, kein Merge und kein Release allein aufgrund des Kürzels.

### `N` — Normaler Entwicklungsblock
Arbeite einen begrenzten Block von typischerweise bis zu fünf logisch zusammenhängenden Schritten ab. Führe danach die passenden Tests und CI aus und berichte den nächsten sinnvollen Schritt.

### `Q` — Qualitätssicherung
Prüfe den benannten Bereich oder vorhandenen Diff, führe passende Tests aus und behebe nur klar reproduzierbare Fehler mit Regressionstest. Keine neuen Features.

### `U` — Update
Prüfe nur Repository-, Branch-, Test- und CI-Status und berichte ihn kompakt mit Ampel. Keine Änderungen und keine eigenständige Fehlerbehebung.

## Bestehende Kurzbefehle
- `A`: maximal selbstständige Umsetzung und Problembehebung im jeweils genannten Repository
- `N`: begrenzter Entwicklungsblock im jeweils genannten Repository
- `Q`: fokussierte Qualitätssicherung ohne neue Features
- `U`: Statusbericht ohne Änderungen

## Reihenfolge ab aktuellem Stand
Phase 1 vollständig abschließen → Phase 2 → Phase 3 vervollständigen → Phase 4 → Phase 5 → Phase 6.

## Aktueller Ausgangspunkt
Die FamilyCal-inspirierte App-Shell, Monats-, Wochen- und Tagesansicht, Heute-Ansicht, mobile Navigation, Schicht-Schnellerfassung, Supabase-Persistenz, Haushalts-Scoping und zentrale Regressionstests sind vorhanden.

## Wiedereinstieg nach dem aktuellen Entwicklungsblock
Der vollständige Termin-Editor ist umgesetzt: bestehende Familientermine werden über die Supabase-Updateoperation geändert statt dupliziert. Mehrtägige Familientermine werden mit ihrem Datumsbereich persistiert, nach dem Cloud-Roundtrip erhalten und an allen betroffenen Kalendertagen dargestellt. Regressionstests decken Update und Mehrtagstermine ab.

Wiederholungen täglich, wöchentlich, monatlich und jährlich sind umgesetzt, werden in der Terminbearbeitung gewählt, über Metadaten cloudseitig erhalten und in den Kalenderansichten ohne duplizierte Persistenz als Vorkommen dargestellt. Geburtstage sind als eigener ganztägiger Ereignistyp mit jährlicher Wiederholung umgesetzt; bestehende Termine ohne Uhrzeit bleiben als ganztägige Ereignisse erhalten. Der nächste optionale Phase-1-Schritt ist Drag/Move, aber nur wenn die Bedienung auf Touch und Desktop stabil umgesetzt werden kann. Das bestehende Personenmodell bleibt dabei bewusst unverändert; Martin/Steffi filtern weiterhin Schicht-Owner, gemeinsame Familientermine bleiben für beide sichtbar.
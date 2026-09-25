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
- [ ] Personenfilter direkt im Kalender
- [ ] Kategorie-/Farbfilter
- [ ] Schnelltermin
- [ ] vollständiger Termin-Editor
- [ ] mehrtägige Termine
- [ ] Wiederholungen: täglich / wöchentlich / monatlich / jährlich
- [ ] Geburtstage und ganztägige Ereignisse
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

## Autopilot-Befehl

### `A`
Wenn der Nutzer nur `A` sendet, arbeitet ChatGPT im aktuellen Chat-Turn maximal selbstständig an **beiden aktiven Projekten**: FamSchicht und SparzamApp.

Dabei gilt ausdrücklich auch für Problembehebung:
1. CI und aktuellen Stand beider Projekte prüfen.
2. Bei Fehlern nicht nur melden, sondern die Ursache selbstständig analysieren.
3. Eindeutig belegte Fehler direkt korrigieren.
4. Regressionstests ergänzen oder anpassen.
5. Änderungen committen und pushen.
6. CI erneut prüfen.
7. Solange weitere sichere Korrekturen möglich sind, im selben Turn weiterarbeiten.
8. Erst stoppen, wenn CI grün ist oder eine echte externe Grenze erreicht ist (z. B. fehlende Credentials, riskante Migration, Kostenfreigabe, Tool-/Turn-Grenze).

### `N`
Normaler Entwicklungsblock für **beide aktiven Projekte** nach der bisherigen Regel: typischerweise bis zu 5 logisch zusammengehörige Schritte pro Projekt, danach relevante CI.

### `U`
Nur **Status prüfen**. Keine neue Feature-Entwicklung und keine eigenständige Problembehebung starten. Aktuellen CI-/Projektstatus beider aktiven Projekte kurz mit Ampel ausgeben.

## Bestehende Kurzbefehle
- `A`: maximal selbstständige Umsetzung **und Problembehebung** in FamSchicht + SparzamApp
- `N`: normaler Entwicklungsblock für beide aktiven Projekte
- `U`: nur Status beider aktiven Projekte prüfen

## Reihenfolge ab aktuellem Stand
Phase 1 vollständig abschließen → Phase 2 → Phase 3 vervollständigen → Phase 4 → Phase 5 → Phase 6.

## Aktueller Ausgangspunkt
Die FamilyCal-inspirierte App-Shell, Monats-, Wochen- und Tagesansicht, Heute-Ansicht, mobile Navigation, Schicht-Schnellerfassung, Supabase-Persistenz, Haushalts-Scoping und zentrale Regressionstests sind vorhanden.

## Wiedereinstieg nach dem aktuellen Entwicklungsblock
Die Monatsansicht besitzt nun umschaltbare Wochen- und Tagesansichten mit passender Vor-/Zurück-Navigation und „Heute“-Sprung. Die nächste Arbeit in Phase 1: Personenfilter direkt im Kalender, Kategorie-/Farbfilter, Schnelltermin und vollständiger Termin-Editor.

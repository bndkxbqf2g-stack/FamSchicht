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
- [ ] Wochenansicht
- [ ] Tagesansicht
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
Wenn der Nutzer nur `A` sendet, arbeitet ChatGPT ausschließlich an FamSchicht und führt innerhalb des aktuellen Chat-Turns so viel sichere Arbeit wie möglich aus.

Ablauf:
1. Aktuellen `main`-Stand und neueste CI prüfen.
2. Bei roter CI ausschließlich Ursache beheben, Tests ergänzen, erneut CI starten.
3. Bei grüner CI den obersten noch offenen Roadmap-Punkt mit sinnvollem technischen Zusammenhang wählen.
4. Bestehenden Datenfluss, Schema und angrenzende Tests vor Änderungen auditieren.
5. Mehrere kleine Commits selbstständig umsetzen.
6. Nach einem kohärenten Teilblock CI starten und Ergebnis prüfen.
7. Solange CI grün ist und im aktuellen Turn noch sinnvoll weitergearbeitet werden kann, mit dem nächsten Teilblock derselben Phase fortfahren.
8. Roadmap-Checkboxen erst nach belegter Umsetzung aktualisieren.
9. Abschlussmeldung nur mit Ampelstatus, erledigtem Bereich und nächstem Roadmap-Punkt.

Typischer Umfang pro `A`-Turn: deutlich größer als `N`; mehrere Entwicklungsblöcke und häufig etwa 10–25 kleine Änderungen/Commits, soweit Tool-Laufzeit, CI und Sicherheitsgrenzen dies erlauben. Die tatsächliche Zahl ist nicht garantiert.

Stop-Bedingungen:
- rote CI, die erst analysiert werden muss
- destructive oder schwer rückrollbare Datenmigration
- fehlende externe Credentials/OAuth-Konfiguration
- sicherheitsrelevante Entscheidung ohne klare bestehende Vorgabe
- externe Kostenpflicht oder Veröffentlichung in fremden Stores
- Tool-/Turn-Grenze

### Bestehende Kurzbefehle
- `N`: normaler nächster 5-Schritte-Block nach bisheriger Regel
- `U`: CI/aktuellen Block prüfen oder Fehler weiter beheben
- `A`: maximaler FamSchicht-Autopilot innerhalb eines einzigen Chat-Turns

## Reihenfolge ab aktuellem Stand
Phase 1 vollständig abschließen → Phase 2 → Phase 3 vervollständigen → Phase 4 → Phase 5 → Phase 6.

## Aktueller Ausgangspunkt
Die FamilyCal-inspirierte App-Shell, Monatsansicht, Heute-Ansicht, mobile Navigation, Schicht-Schnellerfassung, Supabase-Persistenz, Haushalts-Scoping und zentrale Regressionstests sind vorhanden. Der nächste Autopilot-Block beginnt mit Wochen-/Tagesansicht, Personenfiltern und vollständigerem Termin-Editor.

# FamSchicht Masterplan – FamilyCal-inspired family command center

Stand: 2026-09-25

## Ziel
FamSchicht wird zu einem eigenständigen Familien-Command-Center mit vergleichbarer Funktionsbreite und ähnlich ruhiger, großbildtauglicher Bedienlogik wie FamilyCal. Es werden keine fremden Quellcodes, Markenassets oder proprietären Grafiken kopiert. Funktionen, Informationsarchitektur und Interaktionsmuster werden eigenständig umgesetzt und an FamSchicht angepasst.

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
Das Projekt gilt erst als abgeschlossen, wenn alle Kernphasen 1–11 umgesetzt, getestet und dokumentiert sind, die Abschlussphase 12 grün ist und keine bekannten kritischen Fehler offen sind.

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

### Phase 5 – Einkauf und Besorgungen
- [ ] gemeinsame Echtzeit-Einkaufsliste
- [ ] Kategorien
- [ ] Mengen/Notizen
- [ ] Zuweisung/Erledigt
- [ ] mehrere Listen
- [ ] zuletzt/häufig gekauft
- [ ] Verbindung zu Aufgaben und Kalender
- [ ] optionale Übergabe an SparzamApp statt doppelte Preislogik

### Phase 6 – Schule und Kinder
- [ ] Kinderprofile
- [ ] Stundenplan
- [ ] Tests/Arbeiten
- [ ] Hausaufgaben
- [ ] Schultermine
- [ ] Fristen
- [ ] Kurs-/Fachfarben
- [ ] kompakte Wochenansicht pro Kind
- [ ] Dokument-/Link-Verweise
- [ ] Eltern-/Schulkorrespondenz als späteres Erweiterungsmodul

### Phase 7 – Kontakte
- [ ] gemeinsame Kontakte
- [ ] Kategorien: Schule / Arzt / Verein / Betreuung / Familie
- [ ] Telefon / Mail / Adresse / Notiz
- [ ] Verknüpfung aus Termin oder Schulmodul
- [ ] mobile Direktaktionen

### Phase 8 – Rezepte und Essensplanung
- [ ] Rezeptdatenbank
- [ ] Zutaten und Schritte
- [ ] Rezept-Link-Import als optionale Erweiterung
- [ ] Wochen-Essensplan
- [ ] Frühstück / Mittag / Abend
- [ ] Zutaten an Einkauf/SparzamApp übergeben
- [ ] Mahlzeiten optional im Kalender anzeigen

### Phase 9 – Externe Kalender und Synchronisation
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

### Phase 10 – Check-ins / Standort mit Privacy by Design
- [ ] freiwilliger Check-in
- [ ] letzter bekannter Check-in
- [ ] Orte wie Zuhause / Schule / Arbeit als Labels
- [ ] Kartenansicht nur mit Einwilligung
- [ ] keine versteckte Dauerortung
- [ ] Sichtbarkeit pro Mitglied
- [ ] Lösch-/Ablaufregeln
Hinweis: Hintergrundortung erfordert Plattformberechtigungen und wird nicht ohne explizite Freigabe aktiviert.

### Phase 11 – Family Assistant / Sprache
- [ ] natürlicher Schnellbefehl als Text zuerst
- [ ] strukturierte Aktionen: Termin / Aufgabe / Einkauf / Kontakt / Check-in
- [ ] Vorschau bei mehrdeutigen Befehlen
- [ ] klare Befehle direkt ausführbar
- [ ] Spracheingabe im Browser/PWA soweit Plattform unterstützt
- [ ] optionaler KI-Dienst erst nach stabilen deterministischen Kernfunktionen
- [ ] Audit-Log für KI-ausgelöste Änderungen

### Phase 12 – Produktreife
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
Phase 1 vollständig abschließen → Phase 2 → Phase 3 vervollständigen → Phase 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12.

## Aktueller Ausgangspunkt
Die FamilyCal-inspirierte App-Shell, Monatsansicht, Heute-Ansicht, mobile Navigation, Schicht-Schnellerfassung, Supabase-Persistenz, Haushalts-Scoping und zentrale Regressionstests sind vorhanden. Der nächste Autopilot-Block beginnt mit Wochen-/Tagesansicht, Personenfiltern und vollständigerem Termin-Editor.

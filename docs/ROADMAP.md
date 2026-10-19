# ROADMAP

Stand: 19.10.2026

## Aktueller Release-Gate
- `main` enthält Release `v0.3.20` einschließlich Familienruhe-Übersicht und read-only-Schichtzentrale.
- Die neue Darstellung ist auf Desktop (1280 CSS-Pixel) und im mobilen 390×844-Viewport geprüft; Übersicht und Wandmodus bleiben ohne horizontalen Überlauf.
- CI/Deploy für den Coparent-RLS-Branch ist erfolgreich (Lauf 547).
- Supabase `FamSchicht` (`kryxhpklrugceiwlrofm`) ist `ACTIVE_HEALTHY`. Der gemeinsame Coparent-Kalenderumfang ist live; Rollen-/Haushaltsverwaltung, Partnerzugriff und Realtime bleiben geschlossen.

## Aktive Reihenfolge
1. Einladungsannahme und die dazugehörige UI mit den synthetischen Konten als nächstes per Browser-Smoke-Test prüfen.
2. Realtime nach stabiler Mehrbenutzer-Synchronisierung ergänzen.
3. Danach weitere Rollen nur mit eigener Zugriffsmatrix freigeben.
4. Google-/Outlook-/ICS-Integration modular anbinden.
5. UI/UX weiter ausbauen; Terminverschiebung ist für Desktop/Touch mit zugänglichem Fallback umgesetzt.

## Qualitäts-Gates
Jedes Paket: Tests -> Build -> Deployment/CI prüfen. Fehler stoppen die Feature-Reihenfolge.

## Sicherheitsgrenze
- Owner verwaltet Haushalt, Rollen, Einladungen, Kalenderpersonen und Einstellungen.
- Coparent erhält ausschließlich den gemeinsamen Kalender-/Aufgabenumfang: kein `self`, keine Schichten, keine privaten Kategorien; Löschen bleibt owner-only.
- Partner und Fremdkonto sind nicht für den Kalender freigeschaltet.
- Keine freien Membership-Schreibrechte aus dem Browser.
- Einladungs-Tokens werden nur gehasht gespeichert; der rohe Token ist ein Bearer-Geheimnis.
- Realtime bleibt bis zur separaten Synchronisationsprüfung deaktiviert.
- Keine echten sensiblen Familiendaten vor abgeschlossenem Produkt-/Rollen-Audit.

## WORK QUEUE
### READY
- Das Supabase-Projekt ist erreichbar; private Einladungstabelle und Coparent-Kalender-RLS sind live.
- Die vier synthetischen Konten wurden in einer transaktionalen Zugriffsmatrix geprüft; die Testdaten wurden zurückgerollt.

### WAITING
- Browser-Smoke-Test mit den vier synthetischen Konten gegen die veröffentlichte App.
- Realtime-Synchronisierung nach stabiler Rechtebasis.
- Repo-weites Architektur-/Security-Audit nach Abschluss der ersten sicheren Mehrbenutzer-Synchronisierung.
- Meilenstein-Audit vor Nutzung echter Familiendaten.

### DONE
- Basis-App auf GitHub Pages lauffähig.
- Magic-Link-Auth.
- Owner-only Haushalts-Setup im Client.
- Supabase-Persistenz für `calendar_events` mit owner-only Verwaltung und freigegebenem Coparent-Lese-/Anlege-/Änderungsumfang.
- Data-API-Grants gehärtet.
- Zentrales Haushaltsmitglieder-Domänenmodell.
- Owner-only Supabase-Persistenz für Kalender-Personen über `household_members`.
- Owner-only Mitgliederverwaltung für Kalenderpersonen: Anlegen und Bearbeiten von Name, Typ, Farbe und Schichtberechtigung mit stabilen IDs.
- Schichtfilter, Darstellung und Persistenz verwenden stabile `ownerId`; Legacy-Namen bleiben Fallback.
- Sicherer Einladungs-/Beitrittsfluss fachlich dokumentiert und serverseitig umgesetzt.
- Getesteter Client-Domänenvertrag für E-Mail, Rolle und opaken Token.
- Privater Einladungsspeicher live installiert; Browserrollen haben keinen Zugriff.
- Coparent-Kalender-/Aufgaben-RLS live geprüft: gemeinsame Einträge lesbar/anlegbar/änderbar; `self`, private Kategorien, Schichten sowie Admin-Tabellen ausgeschlossen.
- Einladungs-UI im ausgelagerten Einstellungen-Bereich mit Magic-Link-Rückkehr und Regressionstest.
- Fehlende FK-Indizes live ergänzt und im Repository gespiegelt.
- Lokale Dienstplan-Monatsübersicht pro schichtberechtigter Person mit getrennten angerechneten/OZ-Stunden.
- Konflikthinweise bei Schichterfassung für Familien-/Kindertermine sowie expliziter ganztägiger Status `Krank`.
- Schichtserien über Wochentage und lokale, wiederverwendbare Schichtvorlagen.
- Optionale lokale Monats-Sollstunden mit Ist-/Soll-Differenz.
- Gemeinsame Aufgabenliste mit Person, Fälligkeit, Priorität, Erledigt-Status und Übersichts-Dashboard.
- Haushaltsroutinen als zugewiesene, wiederkehrende Einträge mit eigenem Erledigt-Status je Vorkommen.
- Lokaler JSON-/ICS-Export und bestätigter ICS-Import mit Duplikatprüfung.
- Bestätigte JSON-Sicherungswiederherstellung mit Formatvalidierung und Konfliktmeldung.
- Read-only-Quellenvertrag für ICS mit stabiler UID, Konfliktmeldung und Quellenmetadaten im bestehenden owner-only Roundtrip.
- Optionale Zuordnung lokaler read-only-ICS-Quellen zu einer Kalenderperson.
- Lokale read-only-Feiertagsquelle mit deutscher Bundesland-Auswahl und deterministischer Feiertagsberechnung.
- Installierbare PWA-Shell mit gecachtem App-Shell-Fallback für Offline-/Retry-Grundverhalten.
- iPhone-/iPadOS- und Browser-Installationshinweis in den Einstellungen mit erkanntem Standalone-Status und optionalem nativen Installationsprompt.
- Sichtbarer Sync-Status und Fehleranzeige für lokalen, laufenden, erfolgreichen und offline/fehlerhaften Zustand.
- Terminverschiebung per Desktop-Drag/Touch-Pointer mit zugänglichem Zieldatum-Fallback; Mehrtages-, Nacht-, Wiederholungs- und Umgangssemantik bleibt erhalten.
- Reversibler read-only-Wand-/Tablet-Modus für große gemeinsame Displays.
- Lokale Storage-Recovery mit sichtbaren Lade-/Schreibfehlern, ohne beschädigte Daten still zu überschreiben.
- Zugängliche Live-Fehlermeldungen sowie Fokus-Rückgabe für Termin-, Verschiebe- und Schichtdialoge.
- Lokales Punkte-/Belohnungsmodul für erledigte Aufgaben und Routinen mit Fortschritt je Kalenderperson.
- Lokaler Dienstplanfoto-Import mit prüfbarer OCR-Vorschau, Teamübersicht, eigener Kalenderprojektion, Dateigrenzen und gemeinsamer Vorschau-/Speichervalidierung.




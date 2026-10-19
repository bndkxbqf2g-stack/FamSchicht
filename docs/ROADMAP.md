# ROADMAP

Stand: 19.10.2026

## Aktueller Release-Gate
- `main` enthält Release `v0.3.20` einschließlich Familienruhe-Übersicht und read-only-Schichtzentrale.
- Die neue Darstellung ist auf Desktop (1280 CSS-Pixel) und im mobilen 390×844-Viewport geprüft; Übersicht und Wandmodus bleiben ohne horizontalen Überlauf.
- Die letzte CI-/Deploy-Prüfung auf `main` ist erfolgreich. Der verbleibende externe Gate ist die getrennte Rollenmatrix für Einladungen und Datenzugriff.
- Das Supabase-Projekt `FamSchicht` (`kryxhpklrugceiwlrofm`) meldet weiterhin `INACTIVE`. Bis zur Reaktivierung bleiben Live-RLS und Realtime unverändert owner-only.

## Aktive Reihenfolge
1. Einladungserzeugung und atomare Einladungsannahme mit separater Einstellungen-UI verifizieren; Widerruf bleibt als Service vorhanden.
2. Zugriffsmatrix mit getrennten Owner-/Partner-/Coparent-/Fremdkonten ausführen.
3. Erst nach erfolgreicher Matrix Live-RLS für die konkret benötigten Rollen erweitern.
4. Realtime-Synchronisierung nach stabiler Rechtebasis ergänzen.
5. Google-/Outlook-/ICS-Integration anschließend modular anbinden.
6. UI/UX weiter ausbauen; Terminverschiebung ist für Desktop/Touch mit zugänglichem Fallback umgesetzt.

## Qualitäts-Gates
Jedes Paket: Tests -> Build -> Deployment/CI prüfen. Fehler stoppen die Feature-Reihenfolge.

## Sicherheitsgrenze
- Live bleibt derzeit owner-only.
- Keine freien Membership-Schreibrechte aus dem Browser.
- Einladungs-Tokens werden nur gehasht gespeichert; der rohe Token ist ein Bearer-Geheimnis.
- Repository-Zielentwürfe für Mehrbenutzer-RLS nicht ungeprüft auf Produktion anwenden.
- Keine echten sensiblen Familiendaten vor abgeschlossener Mehrbenutzer-/RLS-Testmatrix.

## WORK QUEUE
### READY
- Keine sichere Live-Aktion ist aktuell bereit: Für die Rollenmatrix müssen zuerst ein erreichbares Supabase-Projekt und vier getrennte synthetische Testkonten verfügbar sein.

### WAITING
- Supabase-Projekt reaktivieren bzw. erreichbar machen und getrennte Testkonten für Owner, Partner, Coparent und Fremdkonto bereitstellen; danach die in `docs/INVITATION_FLOW.md` definierte Zugriffsmatrix ausführen. Es wurden dafür keine echten Familiendaten verwendet.
- Nach Abschluss/Merge des Dienstplanimports: Coparent-Kalenderansicht für Anna, ausschließlich lesend und begrenzt auf Umgangszeiten mit den Kindern (`source: custody`), Schule, Hobbys/Sport und Geburtstage bzw. ausdrücklich freigegebene Kinderfeiern. Schichten/Dienstpläne, allgemeine oder private Termine sowie Einstellungen und Verwaltungsfunktionen bleiben verborgen. Umsetzung erst nach Zugriffsmatrix mit getrennten Konten; RLS muss denselben Filter serverseitig erzwingen. Bis dahin bleibt Live owner-only.
- Repo-weites Architektur-/Security-Audit nach Abschluss der ersten sicheren Mehrbenutzer-Synchronisierung.
- End-to-End-Mehrbenutzer-Audit mit owner/partner/coparent; Voraussetzung: Einladungsfluss und Kalender-Synchronisierung für mehrere Konten fertig.
- Meilenstein-Audit vor Nutzung echter Familiendaten; Voraussetzung: RLS-Testmatrix vollständig.

### DONE
- Basis-App auf GitHub Pages lauffähig.
- Magic-Link-Auth.
- Owner-only Haushalts-Setup im Client.
- Owner-only Supabase-Persistenz für `calendar_events`.
- Data-API-Grants gehärtet.
- Zentrales Haushaltsmitglieder-Domänenmodell.
- Owner-only Supabase-Persistenz für Kalender-Personen über `household_members`.
- Owner-only Mitgliederverwaltung für Kalenderpersonen: Anlegen und Bearbeiten von Name, Typ, Farbe und Schichtberechtigung mit stabilen IDs.
- Schichtfilter, Darstellung und Persistenz verwenden stabile `ownerId`; Legacy-Namen bleiben Fallback.
- Sicherer Einladungs-/Beitrittsfluss fachlich dokumentiert und serverseitig umgesetzt.
- Getesteter Client-Domänenvertrag für E-Mail, Rolle und opaken Token.
- Privater Einladungsspeicher live installiert; Browserrollen haben keinen Zugriff.
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



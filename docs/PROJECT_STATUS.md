# PROJECT STATUS

## Update 14.10.2026 – Gemeinsame In-App-Bestätigungen
- Serienkonflikte, Dienstplan-Ersetzung, Umgangsrhythmus, JSON-/ICS-Import und Belohnungslöschung verwenden jetzt denselben zugänglichen modalen Bestätigungsdialog wie das Terminlöschen; native blockierende `confirm()`-Aufrufe sind aus dem App-Code entfernt.
- Bestätigungsdialoge sperren den Hintergrund mit `inert`, halten Tab/Shift+Tab im Dialog, deaktivieren während der Verarbeitung gegen Doppelklicks und geben den Fokus an stabile Auslöser oder den Kalender zurück.
- Die ausgelieferten Module, die sichtbare App-Version und die Paketmetadaten stehen auf `v0.3.14`; Regressionstests: 220 bestanden.
- Der Service-Worker verwendet passend zum Cache-Bust den Shell-Cache `famschicht-shell-v0.3.14`, damit ein neues Release auch den Offline-App-Shell-Stand invalidiert.
- `Home` und `End` werden auch an Wochenrändern als Kalendernavigation abgefangen, damit ein erreichter Rand nicht den Browser-Scroll über die App übernimmt.
- Dienstplan-Schnellerfassung, Personenauswahl, Konfliktbestätigung, Monatsende und owner-only Haushalts-/Einladungsaktionen geben den Fokus nach dem Rendern an den nächsten sinnvollen Kontext zurück.
- Schichtvorlagen, Sollstunden, Dienstplan-OCR, JSON-/ICS-Transfer, Feiertage, Darstellung und Belohnungen behalten nach Status-Rerendern ihren Tastaturkontext; laufende OCR meldet den Fortschritt zusätzlich als programmatisch fokussierbaren Status.
- Fehlerpfade in Schichtvorlagen, Sollstunden, Dienstplanprüfung, Umgangsrhythmus und Termindialogen öffnen nach der Meldung das betroffene Korrekturfeld; Fokusziele in Disclosure-Bereichen öffnen deren Bereich vorher.
- Beim Öffnen der Dienste-Ansicht bleibt der Einstiegsfokus auf dem sichtbaren Starttag-Feld der Schnellerfassung.
- Sichtbare Kalendertage verwenden ein roving Tab-Ziel; Pfeil-, Home- und End-Tasten verschieben den Fokus semantisch über den Kalender.
- Ansichtswechsel, Monatsnavigation und Kalenderfilter geben den Fokus nach dem Rendern an den neuen Kontext zurück; die Filter-Aufklappung bleibt dabei geöffnet.
- Der Laptop-Browserlauf mit synthetischem Umgangstermin bestätigt den Dialog auch über der Einstellungsansicht: Fokus auf „Abbrechen“, `inert` für Kalender und Einstellungen sowie Rückgabe an „Rhythmus eintragen“ nach dem Abbruch; es wurde nichts gespeichert oder gelöscht.
- Alle Dialog-Shells tragen jetzt eine programmatische Beschreibung; Lösch- und Bestätigungsdialoge markieren laufende Speicherungen mit `aria-busy` und halten den Fokus während des asynchronen Vorgangs im Dialog.

## Update 14.10.2026 – Zugängliche Löschbestätigung
- Das Löschen eigener Kalendertermine verwendet jetzt einen integrierten modalen Bestätigungsdialog statt des blockierenden Browser-`confirm()`-Dialogs.
- Der Dialog nutzt die bestehende `aria-modal`-/`inert`-/Tab-Fokusführung, setzt den Fokus sicher zurück und bietet bei entfernten Karten einen stabilen Fallback; Löschziele tragen den jeweiligen Termin im zugänglichen Namen.
- Die sichtbare App-Version und der Modul-Cache-Bust stehen auf `v0.3.6`; Regressionstests, Syntaxprüfung, Produktions-Build und Asset-Budget bleiben als Abschluss-Gates verpflichtend.

## Update 14.10.2026 – Statisches Quell-Gate
- CI prüft jetzt vor den Regressionstests alle JavaScript-/MJS-Quellen des App-, Test-, Script- und PWA-Pfads mit Node.js `--check`.
- Das neue Gate benötigt keine zusätzliche Laufzeitabhängigkeit; ein vollständiges ESLint-Gate bleibt ausdrücklich eine separate spätere Qualitätsentscheidung.
- Regressionstests: 210 bestanden; Syntaxprüfung, Produktions-Build und Asset-Budget erfolgreich.

## Update 14.10.2026 – Sichere Household-Fehlerbehandlung
- Haushalts-/Datenbankfehler werden in den Einstellungen nur noch als neutrale, handlungsorientierte Meldung angezeigt; technische Fehler bleiben für die Diagnose in der Konsole.
- Die Erstellung eines privaten Haushalts überschreibt keine Providerdetails in der Nutzeroberfläche und lässt den lokalen Kalender als sicheren Fallback bestehen.
- Regressionstests: 210 bestanden; Produktions-Build und Asset-Budget erfolgreich.

## Update 14.10.2026 – Cache-Bust- und Versionskonsistenz
- Die drei ausgelieferten App-Module verwenden jetzt gemeinsam `v0.3.5`; die sichtbare FamSchicht-Versionsanzeige bleibt damit auf demselben Release-Stand.
- Ein frisch gestarteter lokaler Vite-Browserlauf liefert `auth-ui.js?v=0.3.5`, `household-ui.js?v=0.3.5` und `main.js?v=0.3.5` und zeigt `Familienplaner · v0.3.5`.
- Regressionstests: 208 bestanden; Produktions-Build und Asset-Budget erfolgreich.

## Update 14.10.2026 – Live-Projektstatus
- Die autoritative Supabase-Management-API meldet das Projekt aktuell als `INACTIVE`.
- Read-only-Abfragen auf Migrationen und Tabellen liefen in einen Verbindungstimeout; die getrennte Owner-/Partner-/Coparent-/Fremdkonto-Matrix ist deshalb noch nicht ausgeführt.
- Security- und Performance-Advisors melden keine Lints. Die Edge Function `household-invitations` ist aktiv und die lokale/deployte Fassung stimmt überein.
- Ein lokaler Supabase-Sicherheits-Preflight schützt jetzt owner-only-RLS-Migrationen, private Einladungstabellen, den authentifizierten Edge-Grenzpfad und das Fehlen von Secret-Material im Client; die Live-Matrix bleibt davon ausdrücklich unberührt.
- Supabase-URL und Publishable Key werden aus der Build-Konfiguration gelesen. Ohne Variablen bleibt die App kontrolliert im lokalen Modus; GitHub Pages erhält die Werte ausschließlich über Repository-Variablen.

## Update 14.10.2026 – PWA-/iPhone-Installation
- Die Einstellungen erklären die Installation auf iPhone/iPad über „Teilen → Zum Home-Bildschirm“ und zeigen bei unterstützten Browsern den nativen Installationsdialog.
- Standalone-/bereits installierte Sitzungen werden erkannt; abgebrochene oder nicht verfügbare Installationsdialoge bleiben als verständlicher Status sichtbar.
- Hauptansichten, Einstellungen und Termin-Dialog wurden im 390×844-Viewport ohne horizontalen Überlauf geprüft. Lokale Regressionstests: 206 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Startpfad und Build-Performance
- Die Dienstplan-OCR wird erst beim Start eines Imports als eigener Vite-Chunk geladen; der normale Kalenderstart lädt sie nicht mehr in das Initialbundle.
- `npm run check:build` prüft im CI ein JS-/CSS-Roh- und gzip-Budget. Der lokale Build liegt aktuell bei 258.172 Bytes JS roh / 74.921 Bytes gzip sowie 62.940 Bytes CSS roh / 12.297 Bytes gzip; das Budget ist erfüllt.
- Lokale Regressionstests, Produktions-Build und Performance-Gate sind erfolgreich. Ein echtes Profiling auf iPhone-Hardware bleibt als externer UX-Schritt offen.

## Update 14.10.2026 – Lokale Datenintegrität
- Die lokale Kalenderablage akzeptiert jetzt nur synthetische Ereignisse mit stabiler ID, unterstütztem Typ, echtem Datum und gültigen Uhrzeiten.
- Beschädigte oder strukturell unvollständige Payloads werden nicht überschrieben; die bestehende sichtbare Storage-Recovery bleibt der Wiederherstellungspfad.

## Update 14.10.2026 – Dynamischer Dialogfokus
- Dialoge speichern jetzt stabile Trigger-Schlüssel statt veralteter DOM-Referenzen; nach einem dynamischen Rendern wird der neue Auslöser wieder fokussiert.
- Beim Bearbeiten erhält das sichtbare Datumsfeld den Einstiegsfokus; die frühere Fokussierung eines geschlossenen „Weitere Optionen“-Bereichs ist entfernt.
- Browserprüfung mit synthetischem Termin: Bearbeiten öffnet mit Fokus auf `Von`, Abbrechen gibt den Fokus an „Synthetischer Familientermin bearbeiten“ zurück. Lokale Regressionstests: 207 bestanden.

## Update 14.10.2026 – Supabase-Laufzeitkonfiguration
- `src/auth.js` enthält keine fest verdrahtete Projekt-URL oder Schlüssel mehr; `src/runtime-config.js` liest `VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Lokale Entwicklung nutzt `.env.local` nach Vorlage aus `.env.example`. Fehlen die Variablen, stellt ein No-op-Client den lokalen Modus ohne Cloud-Versuche bereit.
- Der Pages-Workflow übernimmt `FAMSCHICHT_SUPABASE_URL` und `FAMSCHICHT_SUPABASE_PUBLISHABLE_KEY` als Build-Variablen. Lokale Regressionstests: 206 bestanden; Produktions-Build erfolgreich; die Live-Matrix bleibt wegen `INACTIVE`-Projekt offen.

## Update 14.10.2026 – Supabase-Sicherheits-Preflight
- Die CI prüft jetzt statisch die owner-only-`household_members`-RLS-Policies inklusive `USING`/`WITH CHECK`, die privaten Einladungsgrants, Hash-/Lock-/Einmalannahme und den authentifizierten Edge-Function-Grenzpfad.
- Client-Code darf kein Service-Role-/Secret-Material enthalten; erläuternde Kommentare werden dabei nicht als Schlüsselmaterial gewertet.
- Lokale Regressionstests: 202 bestanden; Produktions-Build erfolgreich. Die getrennte Live-Matrix mit Owner, Partner, Coparent und Fremdkonto bleibt wegen `INACTIVE`-Projekt offen.

## Update 14.10.2026 – Tastaturziele für Kalendertage
- Jeder sichtbare Kalendertag ist jetzt ein eigenes beschriftetes Tastaturziel mit lokalisiertem Datum; der fokussierte Tag trägt zusätzlich `aria-current="date"`.
- Die bestehende Maus-/Touch-Auswahl bleibt erhalten, während Bearbeiten, Löschen und Verschieben weiterhin getrennte Interaktionen bleiben.
- Sichtprüfung: 31 Tagesbuttons bei 390×844, Auswahl vom 14. auf den 15. Oktober und kein horizontaler Überlauf; lokale Regressionstests: 190 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Auth-Fehlerpfad
- Fehler aus Linkprüfung, Linkanforderung, Einladungsannahme und Abmeldung erscheinen als zugängliche Status-/Alert-Meldungen im Anmeldedialog statt als blockierende Browser-Alerts.
- Provider-Fehlerdetails werden im Auth-UI nicht mehr roh ausgegeben; die Konsole bleibt für die technische Session-Diagnose getrennt von der Nutzeroberfläche.
- Sichtprüfung: synthetisch ungültiger Login-Link erzeugt `role="alert"`/`aria-live="assertive"`, der Fokus bleibt im Eingabefeld und 390×844 bleibt ohne horizontalen Überlauf.
- Lokale Regressionstests: 191 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Modal-Fokusisolation
- Termin-, Verschiebe- und Schichtdialoge isolieren den Kalenderhintergrund jetzt mit `aria-hidden` und `inert`; der Skip-Link wird während eines Dialogs ebenfalls aus dem Tab-Pfad genommen.
- Die Dialoge bleiben als eigene `aria-modal="true"`-Ziele erreichbar, während die bestehende Fokus-Rückgabe beim Abbrechen, Speichern und Escape erhalten bleibt.
- Sichtprüfung: Termin-Dialog im 390×844-Viewport mit isoliertem Hintergrund und ohne horizontalen Überlauf; lokale Regressionstests: 192 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Modal-Tastaturfokus
- Alle aktiven `aria-modal="true"`-Dialoge halten Vorwärts- und Rückwärts-Tabulatornavigation innerhalb des Dialogs; bei dialogeigenen Sonderfällen bleibt ein fokussierbares Fallback vorhanden.
- Sichtprüfung im 390×844-Viewport: Tab vom letzten Speichern-Ziel zurück zum ersten Datumsfeld, Shift+Tab vom ersten Feld zurück zu „Speichern“, Kalenderhintergrund `inert` und kein horizontaler Überlauf.
- Lokale Regressionstests: 198 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Dienstplan-Dateivalidierung
- Der lokale Fotoimport akzeptiert jetzt vor dem OCR-Start ausschließlich JPEG-/PNG-Dateien, begrenzt vier Dateien auf insgesamt 35 MB und weist SVG bzw. andere Formate mit einer verständlichen Fehlermeldung ab.
- Die Prüfung liegt als eigener Domänenhelfer vor, wird zusätzlich direkt vor dem OCR-Worker wiederholt und berücksichtigt auch Browserfälle mit leerem MIME-Typ, sofern die Dateiendung eindeutig JPEG/PNG ist.
- Die bestätigte Vorschau und der lokale Speicherdienst teilen jetzt zusätzlich die Datums-/Kürzelprüfung; ungültige Februartage, leere Namen und Status-/Nicht-Dienst-Kürzel werden vor der Kalenderprojektion abgewiesen.
- Sichtprüfung mit synthetischem SVG: sofortige Ablehnung ohne OCR-Start; direkte OCR-Aufrufe werden vor dem Worker ebenfalls abgefangen; lokale Regressionstests: 197 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Lokale Punkte und Belohnungen
- Aufgaben und Routinen können einen ganzzahligen Punktwert erhalten; erledigte Einzelaufgaben sowie erledigte Vorkommen wiederkehrender Einträge werden je stabiler Kalenderperson summiert.
- Belohnungsziele werden in den Einstellungen angelegt, lokal gespeichert und im Übersichts-Dashboard mit Fortschrittsbalken je Person dargestellt.
- Der Datenfluss bleibt bewusst lokal (`rewards.js`/`localStorage`); es gibt keine Supabase-, RLS- oder Auth-Erweiterung und keine Behauptung geräteübergreifender Synchronisierung.
- Sichtprüfung: synthetisches 10-Punkte-Ziel, synthetische erledigte 5-Punkte-Aufgabe, Fortschritt 5/10 und 390×844 ohne horizontalen Überlauf.
- Lokale Regressionstests: 189 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Accessibility- und lokale Recovery-Härtung
- Lokale Kalenderdaten werden jetzt mit einem expliziten Ladezustand gelesen: beschädigte oder nicht verfügbare Browser-Speicher werden nicht still als leer behandelt und nicht automatisch überschrieben.
- Schreibfehler im lokalen Modus zeigen einen zugänglichen, schließbaren Live-Hinweis mit JSON-Wiederherstellung als nächstem sicheren Schritt; die bisherigen Cloud-/Offline-Fallbacks bleiben erhalten.
- Fehler aus Verschieben, Speichern, Löschen, Dienstplan-, Umgangs- und Vorlagenabläufen werden als `role=alert` im App-Kontext statt ausschließlich über blockierende Browser-Alerts angezeigt.
- Termin-, Verschiebe- und Schichtdialoge setzen den Fokus beim Öffnen auf das erste sinnvolle Feld, schließen per Escape/Abbrechen und geben den Fokus an das auslösende Element zurück.
- Sichtprüfung: Dialogfokus und Escape auf Desktop; 390×844 inklusive Einstellungen ohne horizontalen Überlauf. Vollständige Accessibility-Abnahme aller Kalenderinteraktionen sowie echte iPhone-Home-Screen-Prüfung bleiben offen.
- Lokale Regressionstests: 184 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Dienstplanimport-Recovery
- Die Dienstplanansicht wurde mit synthetischen lokalen Bilddateien geprüft: Upload-Schaltfläche, lokaler OCR-Hinweis, sichere Fehlermeldung bei nicht erkannten Kürzeln und erneute Auswahl derselben Datei funktionieren sichtbar.
- OCR-/Bildlesefehler werden auf eine verständliche JPEG-/PNG-Wiederholungsempfehlung abgebildet; Provider-interne Fehlermeldungen gelangen nicht in die Oberfläche.
- Die Datei-Auswahl wird nach jedem Lauf zurückgesetzt, damit ein fehlgeschlagener Import ohne Umweg wiederholt werden kann. Die Bilddatei wird nicht persistiert.
- Desktop-Prüfung bei 1280 CSS-Pixeln: kein horizontaler Überlauf. Die vollständige Happy-Path-Abnahme mit einem geeigneten synthetischen Rasterfoto und die iPhone-Viewport-Prüfung bleiben offen.
- Lokale Regressionstests: 159 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Read-only-Kalenderquellen
- ICS-Importe werden über einen gemeinsamen Quellenvertrag mit `ics`-, Google- und Microsoft-Adapter-IDs vorbereitet; Google-/Microsoft-OAuth bleibt bis zur Provider-Konfiguration bewusst unverbunden.
- Externe Termine erhalten eine stabile Quellen-ID und externe UID. Exakte Wiederholungen werden übersprungen, gleiche Kalender-Slots mit abweichendem Inhalt als Konflikt gemeldet und nicht still überschrieben.
- Importierte Termine bleiben read-only und behalten Quellenmetadaten auch nach dem bestehenden owner-scoped Supabase-`metadata`-Roundtrip.
- Sichtprüfung mit synthetischer ICS-Datei: Termin sichtbar, keine Bearbeiten-/Löschen-/Verschieben-Ziele; erneuter Import meldet „Keine neuen ICS-Termine gefunden.“
- Lokale Regressionstests: 167 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Feiertage und Bundesland
- Die Einstellungen bieten eine lokale Auswahl für „Nur bundesweite Feiertage“ und die 16 deutschen Bundesländer.
- `holidays.js` berechnet feste und bewegliche Feiertage deterministisch, ergänzt regionale Tage und kennzeichnet alle Einträge als read-only aus der Quelle `holiday-calendar`.
- Feiertage werden bei der Kalenderdarstellung für den relevanten Jahresbereich erzeugt und nicht als persönliche oder serverseitige Termine dupliziert; die Auswahl bleibt lokal auf dem Gerät.
- Lokale Regressionstests decken 2026-Daten, Bayern, den sächsischen Buß- und Bettag sowie den Speicher-Roundtrip ab. Supabase-Schema, RLS und Auth bleiben unverändert.

## Update 14.10.2026 – Wand-/Tablet-Darstellung
- Einstellungen bieten einen lokal gespeicherten Wandmodus für große gemeinsame Displays.
- Im Wandmodus wird der Kalender groß und ruhig dargestellt; Änderungs-, Lösch- und Verschiebeziele werden für alle Karten deaktiviert, damit ein Wanddisplay nicht versehentlich Daten verändert.
- Ein sichtbarer „Wandmodus beenden“-Rückweg stellt die Standardansicht ohne Datenänderung wieder her.
- Sichtprüfung mit synthetischen Daten bei 1280 CSS-Pixeln: Wandmodus sichtbar, Navigation ausgeblendet, read-only-Hinweis und Rückweg vorhanden, kein horizontaler Überlauf. Lokale Regressionstests: 175 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – ICS-Quellen pro Kalenderperson
- Der lokale ICS-Import bietet jetzt eine optionale Zuordnung zu „Gemeinsamer Kalender“ oder einer vorhandenen Kalenderperson.
- Die Zuordnung wird als Quellen-ID, `memberId` und Label im bestehenden read-only-Metadatenvertrag erhalten; derselbe externe Termin bleibt je Quelle deduplizierbar.
- Es gibt weiterhin keinen Google-/Microsoft-OAuth- oder bidirektionalen Schreibpfad. Supabase-Schema, RLS und Auth bleiben unverändert.

## Update 14.10.2026 – JSON-Sicherungswiederherstellung
- Einstellungen bieten neben JSON-Export jetzt eine bestätigungspflichtige JSON-Wiederherstellung.
- Das Importmodul validiert FamSchicht-Format, Version, Datum, Bereich und Uhrzeit, verwirft unbekannte Ereignisfelder und meldet gleiche IDs mit geändertem Inhalt als Konflikt.
- Exakte ID-/Inhalts-Duplikate werden nicht erneut gespeichert; dieselbe Datei kann nach einem Fehler erneut ausgewählt werden. Sichtprüfung mit synthetischer Sicherung meldete „1 Termine wurden aus der JSON-Sicherung wiederhergestellt.“.
- Lokale Regressionstests: 180 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Terminverschiebung
- Kalendertermine können per Desktop-Drag-and-Drop oder Touch-Pointer auf einen anderen Tag verschoben werden.
- Ein beschrifteter Verschieben-Dialog bietet denselben Vorgang als Tastatur-/Touch-Fallback; die Verschiebung erhält die stabile ID, `ownerId`, Uhrzeiten, Nachtdienstlogik und den vollständigen Mehrtagesbereich. Wiederkehrende Erledigungsdaten werden mit dem Anker verschoben; einzelne Umgangswochenenden behalten ihren Serienanker.
- Regressionstests decken Einzel-, Mehrtages-, Nacht-, wiederkehrende und Umgangsverschiebungen ab. Sichtprüfung mit synthetischem Termin: 14. → 16. Oktober, neuer Fokus auf dem Zieltag; 390×844 ohne horizontalen Überlauf.
- Lokale Regressionstests: 155 bestanden; Produktions-Build erfolgreich.

## Update 14.10.2026 – Synchronisationsstatus und Bedienbarkeit
- Die Kalenderoberfläche unterscheidet jetzt sichtbar zwischen lokalem Modus, laufender Synchronisierung, erfolgreicher Owner-Synchronisierung, Offline-Zustand und einem fehlgeschlagenen Cloud-Versuch mit lokalem Fallback.
- Bei wiederhergestellter Netzwerkverbindung wird die Owner-Verbindung erneut geprüft; Speicherfehler setzen den Status auf einen sichtbaren Fehler statt still auf einen veralteten Erfolgszustand.
- Der Einstellungenbereich besitzt Dialogsemantik, `aria-hidden`-Umschaltung, Skip-Link, beschriftete Hauptnavigation, `aria-pressed`-Filter und Escape-Schließen. Kalender- und Heute-Karten trennen Bearbeiten und Löschen in eigene Tastaturziele. Eine vollständige Accessibility-Abnahme aller Kalenderinteraktionen bleibt offen.
- Lokale Regressionstests: 148 bestanden; Produktions-Build erfolgreich. Desktop-Dialogstatus und 390×844-Viewport wurden sichtbar geprüft; horizontaler Überlauf trat nicht auf.

## Update 14.10.2026 – Owner-Mitgliederverwaltung
- Der Owner kann in den Einstellungen Kalenderpersonen anlegen und bestehende Personen ändern: Anzeigename, fachlicher Typ (`adult`, `child`, `guest`), Farbe und Schichtberechtigung.
- Neue und geänderte Personen werden über den bestehenden owner-scoped `household_members`-Service mit stabiler Mitglieder-ID gespeichert; `memberships` bleibt das getrennte Modell für authentifizierte Zugriffsrollen.
- Eine Löschaktion ist noch nicht freigegeben. Vorher braucht es eine explizite Umhängungs-/Archivierungsregel für vorhandene Termine und Schichten mit `ownerId`; dadurch werden keine bestehenden Kalenderreferenzen still ungültig.
- Lokale Regressionstests: 144 bestanden; Produktions-Build erfolgreich. Desktop-/390×844-Layout und die ausgeloggte Einstellungenansicht wurden sichtbar geprüft. Eine eingeloggte Cloud-Ansicht konnte wegen des aktuell `INACTIVE` gemeldeten Supabase-Projekts nicht ausgeführt werden.

## Update 14.10.2026 – Mitgliederlegende und Initialen
- Das zentrale `household_members`-Modell liefert neben stabiler ID und `colorKey` jetzt auch sichere Initialen für die sichtbare Mitgliederlegende.
- Die Legende zeigt synthetisch geprüft pro Person einen kleinen Avatar; die bestehende owner-only Persistenz und die Trennung von `household_members` und Auth-`memberships` bleiben unverändert.
- Die PWA-Shell optiert mit `viewport-fit=cover` zusammen mit der vorhandenen Safe-Area-CSS für iPhone-Inset-Bereiche; die echte Home-Screen-Installation bleibt eine externe Prüfung.
- Lokale Regressionstests: 143 bestanden; Produktions-Build erfolgreich. Desktop-Legende und 390×844-Viewport wurden sichtbar geprüft; horizontaler Überlauf trat nicht auf.

## Update 14.10.2026 – Schichtserien und Vorlagen
- Die Dienste-Ansicht kann wiederkehrende Wochentage in konkrete, unabhängig bearbeitbare Schichten mit stabiler `ownerId` auflösen; vorhandene identische Einträge werden übersprungen.
- Systemvorlagen für Früh-, Spät-, Zwischen- und Nachtdienst sowie Statuswerte stehen bereit. Eigene Vorlagen werden ausschließlich lokal auf dem Gerät gespeichert.
- Die Serienerfassung berücksichtigt Nachtdienste, ganztägige Statuswerte und den bestehenden Konflikthinweis für Familien-/Kindertermine; Supabase-Schema, RLS und Edge Functions bleiben unverändert.
- Lokale Regressionstests: 135 bestanden; Produktions-Build erfolgreich. Die Serien-/Vorlageninteraktion wurde auf Desktop sowie im 390×844-Viewport geprüft; horizontaler Überlauf trat nicht auf.

## Update 14.10.2026 – Optionale Soll-/Ist-Stunden
- Die Monatsübersicht kann pro schichtberechtigter Person ein optionales Monats-Soll anzeigen und die Differenz zu den tatsächlich erfassten Ist-Stunden als unter/erreicht/über Soll ausweisen.
- Sollwerte werden ausdrücklich nur lokal auf dem Gerät gespeichert; Kalenderereignisse, Supabase-Schema, RLS und Edge Functions bleiben unverändert.
- Lokale Regressionstests: 138 bestanden; Produktions-Build erfolgreich. Das Speichern eines synthetischen Sollwerts und die mobile Darstellung wurden sichtbar geprüft.

## Update 14.10.2026 – Haushaltsroutinen
- Wiederkehrende Routine-Einträge können einer Person zugewiesen, im Kalender gefiltert und pro Vorkommen erledigt werden; Aufgaben und Routinen teilen sich dabei denselben sicheren Completion-Roundtrip.
- Routine-Vorkommen erscheinen im Übersichts-Dashboard neben Aufgaben, werden im ICS-Austausch als eigene Kategorie erhalten und bleiben im bestehenden owner-only Datenfluss.
- Der damalige Stand ließ das optionale Punkte-/Belohnungsmodul noch offen; es ist inzwischen als lokaler Punkte-/Belohnungsblock ergänzt (siehe aktuellen Status oben).

## Update 14.10.2026 – Wiederkehrende Aufgaben
- Wiederkehrende Aufgaben werden im Übersichts-Dashboard als einzelne Vorkommen für Heute, überfällige Tage und die nächsten Wochen angezeigt.
- Das Erledigen eines Vorkommens speichert nur dessen Datum in `completedDates`; künftige Vorkommen bleiben offen. Einzelaufgaben behalten den bisherigen booleschen `completed`-Vertrag.
- Der Vorkommensstatus wird über lokale Persistenz, den bestehenden Supabase-`metadata`-Roundtrip und einen FamSchicht-ICS-Erweiterungsschlüssel erhalten; Schema, RLS und Edge Function bleiben unverändert.
- Lokale Regressionstests: 130 bestanden; Produktions-Build erfolgreich. Die Aufgabenliste und Monatsansicht wurden mit synthetischen Daten im 390×844-Viewport sichtbar geprüft.

## Update 14.10.2026 – Dienstplanung lokal vervollständigt
- Die Dienste-Ansicht zeigt eine Monatsübersicht pro schichtberechtigter Person mit angerechneten Stunden und separat sichtbaren OZ-Stunden.
- Die Schnellerfassung erkennt Überschneidungen mit Familien-/Kinderterminen, einschließlich ganztägiger, mehrtägiger und über Mitternacht laufender Einträge. Der Nutzer kann den Dienst nach dem Hinweis trotzdem speichern.
- `Krank` ist neben `Frei`, `Urlaub` und `Fortbildung` als ganztägiger Status erfassbar. Die Änderung bleibt im bestehenden owner-only Datenfluss und benötigt keine Migration.
- Lokale Regressionstests: 123 bestanden; Produktions-Build erfolgreich. Die Dienste- und Aufgabeninteraktion wurde im lokalen 390×844-Viewport geprüft; die echte iPhone-Home-Screen-Installation bleibt offen.

## Update 14.10.2026 – Aufgaben im Familien-Dashboard
- Aufgaben werden als eigener Termintyp mit Personenzuweisung, Fälligkeit, Priorität und Erledigt-Status geführt.
- Offene Aufgaben erscheinen im Übersichts-Dashboard und können dort ohne erneutes Öffnen des Editors als erledigt markiert werden.
- Aufgabenfelder werden über die bestehende Kalender-Persistenz roundtrip-sicher in `metadata` gespeichert; RLS und Schema bleiben unverändert.
- Der damalige Aufgabenstand ließ Punkte noch offen; Punktwerte und lokale Belohnungsziele sind inzwischen ergänzt (siehe aktuellen Status oben).

## Update 14.10.2026 – Lokaler Daten-/ICS-Austausch
- Einstellungen bieten JSON-Sicherung, ICS-Export und einen bestätigungspflichtigen ICS-Import mit Duplikatprüfung.
- Ganztägige, mehrtägige, wiederkehrende und über Mitternacht laufende Termine werden im ICS-Domänenvertrag abgebildet; `Europe/Berlin` bleibt als lokale Kalenderzeitzone erhalten.
- Lokale Regressionstests: 121 bestanden; Produktions-Build erfolgreich. OAuth-Synchronisierung mit Google/Outlook sowie echte iPhone-/PWA-Installationsprüfung bleiben externe/offene Schritte.

## Update 29.09.2026 – Mobile Kalenderbedienung
- Dienste werden im Bereich „Dienste“ schnell erfasst und bestehende Schichten per Tipp mit Datum, Zeit, Diensttyp und Person bearbeitet.
- Bestehende Familien- und Schichttermine zeigen zuerst Datum und Uhrzeit; seltene Felder liegen unter „Weitere Optionen“.
- Monatskacheln zeigen kurze Dienstkürzel beziehungsweise „Papa“, während die Tagesliste volle Bezeichnungen bietet.
- Filter sind einklappbar, Umgangsrhythmus ist in Einstellungen, und das Querformat hat ein kompaktes eigenes Layout.
- Umgangsblöcke sind standardmäßig Freitag bis Sonntag, können aber über Start- und Enddatum frei verschoben werden. Live-Rechte/RLS bleiben unverändert owner-only.

## Update 30.09.2026 – Lokaler Dienstplanimport (in Prüfung)
- Dienstplanbilder werden clientseitig per deutscher OCR ausgewertet und vor dem Speichern manuell überprüfbar gemacht.
- Bestätigte Schichten bleiben ausschließlich auf dem Gerät. Die eigene Zeile wird bei eindeutiger Zuordnung zu einem Schichtmitglied in die Kalenderansicht projiziert.
- Die Dienste-Kachel zeigt zeitlich überlappende Namen (nur Vornamen); nicht angerechnete OZ-Dienste stehen separat. SG wird ignoriert.
- Keine Schema-, RLS-, Auth- oder Supabase-Änderung.
- Status: Feature-Branch; 107 Tests und PR-CI (einschließlich Build) sind grün. Sichtbare Prüfung der Desktop- und iPhone-Ansicht steht noch aus.

Stand: 28.09.2026

## Ziel
FamSchicht ist ein Familien- und Schichtkalender für gemeinsame Kindertermine, Umgangszeiten und persönliche Schichtplanung.

## Aktueller Funktionsstand
- Vite-Web-App auf GitHub Pages.
- Monats-, Wochen-, Tages- und Heute-Ansicht.
- Familien- und Schichttermine, mehrtägige Ereignisse, Geburtstage und Wiederholungen.
- Schicht-Schnellerfassung mit Früh-/Spät-/Nachtdienst.
- Zentrales Haushaltsmitglieder-Domänenmodell mit stabilen IDs.
- Kalender-Personen werden owner-only in Supabase `household_members` persistiert und bleiben fachlich von Auth-`memberships` getrennt.
- Neue Schichten speichern serverseitig nur `ownerId`; Legacy-Namen bleiben ausschließlich als Migrationsfallback lesbar.
- Supabase Magic-Link-Anmeldung und owner-only Haushalts-/Kalendersynchronisierung sind implementiert.
- Öffentliche Tabellen sind RLS-geschützt; Browser-Grants bleiben minimal.
- Ein getesteter Einladungs-Domänenvertrag erlaubt nur `partner` und `coparent`, normalisiert E-Mail-Adressen und behandelt Einladungs-Tokens als opake Bearer-Geheimnisse.
- Live existiert `private.household_invitations` für gehashte, ablaufende, widerrufbare und einmalig annehmbare Einladungen. Browserrollen haben darauf keinen Schema-/Tabellenzugriff.
- Fehlende FK-Indizes wurden live ergänzt und im Repository gespiegelt.

## Sicherheit
Die Live-Rechte bleiben bewusst owner-only. Mehrbenutzerrechte werden erst nach serverseitigem Einladungs-/Annahmepfad und erfolgreicher Zugriffsmatrix mit getrennten Konten erweitert. Keine service_role-/Secret-Schlüssel im Browser oder Repository.

## Bekannte Lücken
- Die Einladungs-UI ist im separaten Einstellungen-Bereich integriert; Erzeugung, Kopieren und Widerruf des zuletzt erzeugten Links sowie die atomare Annahme laufen über den serverseitigen Edge-/RPC-Pfad.
- Mehrbenutzer-RLS für `partner`/`coparent` ist noch nicht aktiviert.
- Eine Zugriffsmatrix mit getrennten Owner-/Partner-/Coparent-/Fremdkonten fehlt noch.
- Realtime-Synchronisierung zwischen mehreren Konten fehlt.
- Ein vollständiges ESLint-Gate existiert noch nicht; CI führt jetzt zusätzlich eine dependency-freie statische JavaScript-/MJS-Syntaxprüfung aus und behält Tests, Build, Deployment und Published-App-Verifikation bei.
- Punkte-/Belohnungsziele sind als bewusst lokaler Block umgesetzt; sie werden nicht nach Supabase synchronisiert.
- Google-/Outlook-OAuth und bidirektionale externe Synchronisation sind noch nicht umgesetzt; ICS bleibt der lokale, dateibasierte Austauschweg.

## Update 14.10.2026 – PWA-Shell und Offline-Fallback
- Ein Web-App-Manifest, installierbares Standalone-Display und ein network-first Service Worker mit App-Shell-Fallback sind im Repository vorhanden.
- Die lokale Status-/Retry-Oberfläche bleibt bei einem nicht verfügbaren Netzwerk erhalten; die echte iPhone-Home-Screen-Installation wurde in dieser Sitzung nicht ausgeführt.
- Lokale Regressionstests: 123 bestanden; Produktions-Build enthält Manifest, Service Worker und Icon.

## Nächster Schritt
Einladungsannahme und die UI-Regressionen mit getrennten Testkonten prüfen. Danach die Zugriffsmatrix ausführen und erst anschließend Mehrbenutzer-RLS aktivieren. Live-RLS bleibt bis zu deren Erfolg owner-only.

## Update 25.09.2026 – Owner-only Mitglieder-Persistenz
- `household_members` ist als eigene Supabase-Tabelle installiert und durch owner-only RLS geschützt.
- Kalender-Personen bleiben fachlich getrennt von Auth-`memberships`.
- Angemeldete Owner laden ihre persistierten Mitglieder; bei leerer Tabelle werden Bootstrap-Mitglieder einmalig angelegt.

## Update 25.09.2026 – Stabile Schichtzuordnung
- Filter, Kalenderdarstellung und Heute-Ansicht verwenden bei Schichten vorrangig `ownerId`.
- Neue/aktualisierte Schichten schreiben bei vorhandener `ownerId` keinen redundanten Anzeigenamen mehr.
- Legacy-Schichten ohne `ownerId` bleiben lesbar.

## Update 25.09.2026 – Sicherer Einladungsunterbau
- `docs/INVITATION_FLOW.md` definiert den serverseitigen, E-Mail-gebundenen Einmal-Token-Ablauf.
- Der Client-Domänenvertrag lehnt unzulässige Rollen, ungültige E-Mails und offensichtlich fehlerhafte Tokens ab.
- `private.household_invitations` speichert nur SHA-256-kompatible 64-stellige Token-Hashes und Statusdaten.
- `anon` und `authenticated` besitzen weder Schema-USAGE noch Tabellen-SELECT auf dem privaten Einladungsspeicher.
- Partner-/Coparent-Rechte wurden ausdrücklich noch nicht erweitert.


## Update 28.09.2026 – Übersicht und Kalender-UX
- Konto-/Haushaltseinrichtung ist strukturell vom Kalenderbereich getrennt.
- Kalenderoptik wurde an die bereitgestellte Referenz angelehnt: klare blaue Steuerung, sichtbares Tagesraster und kompakte mobile Darstellung.
- Terminarten unterstützen Allgemeiner Termin, Geburtstag, Schule, Sport, Arzt, Urlaub und Aufgabe mit eigener visueller Kennzeichnung.
- Personen- und Bereichsfilter werden auch in der Heute-Ansicht angewendet.
- Der mobile Termineditor ist ein einspaltiges, scrollbares Bottom-Sheet und bleibt oberhalb der mobilen Navigation bedienbar.
- Der Synchronisationsstatus ist auf mobilen Geräten sichtbar.


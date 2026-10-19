# Tests und Qualitätssicherung

## Aktueller CI-Vertrag

`.github/workflows/pages.yml` führt für Pushes und Pull Requests gegen `main` mit Node.js 22 `npm install`, `npm run check:source`, `npm test` und `npm run build` aus. Pages wird nur nach erfolgreicher Qualitätsprüfung aus Nicht-PR-Ereignissen veröffentlicht. Der Workflow prüft anschließend, ob die veröffentlichte URL das gebaute Vite-Bundle referenziert.

Nach dem Build prüft `npm run check:build` ein bewusst begrenztes Roh-/gzip-Budget für JS- und CSS-Assets. Der Dienstplan-OCR-Code wird erst beim Öffnen des Imports dynamisch geladen; das Budget schützt deshalb den Startpfad, ohne die OCR-Funktion zu entfernen.

Lokal:

```sh
npm test
npm run build
```

## Regressionstest-Schwerpunkte

- Kalenderdatum, Monats-/Wochen-/Tagesnavigation, Zeitzonen und Schichtzeiten.
- Schnelländerung und Bearbeitung: bestehende ID erhalten, aktualisieren statt duplizieren, Besitzer und Terminbereich erhalten.
- Mehrtägige, ganztägige und wiederkehrende Termine, einschließlich Datenbank-Roundtrip.
- Terminverschiebung: stabile ID/`ownerId`, vollständiger Mehrtagesbereich, Nachtdienstzeiten, wiederkehrende Erledigungsdaten und unveränderter Umgangsserienanker; zusätzlich sichtbarer Desktop-/390×844-Check für Drag-/Touch-/Fallback-Interaktion.
- Haushaltsmitglieder, stabile `ownerId`, Legacy-`owner`, Personen-/Kategorie-Filter, Initialen-/Farblegende sowie owner-only Anlegen/Bearbeiten von Name, Typ, Farbe und Schichtberechtigung.
- Authentifizierungsfehler, Magic-Link-Rückkehr und sichere Owner-only Datenflüsse; keine produktiven Konten in Tests.
- Nutzerfehler: kurze fachliche Validierung bleibt sichtbar, technische Transport-/Datenbankdetails fallen auf neutrale Meldungen zurück.
- iPhone/PWA-Verhalten bei Home-Screen-Login und Kalenderbedienung.
- Dienstplanimport: erkannte Codezeiten, häufige OCR-Verwechslungen (`FL/FI` → `F1`, `SI` → `S1`, `NS` → `N5`, `ZI` → `Z1`, aber `SL` bleibt Leitungsdienst), alternative OCR-Durchläufe, Nachtdienst-Überlappung über Mitternacht, Wunschfrei/Urlaub/Freizeitausgleich/SG-Ausschlüsse, lokale Speicherung, eindeutige Besitzerzuordnung und Duplikatvermeidung.
- Dienstplanimport-Recovery: verständliche Bild-/OCR-Fehler, keine Provider-Interna in der UI und erneute Auswahl derselben Datei nach einem fehlgeschlagenen Lauf.
- Dienstplan-Dateigrenzen: ausschließlich JPEG/PNG/PDF, maximal vier Dateien und maximal 35 MB; nicht unterstützte Formate werden vor dem PDF-/OCR-Start abgewiesen.
- Die OCR-Domäne wiederholt diese Dateiprüfung unabhängig von der UI, sodass ein direkter Worker-Aufruf keine nicht unterstützten Dateien laden kann.
- Dienstplan-PDFs: Textebene zuerst, automatische Ausrichtung seitlicher Scans, Rendering/OCR als Fallback für bildbasierte oder nicht sicher zuordenbare Seiten, echte Seitenumbrüche und vollständige mehrseitige Verarbeitung; unbekannte Werte bleiben prüfpflichtig.
- Die Importvorschau und der Speicherdienst prüfen gemeinsam Monat, echten Kalendertag, Namen und ein anrechenbares Dienstkürzel; ungültige Februar-Tage und `O`/andere Statuswerte werden nicht projiziert.
- Dienstplanung: Monatsstunden pro stabiler Besitzer-ID, OZ-Stunden getrennt, ganztägige Statuswerte sowie Konflikthinweise für zeitliche Überschneidungen mit ganztägigen, mehrtägigen und über Mitternacht laufenden Familienterminen.
- Schichtserien und Vorlagen: Wochentagsexpansion mit stabiler `ownerId`, Duplikatvermeidung, Nachtdienst-/Statuswerte, lokale Vorlagenvalidierung und sicherer Speicher-Roundtrip.
- Soll-/Ist-Stunden: optionale lokale Monatsziele, Dezimalkomma-Normalisierung, Grenzwerte, Speicher-Roundtrip und Differenzberechnung.
- ICS-Domänenvertrag: Export/Import von ganztägigen, mehrtägigen, wiederkehrenden und über Mitternacht laufenden Einträgen sowie Escaping und erledigte Aufgaben.
- JSON-Sicherung: Envelope-/Feldvalidierung, ungültige Daten, ID-/Inhaltsduplikate, Konflikte und bestätigter UI-Import mit synthetischer Datei.
- Externe read-only-Kalenderquellen: stabile Quellen-/UID-Metadaten, exakte Duplikate, gleichzeitige Konflikte, owner-scoped Persistenz und fehlende Bearbeiten-/Löschen-/Verschieben-Aktionen im UI.
- ICS-Quellen pro Kalenderperson: synthetische Zuordnung zu gemeinsamem Kalender oder Mitglied, getrennte Quellenidentität und read-only-Metadaten.
- Feiertage: bundesweite und regionale deutsche Feiertage, bewegliche Feiertage, Bundesland-Speicher-Roundtrip, sächsischer Buß- und Bettag sowie read-only-Quellenmetadaten.
- Darstellung: Standard-/Wandmodus-Speicher-Roundtrip, sichere Rückkehr, deaktivierte Änderungsziele im Wandmodus und Desktop-Überlaufprüfung.
- Aufgaben-Domänenvertrag: wiederkehrende Vorkommen, unabhängige `completedDates`, Legacy-Einzelaufgaben und Persistenz-/ICS-Roundtrip.
- Haushaltsroutinen: eigener Ereignistyp mit Personenzuweisung, wiederkehrenden Vorkommen, individuellem Erledigt-Status, Kalenderfilter und ICS-Roundtrip.
- PWA-Vertrag: Manifest, Standalone-Startkonfiguration, Icon und network-first Service-Worker-Fallback.
- Mitgliederverwaltung: stabile IDs beim Bearbeiten, synthetisches Anlegen von `adult`/`child`/`guest`, Farboptionen und sicherer Service-Roundtrip; Löschung wird bis zur Referenz-/Archivierungsentscheidung nicht getestet oder angeboten.
- Synchronisationsstatus: unbekannte Zustände fallen auf lokal zurück; Labels/Klassen für laufend, synchronisiert, offline und Fehler bleiben konsistent.
- Accessibility-/Recovery-Sichtprüfung: Skip-Link, Dialogsemantik, dynamische Fokus-Rückgabe nach Rendern, roving Kalendertage mit Pfeil-/Home-/End-Navigation, Fokus-Erhalt bei Ansichtswechsel/Monatsnavigation/Filtern, Dienstplan-Schnellerfassung und owner-only Haushalts-/Einladungsaktionen, integrierte Bestätigungen für Löschen/Import/Ersetzen in Kalender und Einstellungen, Einstiegsfokus im sichtbaren Datumsfeld, neutrale Haushalts-/Auth-Fehlermeldungen, Einstellungen-Öffnen bei Desktop und 390×844 sowie sichtbarer Offline-/Fehlerstatus. Die Tastaturabnahme der sechs Hauptansichten und der geprüften Dialoge ist abgeschlossen; die echte iPhone-Home-Screen-Installation bleibt ein separater Gerätecheck.
- Modale Tastaturführung: Vorwärts-/Rückwärts-Tab bleibt im aktiven Termin-, Verschiebe-, Schicht- oder Einstellungen-Dialog; Beschreibungen und `aria-busy` bleiben auch während asynchroner Bestätigungen erhalten; der 390×844-Check prüft zusätzlich `inert`-Hintergrund und horizontalen Überlauf.
- Laufzeitkonfiguration: Clientcode enthält keine fest verdrahtete Supabase-URL oder Publishable-Key-Werte; `.env.example` und GitHub-Pages-Variablen sind verdrahtet, und ein Browserlauf ohne Variablen bleibt sichtbar im lokalen Modus.
- Lokale Storage-Grenze: nur synthetische Kalenderereignisse mit stabiler ID, gültigem Typ, echtem Datum und gültigen Uhrzeiten werden gelesen oder geschrieben; beschädigte Payloads bleiben unangetastet und führen in den sichtbaren Recovery-Status.
- PWA-Installation: iOS-/iPadOS-Erkennung, installierter Standalone-Modus, Browser-Installationsprompt und manueller Browserhinweis werden als Domänenvertrag getestet; die Hauptansichten, Einstellungen und Termin-Dialoge wurden bei 390×844 ohne horizontalen Überlauf geprüft.
- Ladezeit-/Performance-Gate: dynamischer OCR-Import, Build-Asset-Budget für Roh-/gzip-Größen und CI-Ausführung von `npm run check:build`; echte Geräteprofile bleiben ein separater iPhone-/Produktionsschritt.

Die derzeitige Testsuite nutzt Node `node:test` für Domänenlogik und Serviceverträge. Es gibt keinen Browser-Automation-, Screenshot- oder Golden-Test-Runner in der aktuellen Abhängigkeit. Deshalb werden keine fragilen Bilddateien oder zusätzlichen UI-Test-Abhängigkeiten allein für diese Standardisierungsänderung eingeführt. Wenn ein konkreter UI-Fehler geändert wird, ergänze zuerst einen reproduzierbaren Regressionstest im vorhandenen Node-Teststil; bei Änderungen an Layout/Touch-Verhalten muss zusätzlich ein Browser-/iPhone-Viewport sichtbar geprüft und das Ergebnis im PR dokumentiert werden. Screenshots nur mit synthetischen Daten erstellen.

Der Dienstplanimport wird zusätzlich mit synthetischen Domain-/Parser-/Speichertests abgesichert. OCR-Bilddateien, PDF-Dienstpläne und echte Dienstplandaten gehören nicht in das Repository. Die Browserdarstellung der Importvorschau und Teamkachel ist manuell bei Desktop- und iPhone-Breite zu prüfen, bis eine Browser-Automation eingeführt ist.

## Abnahmeregeln

1. Gezielte Regressionstests für die geänderte Domänenlogik.
2. Vollständiges `npm test`.
3. `npm run build`.
4. GitHub Actions Qualitätsjob grün; Deploymentjob nur auf main.
5. Für UI-Änderungen: die betroffenen Ansichten/Interaktionen im relevanten iPhone-Viewport kontrollieren; Testmethode und Grenzen angeben.
6. Für Supabase-/RLS-Änderungen: Migrationen und Zugriffsmatrix gesondert prüfen. Eine grüne Frontend-CI bestätigt keine Datenbankrechte.

Der Supabase-Sicherheits-Preflight prüft owner-only-RLS-Migrationen, private Einladungstabellen, atomare Tokenannahme, den Edge-Auth-Grenzpfad und das Fehlen von Service-Role-/Secret-Material im Client. Er ist kein Ersatz für die noch offene Live-Matrix mit getrennten Konten.

`npm run check:source` prüft alle JavaScript-/MJS-Dateien des App-, Test-, Script- und PWA-Quellpfads mit Node.js `--check`; es ist ein Syntax-Gate und kein Ersatz für ein vollständiges ESLint-Gate.



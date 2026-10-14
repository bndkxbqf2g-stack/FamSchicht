# Tests und Qualitätssicherung

## Aktueller CI-Vertrag

`.github/workflows/pages.yml` führt für Pushes und Pull Requests gegen `main` mit Node.js 22 `npm install`, `npm test` und `npm run build` aus. Pages wird nur nach erfolgreicher Qualitätsprüfung aus Nicht-PR-Ereignissen veröffentlicht. Der Workflow prüft anschließend, ob die veröffentlichte URL das gebaute Vite-Bundle referenziert.

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
- iPhone/PWA-Verhalten bei Home-Screen-Login und Kalenderbedienung.
- Dienstplanimport: erkannte Codezeiten, häufige OCR-Verwechslungen (`FL/FI` → `F1`, `SI` → `S1`, `NS` → `N5`, `ZI` → `Z1`, aber `SL` bleibt Leitungsdienst), alternative OCR-Durchläufe, Nachtdienst-Überlappung über Mitternacht, Wunschfrei/Urlaub/Freizeitausgleich/SG-Ausschlüsse, lokale Speicherung, eindeutige Besitzerzuordnung und Duplikatvermeidung.
- Dienstplanung: Monatsstunden pro stabiler Besitzer-ID, OZ-Stunden getrennt, ganztägige Statuswerte sowie Konflikthinweise für zeitliche Überschneidungen mit ganztägigen, mehrtägigen und über Mitternacht laufenden Familienterminen.
- Schichtserien und Vorlagen: Wochentagsexpansion mit stabiler `ownerId`, Duplikatvermeidung, Nachtdienst-/Statuswerte, lokale Vorlagenvalidierung und sicherer Speicher-Roundtrip.
- Soll-/Ist-Stunden: optionale lokale Monatsziele, Dezimalkomma-Normalisierung, Grenzwerte, Speicher-Roundtrip und Differenzberechnung.
- ICS-Domänenvertrag: Export/Import von ganztägigen, mehrtägigen, wiederkehrenden und über Mitternacht laufenden Einträgen sowie Escaping und erledigte Aufgaben.
- Aufgaben-Domänenvertrag: wiederkehrende Vorkommen, unabhängige `completedDates`, Legacy-Einzelaufgaben und Persistenz-/ICS-Roundtrip.
- Haushaltsroutinen: eigener Ereignistyp mit Personenzuweisung, wiederkehrenden Vorkommen, individuellem Erledigt-Status, Kalenderfilter und ICS-Roundtrip.
- PWA-Vertrag: Manifest, Standalone-Startkonfiguration, Icon und network-first Service-Worker-Fallback.
- Mitgliederverwaltung: stabile IDs beim Bearbeiten, synthetisches Anlegen von `adult`/`child`/`guest`, Farboptionen und sicherer Service-Roundtrip; Löschung wird bis zur Referenz-/Archivierungsentscheidung nicht getestet oder angeboten.
- Synchronisationsstatus: unbekannte Zustände fallen auf lokal zurück; Labels/Klassen für laufend, synchronisiert, offline und Fehler bleiben konsistent.
- Accessibility-/Recovery-Sichtprüfung: Skip-Link, Dialogsemantik, Einstellungen-Öffnen bei Desktop und 390×844 sowie sichtbarer Offline-/Fehlerstatus; vollständige Tastaturabnahme aller Ansichten bleibt offen.

Die derzeitige Testsuite nutzt Node `node:test` für Domänenlogik und Serviceverträge. Es gibt keinen Browser-Automation-, Screenshot- oder Golden-Test-Runner in der aktuellen Abhängigkeit. Deshalb werden keine fragilen Bilddateien oder zusätzlichen UI-Test-Abhängigkeiten allein für diese Standardisierungsänderung eingeführt. Wenn ein konkreter UI-Fehler geändert wird, ergänze zuerst einen reproduzierbaren Regressionstest im vorhandenen Node-Teststil; bei Änderungen an Layout/Touch-Verhalten muss zusätzlich ein Browser-/iPhone-Viewport sichtbar geprüft und das Ergebnis im PR dokumentiert werden. Screenshots nur mit synthetischen Daten erstellen.

Der Dienstplanimport wird zusätzlich mit synthetischen Domain-/Parser-/Speichertests abgesichert. OCR-Bilddateien und echte Dienstplandaten gehören nicht in das Repository. Die Browserdarstellung der Importvorschau und Teamkachel ist manuell bei Desktop- und iPhone-Breite zu prüfen, bis eine Browser-Automation eingeführt ist.

## Abnahmeregeln

1. Gezielte Regressionstests für die geänderte Domänenlogik.
2. Vollständiges `npm test`.
3. `npm run build`.
4. GitHub Actions Qualitätsjob grün; Deploymentjob nur auf main.
5. Für UI-Änderungen: die betroffenen Ansichten/Interaktionen im relevanten iPhone-Viewport kontrollieren; Testmethode und Grenzen angeben.
6. Für Supabase-/RLS-Änderungen: Migrationen und Zugriffsmatrix gesondert prüfen. Eine grüne Frontend-CI bestätigt keine Datenbankrechte.

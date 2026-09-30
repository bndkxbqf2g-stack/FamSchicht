# Arbeitsregeln für Codex

## Verbindlicher Einstieg
1. Lies dieses Dokument sowie `README.md`, `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/DECISIONS.md` und `docs/DATABASE_STATUS.md`, soweit die Aufgabe sie berührt.
2. Prüfe den aktuellen Stand von `main`, offene Änderungen, den zuständigen GitHub Actions Lauf und die betroffenen Tests. GitHub ist die technische Wahrheit; ältere Chatverläufe und lokale Annahmen sind Hinweise, keine Quelle für den aktuellen Code.
3. Verfolge Datenfluss, Berechtigungen und vorhandene Regressionen, bevor du änderst. Erhalte bestehende Anforderungen und dokumentiere Widersprüche, statt sie still aufzulösen.

## Änderungen und Sicherheit
- Arbeite in kleinen, überprüfbaren Schritten auf einem Branch. Ändere `main` nicht direkt. Schlage Änderungen als Pull Request vor; merge oder veröffentliche nicht ohne ausdrücklichen Auftrag.
- Ändere keine echten lokalen Nutzerdaten und verwende in Tests nur synthetische Kalenderdaten. Keine echten Familiennamen, Termine, Orte oder Zugangsdaten in Fixtures, Logs oder Screenshots.
- Niemals Service-Role-/Secret-Schlüssel in Client, Repository oder CI-Logs bringen. Der Publishable Key ist kein Secret, muss aber weiterhin über die vorgesehene Konfiguration eingebunden werden.
- Supabase RLS ist die Sicherheitsgrenze. UI-Filter ersetzen keine Policies. Der Live-Stand ist owner-only; Partner-/Coparent-Zugriff und Realtime sind nicht freigegeben. Ändere Schema, Grants, RLS oder Auth nur zusammen mit Migration, Zugriffsmatrix, getrennten Testkonten und Rollback-Plan.
- `household_members` beschreibt Kalenderpersonen, `memberships` authentifizierte Zugriffsrollen. Vermische die Modelle nicht.
- Bevorzuge kleine Module und Services. Datums-/Uhrzeitlogik muss Zeitzonen, Ganztag, mehrtägige Ereignisse, Wiederholungen und Nachtdienste erhalten.

## Arbeitsmodi
Die Kürzel gelten für das im Auftrag genannte Repository. Wenn mehrere Repositories genannt sind, bearbeite jedes ausdrücklich und getrennt.
- **A — Autopilot:** Erledige den vereinbarten Umfang selbstständig: Ursachen untersuchen, Implementierung, passende Regressionstests, Dokumentation und relevante CI. Behebe klare Folgefehler, bis die Checks grün sind oder eine echte externe Grenze erreicht ist. Keine unbeauftragte Ausweitung.
- **N — Normal:** Ein begrenzter Entwicklungsblock mit typischerweise bis zu fünf zusammenhängenden Arbeitsschritten; danach relevante Tests und CI ausführen und den nächsten sinnvollen Schritt berichten.
- **Q — Qualitätssicherung:** Prüfe eine Änderung oder einen benannten Bereich, führe passende Tests aus und behebe nur klar reproduzierbare Fehler samt Regressionstest. Keine neuen Features.
- **U — Update:** Nur Projekt-/CI-/Branch-Status feststellen und kurz mit Ampel berichten. Keine Änderungen, Tests mit Seiteneffekten oder Fehlerbehebung starten.

Ein Modus-Kürzel allein setzt den Umfang, aber keine riskante Datenbankmigration, Freigabe echter Nutzerdaten, Merge- oder Release-Aktion in Gang.

## Tests und Abschluss
- Vorhandene Tests: `npm test`; Build: `npm run build`. Details, Prioritäten und Grenzen stehen in [docs/TESTING.md](docs/TESTING.md).
- Bei Terminänderungen prüfe Identität statt Duplikat, Datum/Uhrzeit, Besitzer und Persistenz-Roundtrip. Für Schichten prüfe stabile `ownerId` und Alt-Daten mit `owner`.
- Bei Änderungen an Login, RLS oder Supabase-Datenfluss prüfe Fehler-/Abmelde-/Wiederholungsfälle und die Owner-only Zugriffsmatrix, ohne produktive Familienkonten zu verwenden.
- UI-Änderungen erst als fertig melden, wenn die betroffenen Ansichten und Interaktionen tatsächlich geprüft sind. Berichte getestete Viewports und verbleibende Grenzen; ein erfolgreicher Build beweist keine iPhone-Darstellung.
- Nach Änderungen relevante Tests und Build ausführen, CI des PR prüfen und Fehler selbst beheben. CI ist der Gate vor Merge.
- Aktualisiere die passende Spezifikation/Statusnotiz nur bei tatsächlich geänderter Produktwahrheit. Behaupte keinen abgeschlossenen Roadmap-Punkt ohne Test-/Codebeleg.
- Abschlussbericht: Änderungen, Tests/CI mit Ergebnis, PR-Link und bekannte Grenzen.

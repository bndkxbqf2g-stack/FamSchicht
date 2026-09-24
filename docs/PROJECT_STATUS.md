# PROJECT STATUS

Stand: 24.09.2026

## Ziel
FamSchicht ist ein Familien- und Schichtkalender für gemeinsame Kindertermine, Umgangszeiten und persönliche Schichtplanung.

## Aktueller Funktionsstand
- Vite-Web-App auf GitHub Pages.
- Lokaler Kalender mit Gesamt-, Familien- und Schichtansicht.
- Manuelle Termine und Schichten; Schichtzeiten werden vorbelegt.
- Umgangsrhythmus kann für 12 Monate erzeugt werden.
- Supabase Magic-Link-Anmeldung ist implementiert.
- Angemeldete Nutzer können einen privaten Haushalt anlegen bzw. den eigenen Haushalt laden.
- Supabase enthält households, memberships und calendar_events; RLS ist aktiviert.
- Kalenderdaten selbst werden weiterhin lokal gespeichert und noch nicht mit Supabase synchronisiert.

## Sicherheit
Keine echten sensiblen Familiendaten verwenden, bis Mehrbenutzerrechte und RLS mit getrennten Testkonten geprüft sind. Keine service_role-/Secret-Schlüssel im Browser oder Repository.

## Bekannte Lücken
- Repository-Schema und tatsächlich installierter Datenbankstand sind nicht vollständig synchron dokumentiert.
- Sichere Einladung für Partner/coparent fehlt.
- Kalender-Synchronisierung und Migration lokaler Einträge fehlen.
- Automatisierte Tests decken die zentrale Mehrbenutzer-/RLS-Logik noch nicht ausreichend ab.
- CI führt npm test und npm run build aus; ein separates statisches Analyze/Lint-Gate existiert noch nicht.
- README enthält veralteten Projektstatus.

## Nächster Schritt
Dokumentation konsolidieren und anschließend den tatsächlichen Supabase-Datenbankstand gegen das Repository-Schema abgleichen, bevor Synchronisierung implementiert wird.

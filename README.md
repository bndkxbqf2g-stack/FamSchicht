# FamSchicht

FamSchicht ist ein Familien- und Schichtkalender für gemeinsame Familientermine, Kindertermine, Umgangszeiten und persönliche Schichtplanung.

## Aktueller Stand

- Vite-Web-App mit GitHub-Pages-Deployment.
- Monats-, Wochen-, Tages- und Heute-Ansicht.
- Familien- und Schichttermine inklusive Wiederholungen und mehrtägigen Ereignissen.
- Schicht-Schnellerfassung für Früh-, Spät- und Nachtdienst.
- Zentrales Haushaltsmitglieder-Domänenmodell mit stabilen Mitglieder-IDs.
- Personenfilter und Schichtauswahl werden aus diesem Modell erzeugt.
- Neue Schichten speichern neben dem Anzeigenamen eine stabile `ownerId`; ältere Einträge mit nur `owner` bleiben lesbar.
- Supabase Magic-Link-Authentifizierung und owner-only Haushalt.
- Für angemeldete Owner werden `calendar_events` über Supabase geladen, angelegt, geändert und gelöscht.
- RLS und eingeschränkte Data-API-Grants schützen den aktuellen Live-Stand weiterhin owner-only.

## Noch nicht freigegeben

- Kein Mehrbenutzer-Einladungsfluss für Partner/coparent.
- Keine Erweiterung der Live-RLS auf mehrere Haushaltsmitglieder.
- Keine Realtime-Synchronisierung zwischen getrennten Konten.
- Keine Nutzung echter sensibler Familiendaten, bevor Mehrbenutzerrechte mit getrennten Testkonten geprüft sind.

## Entwicklung

```sh
npm install
npm test
npm run build
```

GitHub ist die technische Wahrheit. Vor Änderungen zuerst `docs/PROJECT_STATUS.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md` und `docs/DECISIONS.md` prüfen.

**Datenschutz:** Keine Supabase-Service-Role-/Secret-Schlüssel oder unnötige sensible Familieninformationen im Repository speichern.

# ARCHITECTURE

Stand: 25.09.2026

## Client
Vite-basierte JavaScript-Web-App.

- src/main.js: Kalenderdarstellung und derzeitige UI-Orchestrierung.
- src/storage.js: lokaler Gerätespeicher.
- src/dates.js: Datums- und Schichtzeitlogik.
- src/custody.js: Umgangsrhythmus.
- src/security.js: UI-Sichtbarkeits-/Escaping-Helfer.
- src/auth.js: Supabase-Client und Auth.
- src/auth-ui.js: Anmeldung/Abmeldung.
- src/household-ui.js: Haushalts-Setup.

## Backend
Supabase/PostgreSQL mit:
- households
- memberships
- household_members
- calendar_events
- Row Level Security

Rollen im Repository-Entwurf: owner, partner, coparent.
Ereignissichtbarkeit im Repository-Entwurf: all, home, self.

## Datenfluss heute
- Offline/Fallback: lokale Kalendereinträge + Bootstrap-Mitglieder -> Kalender-UI.
- Cloud-Owner: Auth/Haushalt -> Supabase; `household_members` liefert Personenfilter/Schichtzuordnung, `calendar_events` liefert Termine und Dienste.
- `household_members` beschreibt Kalender-Personen. Authentifizierte Zugriffsrollen bleiben getrennt in `memberships`.

## Zielarchitektur
UI -> klar abgegrenzte Kalender-/Haushaltsservices -> Supabase.
Lokaler Speicher darf später höchstens kontrollierter Cache/Migrationsquelle sein und nicht als konkurrierende Wahrheit neben Supabase bestehen.

## Architekturregeln
- Fachlogik von UI und Transport trennen.
- Kleine Module statt wachsender main.js.
- Datenlücken explizit behandeln.
- RLS ist die serverseitige Sicherheitsgrenze; UI-Prüfungen ersetzen sie nicht.
- Keine freien Membership-Schreibrechte aus dem Browser.

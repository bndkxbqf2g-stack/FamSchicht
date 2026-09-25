# Datenbankstatus (25.09.2026)

## Tatsächlich installierter Stand

Supabase-Projekt `FamSchicht` (`kryxhpklrugceiwlrofm`) ist ACTIVE_HEALTHY.

Installierte Migrationen:
- `20260923114047 famschicht_base_tables`
- `20260923114055 famschicht_owner_only_rls`
- `20260923115904 owner_household_api_grants`
- `20260925105820 harden_owner_only_api_grants`\n- `20260925150049 create_owner_household_members`

Tabellen:
- `households`
- `memberships`
- `calendar_events`

Alle drei Tabellen haben RLS aktiviert. Zum Prüfzeitpunkt enthalten sie noch keine Datensätze.

## Aktive Rechte

Die Data-API-Grants wurden am 25.09.2026 gehärtet:
- `anon`: keine direkten Tabellenrechte auf `households`, `memberships` oder `calendar_events`.
- `authenticated`: `households` SELECT/INSERT/UPDATE, `memberships` nur SELECT, `calendar_events` SELECT/INSERT/UPDATE/DELETE und `household_members` SELECT/INSERT/UPDATE/DELETE.
- RLS bleibt die zweite und entscheidende Zugriffsschicht.

Die aktuell installierten Policies sind bewusst Owner-only:
- Haushalt: Owner darf eigenen Haushalt lesen/anlegen/ändern.
- Memberships: Owner darf Mitgliedschaften seines Haushalts lesen; es gibt derzeit keinen Client-Schreibpfad.
- Kalenderereignisse: Ersteller muss zugleich Owner des zugehörigen Haushalts sein; nur dieser darf Ereignisse lesen/anlegen/ändern/löschen.\n- Haushaltsmitglieder im Kalender-Domänenmodell: ausschließlich der Haushalts-Owner darf `household_members` lesen/anlegen/ändern/löschen. Diese Datensätze sind ausdrücklich keine Auth-Memberships.

Damit ist die in `supabase/schema.sql` beschriebene spätere Mehrbenutzerlogik mit `owner`, `partner`, `coparent` und `all/home/self` **noch nicht installiert**. Das Repository-Schema ist derzeit Zielentwurf, nicht Abbild der Live-Datenbank.

## Advisor-Status

Security Advisor: keine RLS-Lücke gemeldet. Nach der Grant-Härtung bleibt nur der Warnhinweis zur deaktivierten Leaked-Password-Protection. Ein Warnhinweis betrifft deaktivierte Leaked-Password-Protection. Da die App aktuell Magic Links statt Passwort-Login verwendet, ist dies kein Blocker für das nächste Paket; der Hinweis bleibt dokumentiert.

Performance Advisor meldet fehlende reine FK-Indizes für `calendar_events.creator_id`, `calendar_events.household_id`, `households.owner_id` und `memberships.user_id`. Diese werden vor wachsendem Datenbestand bewertet/ergänzt. Der vorhandene zusammengesetzte Event-Index wird dabei berücksichtigt.

## Konsequenz

Die Live-Datenbank bleibt vorerst Owner-only. Wir installieren die weitergehende Mehrbenutzer-RLS nicht nebenbei. Owner-only Kalender- und Mitglieder-Synchronisierung sind vorbereitet. Als nächstes folgt der sichere Einladungs-/Rollenpfad als eigenes Paket; erst danach wird Mehrbenutzer-RLS erweitert.

Keine echten sensiblen Familiendaten eingeben, bevor die Mehrbenutzerrechte mit getrennten Testkonten geprüft sind.

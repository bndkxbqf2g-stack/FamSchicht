# Datenbankstatus (25.09.2026)

## Tatsächlich installierter Stand

Supabase-Projekt `FamSchicht` (`kryxhpklrugceiwlrofm`) ist ACTIVE_HEALTHY.

Installierte Migrationen:
- `20260923114047 famschicht_base_tables`
- `20260923114055 famschicht_owner_only_rls`
- `20260923115904 owner_household_api_grants`
- `20260925105820 harden_owner_only_api_grants`
- `20260925150049 create_owner_household_members`
- `20260925161217 add_foreign_key_indexes`
- `20260925161507 create_private_household_invitations`

Öffentliche Tabellen:
- `households`
- `memberships`
- `calendar_events`
- `household_members`

Alle vier öffentlichen Tabellen haben RLS aktiviert. Zum Prüfzeitpunkt enthalten sie keine Datensätze.

Zusätzlich existiert `private.household_invitations`. Diese Tabelle ist bewusst nicht Teil der Browser-Data-API: `anon` und `authenticated` besitzen weder USAGE auf dem Schema noch SELECT auf der Tabelle. Gespeichert werden nur Hash, Ziel-E-Mail, Rolle, Gültigkeit und Status; ein roher Einladungstoken gehört nicht in die Datenbank.

## Aktive Rechte

Die Data-API-Grants bleiben minimal:
- `anon`: keine direkten Tabellenrechte.
- `authenticated`: nur die für den owner-only Client benötigten Operationen auf den öffentlichen Tabellen.
- `memberships`: weiterhin kein Browser-Schreibpfad.

Die aktuell installierten Live-Policies sind bewusst Owner-only:
- `households`: nur der jeweilige Owner darf lesen/anlegen/ändern.
- `memberships`: nur der Haushalts-Owner darf Mitgliedschaften lesen.
- `calendar_events`: nur der Owner/Ersteller des zugehörigen Haushalts darf lesen/anlegen/ändern/löschen.
- `household_members`: ausschließlich der Haushalts-Owner darf lesen/anlegen/ändern/löschen.

Damit sind `partner` und `coparent` **noch nicht live freigeschaltet**. Die private Einladungstabelle bereitet nur den sicheren serverseitigen Annahmepfad vor.

## Advisor-Status

Security Advisor: keine RLS-/Tabellenlücke gemeldet. Verbleibend ist nur der Warnhinweis zur deaktivierten Leaked-Password-Protection. Da FamSchicht aktuell Magic Links statt Passwort-Login verwendet, bleibt dies dokumentiert, ist aber kein Blocker für den nächsten Einladungsbaustein.

Die zuvor gemeldeten vier ungeindexierten Fremdschlüssel sind behoben. Der Performance Advisor kennzeichnet die neu angelegten Indizes derzeit lediglich als noch unbenutzt; bei leerem Datenbestand ist das erwartbar und kein Anlass zur Entfernung.

## Konsequenz

Die Live-Datenbank bleibt owner-only. Der nächste Schritt ist die serverseitige Erzeugung und atomare Annahme von Einladungen mit getrennten Testkonten. Erst nach erfolgreicher Zugriffsmatrix werden Mehrbenutzer-RLS und anschließend Realtime erweitert.

Keine echten sensiblen Familiendaten eingeben, bevor die Mehrbenutzerrechte mit getrennten Testkonten geprüft sind.

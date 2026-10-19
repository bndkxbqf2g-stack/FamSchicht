# Datenbankstatus

## Live-Prüfung 19.10.2026 – Coparent-RLS und synthetische Rollenmatrix

- Supabase `FamSchicht` (`kryxhpklrugceiwlrofm`) meldet `ACTIVE_HEALTHY`.
- Live-Migrationen:
  - `20261019031859 enable_private_invitation_rls`
  - `20261019033509 enable_coparent_shared_calendar_rls`
  - `20261019033639 complete_owner_event_scope_for_coparent_writes`
  - `20261019034531 consolidate_calendar_event_rls`
- Anna erhält als Coparent nur gemeinsame Kalenderdaten und Aufgaben: SELECT/INSERT/UPDATE für `visibility <> 'self'` und `category not in ('shift','private')`. DELETE bleibt owner-only.
- Owner-Policies decken den vollständigen eigenen Haushalt ab, damit Coparent-Erstellungen im Owner-Kalender roundtrip-sicher erscheinen.
- `households`, `memberships`, `household_members` und private Einladungsdaten bleiben für Coparent/Partner/Fremdkonto nicht direkt lesbar; der Client erhält nur den eigenen Haushaltskontext über eine abgesicherte Funktion.
- Matrix-Ergebnis: Owner sieht alle vier Fixture-Events und anschließend den Coparent-Insert; Coparent sieht nur Shared-Event(s), kann bearbeiten/anlegen, scheitert bei self/private/shift und Identity-Wechsel; Partner/Fremdkonto sehen keine Events/Admindaten. Die gesamte Fixture-Transaktion wurde zurückgerollt.
- Vier synthetische Auth-Konten sind vorhanden; echte Familieninformationen wurden nicht verwendet.

## Vorherige Live-Prüfung 14.10.2026

- Die Supabase-Management-API meldet das Projekt `FamSchicht` als `INACTIVE`.
- Read-only-Abfragen auf Migrationen und Tabellen liefen wegen eines Verbindungs-Timeouts nicht durch; deshalb wurde keine Zugriffsmatrix gestartet.
- Security- und Performance-Advisors meldeten bei der Prüfung keine Lints.
- Die Edge Function `household-invitations` ist aktiv, verwendet `withSupabase({ auth: 'user' })` und bleibt bis zur Matrix-Prüfung ohne Mehrbenutzer-RLS-Freigabe.

## Historischer installierter Stand (25.09.2026)

Die folgenden Angaben stammen aus der letzten erfolgreichen Installationsprüfung. Sie sind kein Beleg dafür, dass das Projekt heute erreichbar ist.

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
- `authenticated`: nur die vorgesehenen SELECT/INSERT/UPDATE/DELETE-Operationen; Memberships und Kalenderpersonen bleiben ohne Browser-Schreibpfad.
- Private Einladungsdaten bleiben außerhalb der Browser-Data-API.

Policies:
- `households`, `memberships`, `household_members`: owner-only.
- `calendar_events`: eine konsolidierte Policy je Aktion; Owner voller eigener Haushalt, Coparent gemeinsamer Nicht-`self`-Kalender ohne Schichten/private Kategorien, Partner/Fremdkonto ohne Zugriff.
- Identity-Trigger verhindert Änderungen an `household_id` und `creator_id`.

## Advisor-Status

- Security Advisor: die beiden SECURITY-DEFINER-Funktionen für RLS-/Haushaltskontext sind absichtlich nur für `authenticated` ausführbar, verwenden `search_path = ''` und vollständig qualifizierte Tabellen. Zusätzlich besteht der bestehende Hinweis zur deaktivierten Leaked-Password-Protection.
- Performance Advisor: nur erwartbare Hinweise zu bislang unbenutzten Indizes; die Warnung zu mehrfach permissive Policies ist nach der Konsolidierung entfernt.
- Es wurden keine Service-Role- oder Secret-Schlüssel in Client/Repository gebracht.

## Konsequenz

Der live freigegebene Umfang ist bewusst kleiner als eine allgemeine Mehrbenutzerverwaltung: Anna arbeitet im gemeinsamen Kalender-/Aufgabenbereich; Rollen, Haushaltseinstellungen, Kalenderpersonen, Einladungen, Schichten und private/self-Daten bleiben geschützt. Partnerzugriff und Realtime brauchen eigene Folgeentscheidungen und Tests.

## Rollback-Plan für die private Einladungstabelle

- Vor der Live-Ausführung werden RLS-Status, Policies und `service_role`-Grants read-only aufgezeichnet.
- Wenn der serverseitige Einladungs-Smoke-Test fehlschlägt, wird ausschließlich diese Migration zurückgenommen: Policy entfernen und RLS für `private.household_invitations` deaktivieren. Die bestehenden Schema-/Tabellen-Grants bleiben auf `service_role` begrenzt.
- Danach werden Advisor, Grants und der Edge-Function-Pfad erneut geprüft. Der Rollback ist nur eine Notmaßnahme; er stellt den bekannten kritischen Advisor-Hinweis wieder her und erlaubt keine Mehrbenutzerfreigabe.

Keine echten sensiblen Familiendaten eingeben, bevor die Mehrbenutzerrechte mit getrennten Testkonten geprüft sind.





## Rollback-Plan für den Coparent-Kalenderumfang

- Bei einem Fehler wird zuerst die konsolidierte `calendar_events`-Policy auf den bekannten Owner-only-Stand zurückgeführt; danach werden die Coparent-Policies, der Identity-Trigger und die Kontext-/RLS-Helfer entfernt.
- Die private Einladungstabelle bleibt bei diesem Rollback unverändert service_role-only.
- Anschließend werden Policy-Snapshot, synthetische Matrix und Advisor erneut geprüft. Keine echten Familiendaten verwenden.

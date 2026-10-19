# Datenbankstatus

## Live-Prüfung 19.10.2026

- Das Supabase-Projekt `FamSchicht` (`kryxhpklrugceiwlrofm`) wurde erfolgreich reaktiviert und meldet `ACTIVE_HEALTHY`.
- Migrationen, Tabellen, Rechte und Advisors wurden nach der Reaktivierung ausschließlich read-only geprüft. Es wurden keine Testkonten, Schema-Migrationen oder Realtime-Schreibaktionen gestartet.
- Der veröffentlichte App-Stand bleibt bewusst owner-only; die getrennte Owner-/Partner-/Coparent-/Fremdkonto-Matrix ist noch nicht ausgeführt.
- `private.household_invitations` ist live weiterhin nicht RLS-geschützt. `anon` und `authenticated` haben weder Schema-Usage noch Tabellen-Select; `service_role` bleibt der einzige vorgesehene serverseitige Zugriff. Vor der Rollenmatrix muss eine explizite RLS-Policy für diese private Tabelle entschieden und geprüft werden.
- Die bestätigte Minimal-Policy ist als `20261019100000_enable_private_invitation_rls.sql` im Repository vorbereitet, aber noch nicht live angewendet. Die Live-Prüfung bleibt deshalb bis zum kontrollierten Smoke-Test unverändert.

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

Die Live-Datenbank bleibt owner-only. Die Policy-Entscheidung ist getroffen; der nächste sichere Schritt ist die kontrollierte Migration mit Smoke-Test und anschließend die Zugriffsmatrix mit getrennten synthetischen Testkonten. Erst nach erfolgreicher Zugriffsmatrix werden Mehrbenutzer-RLS und anschließend Realtime erweitert.

## Rollback-Plan für die private Einladungstabelle

- Vor der Live-Ausführung werden RLS-Status, Policies und `service_role`-Grants read-only aufgezeichnet.
- Wenn der serverseitige Einladungs-Smoke-Test fehlschlägt, wird ausschließlich diese Migration zurückgenommen: Policy entfernen und RLS für `private.household_invitations` deaktivieren. Die bestehenden Schema-/Tabellen-Grants bleiben auf `service_role` begrenzt.
- Danach werden Advisor, Grants und der Edge-Function-Pfad erneut geprüft. Der Rollback ist nur eine Notmaßnahme; er stellt den bekannten kritischen Advisor-Hinweis wieder her und erlaubt keine Mehrbenutzerfreigabe.

Keine echten sensiblen Familiendaten eingeben, bevor die Mehrbenutzerrechte mit getrennten Testkonten geprüft sind.




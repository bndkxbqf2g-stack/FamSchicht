# Datenbankstatus (23.09.2026)

Supabase-Projekt FamSchicht: Die Tabellen `households`, `memberships` und `calendar_events` wurden mit den Migrationen `famschicht_base_tables` und `famschicht_owner_only_rls` angelegt. Alle drei Tabellen haben RLS aktiviert; der Security Advisor meldete keine Hinweise.

**Wichtig:** Das bisherige `supabase/schema.sql` ist ein Entwurf für spätere Mehrbenutzer-Freigaben und wurde **nicht** installiert. Aktuell ist der Zugriff absichtlich auf den Besitzer beschränkt; es gibt noch keine Einladungen, keine automatische Eigentümer-Mitgliedschaft und keine Synchronisierung mit dem Browser. Keine echten Familiendaten eingeben, bevor die Mehrbenutzerrechte getestet sind.

Nächste Schritte: getrennte Benutzeranmeldung, sichere Mitgliedereinladung, rollenabhängige Ereignisrechte und RLS-Tests mit drei Testkonten; anschließend App-Anbindung.

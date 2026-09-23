# Supabase-Einrichtung (noch nicht live)

1. Neues Supabase-Projekt anlegen; SQL aus `supabase/schema.sql` im SQL Editor ausführen.
2. In Supabase Auth die E-Mail-Bestätigung aktivieren und die erlaubten Redirect-URLs auf die spätere App-Domain begrenzen.
3. Ausschließlich **Project URL** und **publishable/anon key** für den Browser verwenden. Niemals service_role oder Datenbankpasswort committen.
4. Die erste Anmeldung erstellt später einen Haushalt. Für Steffi und Anna müssen getrennte Konten und eine serverseitig validierte Einladung eingerichtet werden. Mitgliedschaften dürfen nicht über den Browser frei erstellt werden.
5. Mit drei Testkonten sowohl erlaubte als auch verbotene Zugriffe testen, bevor echte Kindertermine erfasst werden.

Status: Nur Datenbankschema und Sicherheitsregeln. Die aktuelle App bleibt lokal, bis Auth, Einladungen, Datenmigration und Synchronisierung vollständig implementiert und getestet sind. Die Rollen sind zunächst `owner`, `partner`, `coparent`; `all` ist für alle Haushaltsmitglieder sichtbar, `home` nur für Owner/Partner, `self` nur für den Ersteller. Der Besitzer darf Einträge seiner Mitglieder nicht automatisch lesen, wenn deren Sichtbarkeit `self` ist.

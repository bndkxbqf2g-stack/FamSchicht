# Supabase-Einrichtung (noch nicht live)

1. Neues Supabase-Projekt anlegen; SQL aus `supabase/schema.sql` im SQL Editor ausführen.
2. In Supabase Auth die E-Mail-Bestätigung aktivieren und die erlaubten Redirect-URLs auf die spätere App-Domain begrenzen.
3. Ausschließlich **Project URL** und **publishable/anon key** für den Browser verwenden. Niemals service_role oder Datenbankpasswort committen.
4. Für lokale Entwicklung `.env.example` nach `.env.local` kopieren und die beiden `VITE_`-Variablen mit den Projektwerten füllen. Ohne diese Variablen bleibt die App absichtlich im lokalen Modus und versucht keine Cloud-Verbindung.
5. Für GitHub Pages in den Repository-Settings unter **Settings → Secrets and variables → Actions → Variables** setzen: `FAMSCHICHT_SUPABASE_URL` und `FAMSCHICHT_SUPABASE_PUBLISHABLE_KEY`. Das sind Build-Variablen; der Publishable Key ist kein Secret, Service-Role- und Datenbankpasswörter dürfen dort nicht eingetragen werden.
6. Die erste Anmeldung erstellt später einen Haushalt. Für Steffi und Anna müssen getrennte Konten und eine serverseitig validierte Einladung eingerichtet werden. Mitgliedschaften dürfen nicht über den Browser frei erstellt werden.
7. Mit drei Testkonten sowohl erlaubte als auch verbotene Zugriffe testen, bevor echte Kindertermine erfasst werden.

Status: Nur Datenbankschema und Sicherheitsregeln. Die aktuelle App bleibt lokal, bis Auth, Einladungen, Datenmigration und Synchronisierung vollständig implementiert und getestet sind. Die Rollen sind zunächst `owner`, `partner`, `coparent`; `all` ist für alle Haushaltsmitglieder sichtbar, `home` nur für Owner/Partner, `self` nur für den Ersteller. Der Besitzer darf Einträge seiner Mitglieder nicht automatisch lesen, wenn deren Sichtbarkeit `self` ist.


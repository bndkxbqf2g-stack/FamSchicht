# PROJECT STATUS

Stand: 25.09.2026

## Ziel
FamSchicht ist ein Familien- und Schichtkalender für gemeinsame Kindertermine, Umgangszeiten und persönliche Schichtplanung.

## Aktueller Funktionsstand
- Vite-Web-App auf GitHub Pages.
- Monats-, Wochen-, Tages- und Heute-Ansicht.
- Familien- und Schichttermine, mehrtägige Ereignisse, Geburtstage und Wiederholungen.
- Schicht-Schnellerfassung mit Früh-/Spät-/Nachtdienst.
- Zentrales Haushaltsmitglieder-Domänenmodell mit stabilen IDs.
- Kalender-Personen werden owner-only in Supabase `household_members` persistiert und bleiben fachlich von Auth-`memberships` getrennt.
- Neue Schichten speichern serverseitig nur `ownerId`; Legacy-Namen bleiben ausschließlich als Migrationsfallback lesbar.
- Supabase Magic-Link-Anmeldung und owner-only Haushalts-/Kalendersynchronisierung sind implementiert.
- Öffentliche Tabellen sind RLS-geschützt; Browser-Grants bleiben minimal.
- Ein getesteter Einladungs-Domänenvertrag erlaubt nur `partner` und `coparent`, normalisiert E-Mail-Adressen und behandelt Einladungs-Tokens als opake Bearer-Geheimnisse.
- Live existiert `private.household_invitations` für gehashte, ablaufende, widerrufbare und einmalig annehmbare Einladungen. Browserrollen haben darauf keinen Schema-/Tabellenzugriff.
- Fehlende FK-Indizes wurden live ergänzt und im Repository gespiegelt.

## Sicherheit
Die Live-Rechte bleiben bewusst owner-only. Mehrbenutzerrechte werden erst nach serverseitigem Einladungs-/Annahmepfad und erfolgreicher Zugriffsmatrix mit getrennten Konten erweitert. Keine service_role-/Secret-Schlüssel im Browser oder Repository.

## Bekannte Lücken
- Serverseitige Erzeugung, Widerruf und atomare Annahme von Einladungen sind noch nicht implementiert.
- Mehrbenutzer-RLS für `partner`/`coparent` ist noch nicht aktiviert.
- Eine Zugriffsmatrix mit getrennten Owner-/Partner-/Coparent-/Fremdkonten fehlt noch.
- Realtime-Synchronisierung zwischen mehreren Konten fehlt.
- Ein separates statisches JS-Lint-Gate existiert noch nicht; CI führt Tests, Build, Deployment und Published-App-Verifikation aus.

## Nächster Schritt
Serverseitige Einladungsoperationen auf Basis von `private.household_invitations` implementieren und automatisiert prüfen. Danach mit getrennten Testkonten die Zugriffsmatrix ausführen. Live-RLS bleibt bis zu deren Erfolg owner-only.

## Update 25.09.2026 – Owner-only Mitglieder-Persistenz
- `household_members` ist als eigene Supabase-Tabelle installiert und durch owner-only RLS geschützt.
- Kalender-Personen bleiben fachlich getrennt von Auth-`memberships`.
- Angemeldete Owner laden ihre persistierten Mitglieder; bei leerer Tabelle werden Bootstrap-Mitglieder einmalig angelegt.

## Update 25.09.2026 – Stabile Schichtzuordnung
- Filter, Kalenderdarstellung und Heute-Ansicht verwenden bei Schichten vorrangig `ownerId`.
- Neue/aktualisierte Schichten schreiben bei vorhandener `ownerId` keinen redundanten Anzeigenamen mehr.
- Legacy-Schichten ohne `ownerId` bleiben lesbar.

## Update 25.09.2026 – Sicherer Einladungsunterbau
- `docs/INVITATION_FLOW.md` definiert den serverseitigen, E-Mail-gebundenen Einmal-Token-Ablauf.
- Der Client-Domänenvertrag lehnt unzulässige Rollen, ungültige E-Mails und offensichtlich fehlerhafte Tokens ab.
- `private.household_invitations` speichert nur SHA-256-kompatible 64-stellige Token-Hashes und Statusdaten.
- `anon` und `authenticated` besitzen weder Schema-USAGE noch Tabellen-SELECT auf dem privaten Einladungsspeicher.
- Partner-/Coparent-Rechte wurden ausdrücklich noch nicht erweitert.

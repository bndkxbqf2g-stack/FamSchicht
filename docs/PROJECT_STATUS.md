# PROJECT STATUS

## Update 29.09.2026 – Mobile Kalenderbedienung
- Dienste werden im Bereich „Dienste“ schnell erfasst und bestehende Schichten per Tipp mit Datum, Zeit, Diensttyp und Person bearbeitet.
- Bestehende Familien- und Schichttermine zeigen zuerst Datum und Uhrzeit; seltene Felder liegen unter „Weitere Optionen“.
- Monatskacheln zeigen kurze Dienstkürzel beziehungsweise „Papa“, während die Tagesliste volle Bezeichnungen bietet.
- Filter sind einklappbar, Umgangsrhythmus ist in Einstellungen, und das Querformat hat ein kompaktes eigenes Layout.
- Umgangsblöcke sind standardmäßig Freitag bis Sonntag, können aber über Start- und Enddatum frei verschoben werden. Live-Rechte/RLS bleiben unverändert owner-only.

Stand: 28.09.2026

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
- Die Einladungs-UI ist jetzt im separaten Einstellungen-Bereich integriert; Erzeugung und atomare Annahme laufen über den serverseitigen Edge-/RPC-Pfad. Widerruf ist als Dienst vorhanden, aber noch nicht in der UI angeboten.
- Mehrbenutzer-RLS für `partner`/`coparent` ist noch nicht aktiviert.
- Eine Zugriffsmatrix mit getrennten Owner-/Partner-/Coparent-/Fremdkonten fehlt noch.
- Realtime-Synchronisierung zwischen mehreren Konten fehlt.
- Ein separates statisches JS-Lint-Gate existiert noch nicht; CI führt Tests, Build, Deployment und Published-App-Verifikation aus.

## Nächster Schritt
Einladungsannahme und die UI-Regressionen mit getrennten Testkonten prüfen. Danach die Zugriffsmatrix ausführen und erst anschließend Mehrbenutzer-RLS aktivieren. Live-RLS bleibt bis zu deren Erfolg owner-only.

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


## Update 28.09.2026 – Übersicht und Kalender-UX
- Konto-/Haushaltseinrichtung ist strukturell vom Kalenderbereich getrennt.
- Kalenderoptik wurde an die bereitgestellte Referenz angelehnt: klare blaue Steuerung, sichtbares Tagesraster und kompakte mobile Darstellung.
- Terminarten unterstützen Allgemeiner Termin, Geburtstag, Schule, Sport, Arzt, Urlaub und Aufgabe mit eigener visueller Kennzeichnung.
- Personen- und Bereichsfilter werden auch in der Heute-Ansicht angewendet.
- Der mobile Termineditor ist ein einspaltiges, scrollbares Bottom-Sheet und bleibt oberhalb der mobilen Navigation bedienbar.
- Der Synchronisationsstatus ist auf mobilen Geräten sichtbar.

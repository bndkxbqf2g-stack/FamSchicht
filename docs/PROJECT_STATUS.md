# PROJECT STATUS

Stand: 25.09.2026

## Ziel
FamSchicht ist ein Familien- und Schichtkalender für gemeinsame Kindertermine, Umgangszeiten und persönliche Schichtplanung.

## Aktueller Funktionsstand
- Vite-Web-App auf GitHub Pages.
- Monats-, Wochen-, Tages- und Heute-Ansicht.
- Familien- und Schichttermine, mehrtägige Ereignisse, Geburtstage und Wiederholungen.
- Schicht-Schnellerfassung mit Früh-/Spät-/Nachtdienst.
- Zentrales Haushaltsmitglieder-Domänenmodell mit `id`, `name`, `type`, `colorKey` und `shiftEligible`.
- Bootstrap-Mitglieder Martin und Steffi dienen als lokaler Fallback und initiale Seed-Daten; im Cloud-Modus werden Mitglieder aus `household_members` geladen.
- Kalender-Personen werden owner-only in Supabase `household_members` persistiert und bleiben fachlich von Auth-`memberships` getrennt.
- Neue Schichten speichern eine stabile `ownerId`; Filter, Anzeige und Farbschlüssel bevorzugen diese ID. Legacy-Einträge mit reinem Namen bleiben als Migrationsfallback kompatibel.
- Supabase Magic-Link-Anmeldung ist implementiert.
- Angemeldete Owner können einen privaten Haushalt anlegen bzw. laden.
- Owner-Kalendereinträge werden über `calendar_events` aus Supabase geladen, erstellt, geändert und gelöscht.
- Haushalts-, Membership-, Kalender- und `household_members`-Tabellen sind mit RLS geschützt.
- Live-Data-API-Grants sind für `anon` entzogen und für `authenticated` auf die aktuell benötigten Operationen begrenzt.

## Sicherheit
Die Live-Rechte bleiben bewusst owner-only. Mehrbenutzerrechte werden erst nach sicherem Einladungsfluss und Zugriffstests mit getrennten Konten erweitert. Keine service_role-/Secret-Schlüssel im Browser oder Repository.

## Bekannte Lücken
- Sichere Einladung für Partner/coparent fehlt.
- Live-RLS ist noch nicht für Mehrbenutzerbetrieb erweitert.
- Realtime-Synchronisierung zwischen mehreren Konten fehlt.
- Ein separates statisches Analyze/Lint-Gate existiert noch nicht; CI führt Tests, Build, Deployment und Published-App-Verifikation aus.

## Nächster Schritt
Einen sicheren Einladungs-/Beitrittsfluss für `partner`/`coparent` als getrennten Auth-/Membership-Pfad entwerfen und testen. Live-RLS bleibt bis zur Zugriffsmatrix owner-only.

## Update 25.09.2026 – Owner-only Mitglieder-Persistenz
- `household_members` ist als eigene Supabase-Tabelle installiert und durch vier owner-only RLS-Policies geschützt.
- Kalender-Personen (`id`, Name, Typ, Farbe, Schichtfähigkeit) bleiben fachlich getrennt von Auth-`memberships`.
- Angemeldete Owner laden ihre persistierten Mitglieder; bei leerer Tabelle werden die bisherigen Bootstrap-Mitglieder einmalig per Upsert angelegt.
- Personenfilter und Schichtauswahl verwenden danach dieselbe geladene Mitgliederquelle; bei Offline-/Fehlerfall bleibt der lokale Bootstrap-Fallback erhalten.
- Partner-/Coparent-Zugriffe wurden nicht erweitert.

## Update 25.09.2026 – Stabile Schichtzuordnung in der Darstellung
- Personenfilter, Kalenderdarstellung und Heute-Ansicht verwenden bei Schichten vorrangig `ownerId`.
- Ein veralteter gespeicherter Anzeigename kann damit nicht mehr die Personenzuordnung oder Farbklasse einer Schicht überschreiben.
- Legacy-Schichten ohne `ownerId` bleiben über den bisherigen Namen lesbar.


## Update 25.09.2026 – Schicht-Persistenz auf stabile Mitglieder-ID konsolidiert
- Neue Schichten speichern in Supabase nur noch `ownerId`; ein parallel gespeicherter Anzeigename ist nicht mehr Teil neuer Schicht-Metadaten.
- Vorhandene Legacy-Schichten, die nur `owner` enthalten, bleiben weiterhin lesbar.
- Wird ein älterer Datensatz mit vorhandener `ownerId` erneut gespeichert, wird die redundante Namenskopie automatisch nicht mehr mitgeschrieben.
- Filter, Anzeige und Farbzuordnung nutzen bereits die stabile ID. Damit ist die Schichtzuordnung durchgängig ID-basiert.

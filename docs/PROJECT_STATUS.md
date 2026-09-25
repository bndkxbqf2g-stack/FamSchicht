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
- Neue Schichten speichern eine stabile `ownerId` zusätzlich zum Anzeigenamen; Legacy-Einträge mit reinem Namen bleiben kompatibel.
- Supabase Magic-Link-Anmeldung ist implementiert.
- Angemeldete Owner können einen privaten Haushalt anlegen bzw. laden.
- Owner-Kalendereinträge werden über `calendar_events` aus Supabase geladen, erstellt, geändert und gelöscht.
- Haushalts-, Membership-, Kalender- und `household_members`-Tabellen sind mit RLS geschützt.
- Live-Data-API-Grants sind für `anon` entzogen und für `authenticated` auf die aktuell benötigten Operationen begrenzt.

## Sicherheit
Die Live-Rechte bleiben bewusst owner-only. Mehrbenutzerrechte werden erst nach sicherem Einladungsfluss und Zugriffstests mit getrennten Konten erweitert. Keine service_role-/Secret-Schlüssel im Browser oder Repository.

## Bekannte Lücken
- Das zentrale Haushaltsmitglieder-Modell ist noch nicht als eigene persistierte Mitgliederquelle an Supabase angebunden.
- Sichere Einladung für Partner/coparent fehlt.
- Live-RLS ist noch nicht für Mehrbenutzerbetrieb erweitert.
- Realtime-Synchronisierung zwischen mehreren Konten fehlt.
- Ein separates statisches Analyze/Lint-Gate existiert noch nicht; CI führt Tests, Build, Deployment und Published-App-Verifikation aus.

## Nächster Schritt
Mitglieder-Persistenz vorbereiten, ohne Live-Mehrbenutzerrechte zu erweitern. Danach Einladungs-/Beitrittsfluss und getrennte RLS-Testmatrix entwerfen.
\n\n## Update 25.09.2026 – Owner-only Mitglieder-Persistenz\n- `household_members` ist als eigene Supabase-Tabelle installiert und durch vier owner-only RLS-Policies geschützt.\n- Kalender-Personen (`id`, Name, Typ, Farbe, Schichtfähigkeit) bleiben fachlich getrennt von Auth-`memberships`.\n- Angemeldete Owner laden ihre persistierten Mitglieder; bei leerer Tabelle werden die bisherigen Bootstrap-Mitglieder einmalig per Upsert angelegt.\n- Personenfilter und Schichtauswahl verwenden danach dieselbe geladene Mitgliederquelle; bei Offline-/Fehlerfall bleibt der lokale Bootstrap-Fallback erhalten.\n- Partner-/Coparent-Zugriffe wurden nicht erweitert.\n